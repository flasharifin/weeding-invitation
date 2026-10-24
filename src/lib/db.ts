import { randomBytes, randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import postgres from "postgres";

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
