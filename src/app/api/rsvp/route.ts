import { NextResponse } from "next/server";
import { setRsvp } from "@/lib/db";

export async function POST(req: Request) {
  const { token, rsvp } = await req.json().catch(() => ({}));
  if (typeof token !== "string" || (rsvp !== "hadir" && rsvp !== "tidak")) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const ok = await setRsvp(token, rsvp);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
