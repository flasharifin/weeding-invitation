import { NextResponse } from "next/server";
import { getRole } from "@/lib/auth";
import { checkIn } from "@/lib/db";

// QR berisi token saja, tapi terima juga URL penuh /i/<token> agar toleran.
function extractToken(raw: string) {
  const m = raw.match(/\/i\/([\w-]+)/);
  return (m ? m[1] : raw).trim();
}

export async function POST(req: Request) {
  const role = await getRole();
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { token } = await req.json().catch(() => ({}));
  if (typeof token !== "string" || !token || token.length > 300) {
    return NextResponse.json({ status: "invalid" });
  }
  const result = await checkIn(extractToken(token), role);
  return NextResponse.json(result);
}
