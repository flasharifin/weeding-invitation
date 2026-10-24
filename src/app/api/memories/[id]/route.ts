import { memoryDownloadUrl } from "@/lib/object-storage";
import { getRole } from "@/lib/auth";
import { getGuestByToken, getMemory } from "@/lib/db";
export const runtime = "nodejs";
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
  const missing = () => new Response("Not found", { status: 404, headers });
  try {
    const { id } = await params;
    const token = new URL(req.url).searchParams.get("token") || "";
    const isAdmin = (await getRole()) === "admin";
    const guest = !isAdmin && token && token.length <= 200 ? await getGuestByToken(token) : null;
    if (!isAdmin && !guest) return missing();
    const photo = await getMemory(id);
    if (!photo || (!isAdmin && photo.guestId !== guest?.id)) return missing();
    if (photo.objectKey) return new Response(null, { status: 307, headers: { ...headers, Location: await memoryDownloadUrl(photo.objectKey) } });
    if (!photo.image) return missing();
    return new Response(new Uint8Array(photo.image), { headers: { ...headers, "Content-Type": "image/jpeg", "Content-Disposition": 'inline; filename="wedding-memory.jpg"' } });
  } catch (cause) {
    const e = cause as { name?: string; message?: string; $metadata?: { httpStatusCode?: number } };
    console.error("[memories.image]", e?.name || "Error", e?.$metadata?.httpStatusCode ?? "", "-", e?.message || cause);
    return new Response("Foto belum dapat dimuat", { status: 503, headers });
  }
}
