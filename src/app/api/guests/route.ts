import { NextResponse } from "next/server";
import { getRole } from "@/lib/auth";
import { addGuests, listGuests } from "@/lib/db";

export async function GET() {
  if ((await getRole()) !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await listGuests());
}

export async function POST(req: Request) {
  if ((await getRole()) !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const list = Array.isArray(body) ? body : [body];
  const items = list
    .filter((i) => i && typeof i.name === "string" && i.name.trim())
    .map((i) => ({
      name: String(i.name).slice(0, 120),
      phone: i.phone ? String(i.phone).slice(0, 30) : null,
      pax: Number(i.pax) || 1,
    }));
  if (!items.length) return NextResponse.json({ error: "Nama tamu kosong" }, { status: 400 });
  return NextResponse.json({ added: await addGuests(items) });
}
