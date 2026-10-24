import { NextResponse } from "next/server";
import sharp from "sharp";
import { StorageConfigurationError, storageConfig } from "@/lib/object-storage";
import { getGuestByToken, listMemories, saveMemory } from "@/lib/db";
import { MEMORY_LIMIT, MEMORY_MAX_BYTES } from "@/lib/memories";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
const error = (message: string, status: number) => NextResponse.json({ error: message }, { status, headers });

// Log the real cause to the server (Vercel) log so storage failures are diagnosable.
// S3 error name/message/status describe the problem and hold no secrets; the request
// body, credentials and signed URLs are never logged, and the guest only sees a generic message.
function logCause(scope: string, cause: unknown) {
  const e = cause as { name?: string; message?: string; $metadata?: { httpStatusCode?: number } };
  console.error(`[${scope}]`, e?.name || "Error", e?.$metadata?.httpStatusCode ?? "", "-", e?.message || cause);
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!token || token.length > 200) return error("Tautan undangan tidak valid.", 401);
  try {
    const guest = await getGuestByToken(token);
    if (!guest) return error("Tautan undangan tidak valid.", 401);
    return NextResponse.json({ photos: await listMemories(guest.id), limit: MEMORY_LIMIT }, { headers });
  } catch (cause) { logCause("memories.GET", cause); return error("Foto belum dapat dimuat. Silakan coba lagi.", 503); }
}

export async function POST(req: Request) {
  const token = req.headers.get("x-invitation-token") || "";
  const id = req.headers.get("x-upload-id") || "";
  if (!token || token.length > 200 || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return error("Data upload tidak valid.", 400);
  if (!["image/jpeg", "image/png", "image/webp"].includes(req.headers.get("content-type") || "")) return error("Gunakan foto JPG, PNG, atau WebP.", 415);
  if (Number(req.headers.get("content-length")) > MEMORY_MAX_BYTES) return error("Foto terlalu besar. Maksimal 1 MB setelah kompresi.", 413);
  try {
    const guest = await getGuestByToken(token);
    if (!guest) return error("Tautan undangan tidak valid.", 401);
    storageConfig();
    const reader = req.body?.getReader();
    if (!reader) return error("Pilih foto terlebih dahulu.", 400);
    const chunks: Buffer[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MEMORY_MAX_BYTES) { await reader.cancel(); return error("Foto terlalu besar.", 413); }
      chunks.push(Buffer.from(value));
    }
    let image: Buffer;
    try {
      const pipeline = sharp(Buffer.concat(chunks), { limitInputPixels: 25000000, animated: false });
      const metadata = await pipeline.metadata();
      if (!["jpeg", "png", "webp"].includes(metadata.format || "") || (metadata.pages || 1) !== 1) return error("Gunakan foto JPG, PNG, atau WebP yang tidak bergerak.", 415);
      image = await pipeline.autoOrient().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ quality: 78 }).toBuffer();
      if (image.length > MEMORY_MAX_BYTES) return error("Foto masih terlalu besar. Pilih resolusi lebih kecil.", 413);
    } catch { return error("File tidak dapat dibaca sebagai foto. Pilih JPG, PNG, atau WebP lain.", 400); }
    const result = await saveMemory(guest.id, id, image);
    if (result === "full") return error("Batas 10 foto untuk undangan Anda sudah tercapai.", 409);
    if (result === "invalid") return error("Upload tidak valid.", 400);
    return NextResponse.json({ photos: await listMemories(guest.id), limit: MEMORY_LIMIT }, { headers });
  } catch (cause) {
    if (cause instanceof StorageConfigurationError) return error(cause.message, 503);
    logCause("memories.POST", cause);
    return error("Foto belum tersimpan. Periksa koneksi dan coba lagi.", 503);
  }
}
