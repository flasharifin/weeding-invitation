import { NextResponse } from "next/server";
import { getRole } from "@/lib/auth";
import { getGuestByToken, listWishes, saveWish } from "@/lib/db";

export async function POST(req: Request) {
  const { token, message } = await req.json().catch(() => ({}));
  const text = typeof message === "string" ? message.trim().slice(0, 300) : "";
  if (typeof token !== "string" || !text) {
    return NextResponse.json({ error: "Ucapan kosong" }, { status: 400 });
  }
  const ok = await saveWish(token, text);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}

// Daftar ucapan untuk polling. Hanya pemegang link undangan yang valid (atau admin) yang boleh membaca.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const isAdmin = (await getRole()) === "admin";
  if (!isAdmin && (!token || !(await getGuestByToken(token)))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(await listWishes(isAdmin ? 200 : 100), { headers: { "Cache-Control": "no-store" } });
}
