import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadBucketCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class StorageConfigurationError extends Error {
  constructor() { super("Penyimpanan foto belum dikonfigurasi lengkap. Silakan hubungi pengelola undangan."); }
}

export function storageConfig() {
  const endpoint = process.env.S3_ENDPOINT?.trim();
  const region = process.env.S3_REGION?.trim();
  const bucket = process.env.S3_BUCKET?.trim();
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  const pathStyle = process.env.S3_FORCE_PATH_STYLE?.trim().toLowerCase();
  if (!endpoint || !region || !bucket || !accessKeyId || !secretAccessKey ||
    (pathStyle && pathStyle !== "true" && pathStyle !== "false")) throw new StorageConfigurationError();
  let url: URL;
  try { url = new URL(endpoint); } catch { throw new StorageConfigurationError(); }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || !["", "/"].includes(url.pathname)) throw new StorageConfigurationError();
  return { endpoint: url.origin, region, bucket, credentials: { accessKeyId, secretAccessKey }, forcePathStyle: pathStyle === "true" };
}

function storage() {
  const { bucket, ...config } = storageConfig();
  const client = new S3Client({ ...config, maxAttempts: 2,
    // Some S3-compatible providers do not implement AWS's optional checksum trailers.
    requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED",
    requestHandler: { connectionTimeout: 4000, requestTimeout: 15000 },
  });
  return { client, bucket };
}

export function memoryObjectKey(name: string, guestId: string, uploadId: string) {
  const slug = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "tamu";
  if (!/^[a-zA-Z0-9_-]+$/.test(guestId) || !/^[a-zA-Z0-9_-]+$/.test(uploadId)) throw new Error("Identitas foto tidak valid.");
  // Guest ID is not an invitation token. A new attempt key prevents retry cleanup races.
  return `wedding-photo/${slug}--${guestId}/${uploadId}-${randomUUID()}.jpg`;
}

function validateKey(key: string) {
  if (!key.startsWith("wedding-photo/") || key.includes("..") || !key.endsWith(".jpg")) throw new Error("Lokasi foto tidak valid.");
}

export async function uploadMemoryObject(key: string, image: Buffer) {
  validateKey(key);
  if (!image.length || image.length > 1048576) throw new Error("Ukuran foto tidak valid.");
  const { client, bucket } = storage();
  try {
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: image, ContentType: "image/jpeg", ContentLength: image.length, CacheControl: "private, max-age=300" }));
    const stored = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    if (stored.ContentLength !== image.length) throw new Error("Verifikasi foto gagal.");
  } finally { client.destroy(); }
}

export async function deleteMemoryObject(key: string) {
  validateKey(key);
  const { client, bucket } = storage();
  try { await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })); }
  finally { client.destroy(); }
}

export async function memoryDownloadUrl(key: string) {
  validateKey(key);
  const { client, bucket } = storage();
  try { return await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 300 }); }
  finally { client.destroy(); }
}

/** Read-only check; does not create a bucket or upload a test file. */
export async function checkObjectStorage() {
  const { client, bucket } = storage();
  try { await client.send(new HeadBucketCommand({ Bucket: bucket })); }
  finally { client.destroy(); }
}
