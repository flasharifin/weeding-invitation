import { randomBytes, randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import postgres from "postgres";
import { memoryObjectKey, uploadMemoryObject, deleteMemoryObject } from "@/lib/object-storage";

export type Guest = {
  id: string;
  name: string;
  phone: string | null;
  pax: number;
  token: string;
  rsvp: "hadir" | "tidak" | null;
  checkedInAt: string | null;
  checkedInBy: string | null;
  createdAt: string;
};

export type CheckinResult =
  | { status: "ok"; guest: Guest }
  | { status: "already"; guest: Guest }
  | { status: "invalid" };

export type NewGuest = { name: string; phone?: string | null; pax?: number };

export const newToken = () => randomBytes(12).toString("base64url");

// ---------- Postgres (production) ----------
const url = process.env.DATABASE_URL;
// Neon wajib SSL; prepare:false agar kompatibel dengan connection pooler Neon (-pooler / pgbouncer).
const isLocalDb = !!url && /@(localhost|127\.0\.0\.1)[:/]/.test(url);
const sql = url ? postgres(url, { max: 5, ssl: isLocalDb ? false : "require", prepare: false }) : null;
let ready: Promise<unknown> | null = null;

function init() {
  ready ??= sql!`
    CREATE TABLE IF NOT EXISTS guests (
      id text PRIMARY KEY,
      name text NOT NULL,
      phone text,
      pax int NOT NULL DEFAULT 1 CHECK (pax BETWEEN 1 AND 20),
      token text NOT NULL UNIQUE,
      rsvp text CHECK (rsvp IN ('hadir', 'tidak')),
      checked_in_at timestamptz,
      checked_in_by text,
      created_at timestamptz NOT NULL DEFAULT now()
    )`;
  return ready;
}

type Row = {
  id: string; name: string; phone: string | null; pax: number; token: string;
  rsvp: string | null; checked_in_at: Date | null; checked_in_by: string | null; created_at: Date;
};
const fromRow = (r: Row): Guest => ({
  id: r.id, name: r.name, phone: r.phone, pax: r.pax, token: r.token,
  rsvp: r.rsvp as Guest["rsvp"],
  checkedInAt: r.checked_in_at ? new Date(r.checked_in_at).toISOString() : null,
  checkedInBy: r.checked_in_by,
  createdAt: new Date(r.created_at).toISOString(),
});

// ---------- File JSON (hanya untuk development lokal) ----------
const FILE = path.join(process.cwd(), "data", "guests.json");

function readFile(): Guest[] {
  if (!fs.existsSync(FILE)) {
    const now = new Date().toISOString();
    const demo = ["Budi Santoso", "Siti Aminah", "Keluarga Bapak Hasan"].map((name, i) => ({
      id: randomUUID(), name, phone: null, pax: i === 2 ? 4 : 2,
      token: `demo-${i + 1}`, rsvp: null, checkedInAt: null, checkedInBy: null, createdAt: now,
    })) as Guest[];
    fs.writeFileSync(FILE, JSON.stringify(demo, null, 2));
    return demo;
  }
  return JSON.parse(fs.readFileSync(FILE, "utf8"));
}
const writeFile = (g: Guest[]) => fs.writeFileSync(FILE, JSON.stringify(g, null, 2));

function assertStorage() {
  if (!sql && process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL belum diset");
  }
}

// ---------- API ----------
export async function listGuests(): Promise<Guest[]> {
  assertStorage();
  if (!sql) return readFile().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  await init();
  return (await sql<Row[]>`SELECT * FROM guests ORDER BY created_at DESC`).map(fromRow);
}

export async function getGuestByToken(token: string): Promise<Guest | null> {
  assertStorage();
  if (!sql) return readFile().find((g) => g.token === token) ?? null;
  await init();
  const rows = await sql<Row[]>`SELECT * FROM guests WHERE token = ${token}`;
  return rows[0] ? fromRow(rows[0]) : null;
}

export async function addGuests(items: NewGuest[]): Promise<number> {
  assertStorage();
  const now = new Date().toISOString();
  const guests: Guest[] = items.map((i) => ({
    id: randomUUID(), name: i.name.trim(), phone: i.phone?.trim() || null,
    pax: Math.max(1, Math.min(20, Math.floor(i.pax ?? 1))), token: newToken(),
    rsvp: null, checkedInAt: null, checkedInBy: null, createdAt: now,
  }));
  if (!sql) {
    writeFile([...readFile(), ...guests]);
    return guests.length;
  }
  await init();
  for (const g of guests) {
    await sql`INSERT INTO guests (id, name, phone, pax, token) VALUES (${g.id}, ${g.name}, ${g.phone}, ${g.pax}, ${g.token})`;
  }
  return guests.length;
}

export async function deleteGuest(id: string) {
  assertStorage();
  if (!sql) {
    writeFile(readFile().filter((g) => g.id !== id));
    if (fs.existsSync(MEMORY_FILE)) fs.writeFileSync(MEMORY_FILE, JSON.stringify(readMemories().filter(m => m.guestId !== id)));
    if (fs.existsSync(GIFT_FILE)) fs.writeFileSync(GIFT_FILE, JSON.stringify(readGifts().map(g => g.guestId === id ? { ...g, guestId: null } : g), null, 2));
    return writeWishes(readWishes().filter((w) => w.guestId !== id));
  }
  await init();
  await initWishes();
  await sql`DELETE FROM wishes WHERE guest_id = ${id}`;
  await sql`DELETE FROM guests WHERE id = ${id}`;
}

export async function resetCheckin(id: string) {
  assertStorage();
  if (!sql) {
    return writeFile(readFile().map((g) => (g.id === id ? { ...g, checkedInAt: null, checkedInBy: null } : g)));
  }
  await init();
  await sql`UPDATE guests SET checked_in_at = NULL, checked_in_by = NULL WHERE id = ${id}`;
}

export async function setRsvp(token: string, rsvp: "hadir" | "tidak"): Promise<boolean> {
  assertStorage();
  if (!sql) {
    const all = readFile();
    const g = all.find((x) => x.token === token);
    if (!g) return false;
    g.rsvp = rsvp;
    writeFile(all);
    return true;
  }
  await init();
  const r = await sql`UPDATE guests SET rsvp = ${rsvp} WHERE token = ${token} RETURNING id`;
  return r.length > 0;
}

/** Check-in atomic: hanya satu pemanggil yang bisa mengubah NULL -> waktu. */
export async function checkIn(token: string, by: string): Promise<CheckinResult> {
  assertStorage();
  if (!sql) {
    // Node single-thread + fs sync: tidak ada interleaving antar request.
    const all = readFile();
    const g = all.find((x) => x.token === token);
    if (!g) return { status: "invalid" };
    if (g.checkedInAt) return { status: "already", guest: g };
    g.checkedInAt = new Date().toISOString();
    g.checkedInBy = by;
    writeFile(all);
    return { status: "ok", guest: g };
  }
  await init();
  const updated = await sql<Row[]>`
    UPDATE guests SET checked_in_at = now(), checked_in_by = ${by}
    WHERE token = ${token} AND checked_in_at IS NULL RETURNING *`;
  if (updated[0]) return { status: "ok", guest: fromRow(updated[0]) };
  const g = await getGuestByToken(token);
  return g ? { status: "already", guest: g } : { status: "invalid" };
}

// ---------- Buku ucapan ----------
export type Wish = { id: string; guestId: string; name: string; message: string; createdAt: string };

const WISH_FILE = path.join(process.cwd(), "data", "wishes.json");
const readWishes = (): Wish[] => (fs.existsSync(WISH_FILE) ? JSON.parse(fs.readFileSync(WISH_FILE, "utf8")) : []);
const writeWishes = (w: Wish[]) => fs.writeFileSync(WISH_FILE, JSON.stringify(w, null, 2));

let wishReady: Promise<unknown> | null = null;
function initWishes() {
  wishReady ??= init().then(
    () => sql!`
      CREATE TABLE IF NOT EXISTS wishes (
        id text PRIMARY KEY,
        guest_id text NOT NULL UNIQUE REFERENCES guests (id) ON DELETE CASCADE,
        name text NOT NULL,
        message text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
  );
  return wishReady;
}

type WishRow = { id: string; guest_id: string; name: string; message: string; created_at: Date };
const wishFromRow = (r: WishRow): Wish => ({
  id: r.id, guestId: r.guest_id, name: r.name, message: r.message,
  createdAt: new Date(r.created_at).toISOString(),
});

export async function listWishes(limit = 100): Promise<Wish[]> {
  assertStorage();
  if (!sql) return readWishes().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  await initWishes();
  return (await sql<WishRow[]>`SELECT * FROM wishes ORDER BY created_at DESC LIMIT ${limit}`).map(wishFromRow);
}

/** Satu ucapan per tamu; mengirim lagi akan menggantikan yang lama. Nama diambil dari data tamu, bukan dari input. */
export async function saveWish(token: string, message: string): Promise<boolean> {
  const guest = await getGuestByToken(token);
  if (!guest) return false;
  if (!sql) {
    const all = readWishes().filter((w) => w.guestId !== guest.id);
    all.push({ id: randomUUID(), guestId: guest.id, name: guest.name, message, createdAt: new Date().toISOString() });
    writeWishes(all);
    return true;
  }
  await initWishes();
  await sql`
    INSERT INTO wishes (id, guest_id, name, message) VALUES (${randomUUID()}, ${guest.id}, ${guest.name}, ${message})
    ON CONFLICT (guest_id) DO UPDATE SET message = EXCLUDED.message, created_at = now()`;
  return true;
}

export async function deleteWish(id: string) {
  assertStorage();
  if (!sql) return writeWishes(readWishes().filter((w) => w.id !== id));
  await initWishes();
  await sql`DELETE FROM wishes WHERE id = ${id}`;
}

// ---------- Konfirmasi Wedding Gift (privat, hanya admin) ----------
export type GiftConfirmation = {
  id: string; guestId: string | null; guestName: string; sender: string;
  kind: "money" | "parcel"; destination: string; amount: number | null;
  description: string | null; createdAt: string;
};
export type NewGiftConfirmation = Pick<GiftConfirmation, "id" | "sender" | "kind" | "destination" | "amount" | "description">;
const GIFT_FILE = path.join(process.cwd(), "data", "gifts.json");
const readGifts = (): GiftConfirmation[] => fs.existsSync(GIFT_FILE) ? JSON.parse(fs.readFileSync(GIFT_FILE, "utf8")) : [];
let giftReady: Promise<unknown> | null = null;
function initGifts() {
  giftReady ??= init().then(() => sql!`
    CREATE TABLE IF NOT EXISTS gift_confirmations (
      id text PRIMARY KEY,
      guest_id text REFERENCES guests(id) ON DELETE SET NULL,
      guest_name text NOT NULL,
      sender text NOT NULL CHECK (char_length(sender) BETWEEN 1 AND 120),
      kind text NOT NULL CHECK (kind IN ('money', 'parcel')),
      destination text NOT NULL,
      amount bigint,
      description text,
      created_at timestamptz NOT NULL DEFAULT now(),
      CHECK ((kind = 'money' AND amount IS NOT NULL AND amount BETWEEN 1 AND 999999999999 AND description IS NULL)
        OR (kind = 'parcel' AND amount IS NULL AND char_length(description) BETWEEN 1 AND 250 AND description IS NOT NULL))
    )`);
  return giftReady;
}

export async function saveGift(token: string, input: NewGiftConfirmation): Promise<boolean> {
  const guest = await getGuestByToken(token);
  if (!guest) return false;
  if (!sql) {
    const all = readGifts();
    const existing = all.find(g => g.id === input.id);
    if (existing) return existing.guestId === guest.id;
    all.push({ ...input, guestId: guest.id, guestName: guest.name, createdAt: new Date().toISOString() });
    fs.mkdirSync(path.dirname(GIFT_FILE), { recursive: true });
    fs.writeFileSync(GIFT_FILE, JSON.stringify(all, null, 2));
    return true;
  }
  await initGifts();
  const rows = await sql`
    INSERT INTO gift_confirmations (id, guest_id, guest_name, sender, kind, destination, amount, description)
    VALUES (${input.id}, ${guest.id}, ${guest.name}, ${input.sender}, ${input.kind}, ${input.destination}, ${input.amount}, ${input.description})
    ON CONFLICT (id) DO NOTHING RETURNING id`;
  if (rows.length) return true;
  const existing = await sql`SELECT id FROM gift_confirmations WHERE id = ${input.id} AND guest_id = ${guest.id}`;
  return existing.length > 0;
}

export async function listGifts(): Promise<GiftConfirmation[]> {
  assertStorage();
  if (!sql) return readGifts().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  await initGifts();
  const rows = await sql`SELECT * FROM gift_confirmations ORDER BY created_at DESC, id DESC`;
  return rows.map(r => ({ id: r.id, guestId: r.guest_id, guestName: r.guest_name, sender: r.sender,
    kind: r.kind, destination: r.destination, amount: r.amount === null ? null : Number(r.amount),
    description: r.description, createdAt: new Date(r.created_at).toISOString() }));
}

// ---------- Sharing Memories ----------
// New images live in S3. The nullable legacy image column supports older uploads.
const MEMORY_FILE = path.join(process.cwd(), "data", "memories.json");
type StoredMemory = import("./memories").MemoryPhoto & { image?: string; objectKey?: string };
const readMemories = (): StoredMemory[] => fs.existsSync(MEMORY_FILE) ? JSON.parse(fs.readFileSync(MEMORY_FILE, "utf8")) : [];
function writeMemories(items: StoredMemory[]) {
  fs.mkdirSync(path.dirname(MEMORY_FILE), { recursive: true });
  fs.writeFileSync(`${MEMORY_FILE}.tmp`, JSON.stringify(items));
  fs.renameSync(`${MEMORY_FILE}.tmp`, MEMORY_FILE);
}
let memoryReady: Promise<unknown> | null = null;
function initMemories() {
  memoryReady ??= init().then(async () => {
    await sql!`CREATE TABLE IF NOT EXISTS memory_photos (
      id text PRIMARY KEY,
      guest_id text NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
      slot smallint NOT NULL CHECK (slot BETWEEN 1 AND 10),
      image bytea CHECK (octet_length(image) BETWEEN 1 AND 1048576),
      object_key text,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (guest_id, slot)
    )`;
    await sql!`ALTER TABLE memory_photos ADD COLUMN IF NOT EXISTS object_key text`;
    await sql!`ALTER TABLE memory_photos ALTER COLUMN image DROP NOT NULL`;
  });
  return memoryReady;
}

export async function listMemories(guestId: string): Promise<import("./memories").MemoryPhoto[]> {
  assertStorage();
  if (!sql) return readMemories().filter(m => m.guestId === guestId).map(({ image: _image, objectKey: _key, ...m }) => m);
  await initMemories();
  const rows = await sql`SELECT id, guest_id, slot, created_at FROM memory_photos WHERE guest_id = ${guestId} ORDER BY slot`;
  return rows.map(r => ({ id: r.id, guestId: r.guest_id, slot: r.slot, createdAt: new Date(r.created_at).toISOString() }));
}

// Local JSON writes must also be serialized now that they await an S3 request.
let localMemoryQueue: Promise<unknown> = Promise.resolve();
async function localMemoryLock<T>(task: () => Promise<T>): Promise<T> {
  const next = localMemoryQueue.then(task);
  localMemoryQueue = next.catch(() => {});
  return next;
}

async function cleanupUnreferencedMemory(id: string, key: string) {
  try {
    // A commit may have succeeded even if its acknowledgement was lost.
    const current = await getMemory(id);
    if (current?.objectKey !== key) await deleteMemoryObject(key);
  } catch { console.error("Memory cleanup pending; verify unreferenced objects before removal."); }
}

export async function saveMemory(guestId: string, id: string, image: Buffer): Promise<"saved" | "full" | "invalid"> {
  assertStorage();
  if (!image.length || image.length > 1048576) return "invalid";
  if (!sql) return localMemoryLock(async () => {
    const guest = readFile().find(g => g.id === guestId);
    if (!guest) return "invalid";
    const all = readMemories();
    const previous = all.find(m => m.id === id);
    if (previous) return previous.guestId === guestId ? "saved" : "invalid";
    const used = all.filter(m => m.guestId === guestId);
    if (used.length >= 10) return "full";
    const key = memoryObjectKey(guest.name, guest.id, id);
    try {
      await uploadMemoryObject(key, image);
      if (!readFile().some(g => g.id === guestId)) {
        await deleteMemoryObject(key);
        return "invalid";
      }
      const fresh = readMemories();
      fresh.push({ id, guestId, slot: used.length + 1, objectKey: key, createdAt: new Date().toISOString() });
      writeMemories(fresh);
      return "saved";
    } catch (error) { await cleanupUnreferencedMemory(id, key); throw error; }
  });
  await initMemories();
  let key: string | undefined;
  try {
    return await sql.begin(async tx => {
      // Keep this guest locked until the upload and metadata commit complete.
      const guest = await tx`SELECT id, name FROM guests WHERE id = ${guestId} FOR UPDATE`;
      if (!guest.length) return "invalid" as const;
      const existing = await tx`SELECT guest_id FROM memory_photos WHERE id = ${id}`;
      if (existing.length) return existing[0].guest_id === guestId ? "saved" as const : "invalid" as const;
      const [{ count }] = await tx`SELECT count(*)::int AS count FROM memory_photos WHERE guest_id = ${guestId}`;
      if (count >= 10) return "full" as const;
      key = memoryObjectKey(guest[0].name, guestId, id);
      await uploadMemoryObject(key, image);
      await tx`INSERT INTO memory_photos (id, guest_id, slot, object_key) VALUES (${id}, ${guestId}, ${count + 1}, ${key})`;
      return "saved" as const;
    });
  } catch (error) { if (key) await cleanupUnreferencedMemory(id, key); throw error; }
}

export async function getMemory(id: string): Promise<{ guestId: string; image: Buffer | null; objectKey: string | null } | null> {
  assertStorage();
  if (!sql) {
    const item = readMemories().find(m => m.id === id);
    return item ? { guestId: item.guestId, image: item.image ? Buffer.from(item.image, "base64") : null, objectKey: item.objectKey || null } : null;
  }
  await initMemories();
  const rows = await sql`SELECT guest_id, image, object_key FROM memory_photos WHERE id = ${id}`;
  return rows[0] ? { guestId: rows[0].guest_id, image: rows[0].image, objectKey: rows[0].object_key } : null;
}

/** Explicit migration: verify each object before removing its old database bytes. */
export async function migrateLegacyMemories() {
  assertStorage();
  let migrated = 0;
  if (!sql) return localMemoryLock(async () => {
    for (const item of readMemories().filter(m => m.image && !m.objectKey)) {
      const guest = readFile().find(g => g.id === item.guestId);
      if (!guest || !item.image) continue;
      const key = memoryObjectKey(guest.name, guest.id, item.id);
      try {
        await uploadMemoryObject(key, Buffer.from(item.image, "base64"));
        const fresh = readMemories();
        const index = fresh.findIndex(m => m.id === item.id);
        if (index === -1) { await deleteMemoryObject(key); continue; }
        const { image: _image, ...record } = fresh[index];
        fresh[index] = { ...record, objectKey: key };
        writeMemories(fresh);
        migrated++;
      } catch (error) { await cleanupUnreferencedMemory(item.id, key); throw error; }
    }
    return migrated;
  });
  await initMemories();
  const legacy = await sql`SELECT id, guest_id FROM memory_photos WHERE image IS NOT NULL AND object_key IS NULL`;
  for (const item of legacy) {
    let key: string | undefined;
    try {
      const changed = await sql.begin(async tx => {
        const guest = await tx`SELECT id, name FROM guests WHERE id = ${item.guest_id} FOR UPDATE`;
        if (!guest.length) return false;
        const rows = await tx`SELECT image FROM memory_photos WHERE id = ${item.id} AND object_key IS NULL`;
        if (!rows[0]?.image) return false;
        key = memoryObjectKey(guest[0].name, item.guest_id, item.id);
        await uploadMemoryObject(key, rows[0].image);
        await tx`UPDATE memory_photos SET object_key = ${key}, image = NULL WHERE id = ${item.id}`;
        return true;
      });
      if (changed) migrated++;
    } catch (error) { if (key) await cleanupUnreferencedMemory(item.id, key); throw error; }
  }
  return migrated;
}

export async function closeDatabase() { await sql?.end(); }
