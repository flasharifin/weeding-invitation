import { NextResponse } from "next/server";
import { getRole } from "@/lib/auth";
import { deleteWish } from "@/lib/db";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if ((await getRole()) !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await deleteWish((await params).id);
  return NextResponse.json({ ok: true });
}
