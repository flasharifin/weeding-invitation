import { NextResponse } from "next/server";
import { checkPassword, createSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({}));
  const role = typeof password === "string" ? checkPassword(password) : null;
  if (!role) {
    await new Promise((r) => setTimeout(r, 800)); // perlambat brute force
    return NextResponse.json({ error: "Password salah" }, { status: 401 });
  }
  await createSession(role);
  return NextResponse.json({ role });
}
