// Membuat tabel di Postgres (Neon) dan, opsional, memindahkan data lokal.
//
//   npm run db:migrate                 -> buat/perbarui tabel dari db/schema.sql
//   npm run db:migrate -- --import     -> + impor data/guests.json, data/wishes.json & data/gifts.json (tanpa menimpa data yang sudah ada)
//
// DATABASE_URL dibaca dari environment atau .env.local.
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL belum diset. Isi di .env.local, contoh:\n  DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require");
  process.exit(1);
}

const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
const sql = postgres(url, { max: 1, ssl: local ? false : "require", prepare: false, onnotice: () => {} });
const root = process.cwd();

try {
  // 1) skema
  const schema = fs.readFileSync(path.join(root, "db", "schema.sql"), "utf8")
    .split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
  for (const stmt of schema.split(";").map((s) => s.trim()).filter(Boolean)) {
    await sql.unsafe(stmt);
  }
  console.log("✓ Skema siap (tabel guests, wishes, gift_confirmations, memory_photos)");

  // 2) impor data lokal (opsional)
  if (process.argv.includes("--import")) {
    const read = (f) => {
      const p = path.join(root, "data", f);
      return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : [];
    };
    const guests = read("guests.json");
    const wishes = read("wishes.json");
    const gifts = read("gifts.json");
    const memories = read("memories.json");
    let g = 0, w = 0, giftsAdded = 0, memoriesAdded = 0;
    await sql.begin(async (tx) => {
      for (const x of guests) {
        const r = await tx`
          INSERT INTO guests (id, name, phone, pax, token, rsvp, checked_in_at, checked_in_by, created_at)
          VALUES (${x.id}, ${x.name}, ${x.phone}, ${x.pax}, ${x.token}, ${x.rsvp}, ${x.checkedInAt}, ${x.checkedInBy}, ${x.createdAt})
          ON CONFLICT DO NOTHING RETURNING id`;
        g += r.length;
      }
      for (const x of wishes) {
        const r = await tx`
          INSERT INTO wishes (id, guest_id, name, message, created_at)
          VALUES (${x.id}, ${x.guestId}, ${x.name}, ${x.message}, ${x.createdAt})
          ON CONFLICT DO NOTHING RETURNING id`;
        w += r.length;
      }
      for (const x of gifts) {
        const r = await tx`
          INSERT INTO gift_confirmations (id, guest_id, guest_name, sender, kind, destination, amount, description, created_at)
          VALUES (${x.id}, ${x.guestId}, ${x.guestName}, ${x.sender}, ${x.kind}, ${x.destination}, ${x.amount}, ${x.description}, ${x.createdAt})
          ON CONFLICT DO NOTHING RETURNING id`;
        giftsAdded += r.length;
      }
      for (const x of memories) {
        const r = await tx`
          INSERT INTO memory_photos (id, guest_id, slot, image, object_key, created_at)
          VALUES (${x.id}, ${x.guestId}, ${x.slot}, ${x.image ? Buffer.from(x.image, "base64") : null}, ${x.objectKey || null}, ${x.createdAt})
          ON CONFLICT DO NOTHING RETURNING id`;
        memoriesAdded += r.length;
      }
    });
    console.log(`✓ Impor: ${g}/${guests.length} tamu, ${w}/${wishes.length} ucapan, ${giftsAdded}/${gifts.length} hadiah, ${memoriesAdded}/${memories.length} foto (sisanya sudah ada, dilewati)`);
  }

  const [{ guests: ng }] = await sql`SELECT count(*)::int AS guests FROM guests`;
  const [{ wishes: nw }] = await sql`SELECT count(*)::int AS wishes FROM wishes`;
  console.log(`Isi database sekarang: ${ng} tamu, ${nw} ucapan`);
} catch (e) {
  console.error("✗ Migrasi gagal:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
