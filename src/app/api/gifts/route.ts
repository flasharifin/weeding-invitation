import { NextResponse } from "next/server";
import { getRole } from "@/lib/auth";
import { listGifts, saveGift } from "@/lib/db";
import { weddingGift } from "@/lib/wedding-gift";

export async function GET() {
  if ((await getRole()) !== "admin") return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  try {
    return NextResponse.json(await listGifts(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Data hadiah belum dapat dimuat." }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  const { token, id, sender, kind, destination, amount, description } = body;
  if (typeof token !== "string" || !token || token.length > 200 || typeof id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ||
    typeof sender !== "string" || !sender.trim() || sender.trim().length > 120 ||
    (kind !== "money" && kind !== "parcel")) {
    return NextResponse.json({ error: "Mohon lengkapi nama dan jenis hadiah dengan benar." }, { status: 400 });
  }
  const account = weddingGift.accounts.find(a => a.id === destination);
  const target = kind === "money" ? (account ? `${account.provider} a.n. ${account.owner}` : null)
    : destination === "shipping" && weddingGift.shipping ? weddingGift.shipping.recipient : null;
  if (!target) return NextResponse.json({ error: "Tujuan hadiah tidak tersedia. Silakan muat ulang undangan." }, { status: 400 });
  if (kind === "money" ? typeof amount !== "number" || !Number.isSafeInteger(amount) || amount < 1 || amount > 999999999999
    : typeof description !== "string" || !description.trim() || description.trim().length > 250) {
    return NextResponse.json({ error: "Periksa nominal atau keterangan hadiah." }, { status: 400 });
  }
  try {
    const ok = await saveGift(token, { id, sender: sender.trim(), kind, destination: target,
      amount: kind === "money" ? amount : null, description: kind === "parcel" ? description.trim() : null });
    return NextResponse.json(ok ? { ok: true } : { error: "Tautan undangan tidak valid." }, { status: ok ? 200 : 404 });
  } catch {
    return NextResponse.json({ error: "Konfirmasi belum tersimpan. Silakan coba lagi." }, { status: 503 });
  }
}
