import { NextResponse } from "next/server";
import { getRole } from "@/lib/auth";
import { deleteGuest, resetCheckin } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_: Request, { params }: Ctx) {
  if ((await getRole()) !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await deleteGuest((await params).id);
  return NextResponse.json({ ok: true });
}

// Reset status check-in (mis. salah scan)
export async function PATCH(_: Request, { params }: Ctx) {
  if ((await getRole()) !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await resetCheckin((await params).id);
  return NextResponse.json({ ok: true });
}
