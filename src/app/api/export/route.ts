import { getRole } from "@/lib/auth";
import { listGuests, listWishes } from "@/lib/db";
import { toCsv } from "@/lib/csv";
import { fmtDateTime } from "@/lib/format";

// /api/export?type=guests | wishes  (khusus admin)
export async function GET(req: Request) {
  if ((await getRole()) !== "admin") return new Response("Unauthorized", { status: 401 });
  const url = new URL(req.url);
  const type = url.searchParams.get("type") === "wishes" ? "wishes" : "guests";
  const stamp = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" }); // YYYY-MM-DD (WIB)

  let body: string;
  if (type === "wishes") {
    const wishes = await listWishes(10000);
    body = toCsv(["Nama", "Ucapan", "Waktu"], wishes.map((w) => [w.name, w.message, fmtDateTime(w.createdAt)]));
  } else {
    const guests = await listGuests();
    body = toCsv(
      ["Nama", "Telepon", "Jumlah Orang", "Link Undangan", "RSVP", "Status Kehadiran", "Waktu Check-in", "Petugas"],
      guests.map((g) => [
        g.name, g.phone, g.pax, `${url.origin}/i/${g.token}`, g.rsvp ?? "",
        g.checkedInAt ? "Hadir" : "Belum", g.checkedInAt ? fmtDateTime(g.checkedInAt) : "", g.checkedInBy ?? "",
      ]),
    );
  }

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type === "wishes" ? "ucapan" : "tamu"}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
