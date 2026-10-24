// Node.js 24+: uses native TypeScript stripping for the application's storage adapter.
import { randomUUID } from 'node:crypto';
import { registerHooks } from 'node:module';
const root = new URL('../', import.meta.url);
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('@/lib/')) return { url: new URL(`src/lib/${specifier.slice(6)}.ts`, root).href, shortCircuit: true };
  return next(specifier, context);
}});

// S3 error names and messages (NoSuchBucket, SignatureDoesNotMatch, AccessDenied, ...)
// describe the cause and contain no secrets, request body or signed URL. Show them so
// setup problems are diagnosable; still never print credentials or the SDK request.
function describe(error) {
  const status = error?.$metadata?.httpStatusCode;
  const parts = [error?.name || 'Error'];
  if (status) parts[0] += ` (HTTP ${status})`;
  if (error?.message) parts.push(`  ${error.message}`);
  if (error?.cause?.code && error.cause.code !== error?.name) parts.push(`  (${error.cause.code})`);
  return parts.join('\n');
}

let db;
try {
  const storage = await import('../src/lib/object-storage.ts');
  await storage.checkObjectStorage();
  console.log('✓ Bucket S3 dapat diakses (HeadBucket berhasil).');

  // HeadBucket only proves the bucket exists and the key can reach it. A real upload
  // needs write + read + delete permission, so verify them before the event with --write.
  if (process.argv.includes('--write')) {
    const key = `wedding-photo/diagnostic-${randomUUID()}/probe.jpg`;
    // 1x1 JPEG (valid image bytes) so the ContentLength verification has something real.
    const probe = Buffer.from(
      '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
      'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA' +
      'AAAAAAAAAAAACP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AfwD/2Q==', 'base64');
    await storage.uploadMemoryObject(key, probe);
    console.log('✓ Upload uji berhasil (PutObject + verifikasi ukuran).');
    const url = await storage.memoryDownloadUrl(key);
    const res = await fetch(url);
    if (!res.ok) throw Object.assign(new Error(`Download uji gagal: ${res.status}`), { name: 'ProbeDownloadError', $metadata: { httpStatusCode: res.status } });
    console.log('✓ Download uji berhasil (presigned URL dapat dibaca).');
    await storage.deleteMemoryObject(key);
    console.log('✓ Hapus uji berhasil. Izin tulis/baca/hapus lengkap.');
  } else if (!process.argv.includes('--migrate')) {
    console.log('Pemeriksaan hanya membaca akses bucket. Jalankan dengan --write untuk uji unggah/baca/hapus sungguhan.');
  }

  if (process.argv.includes('--migrate')) {
    db = await import('../src/lib/db.ts');
    console.log(`✓ ${await db.migrateLegacyMemories()} foto lama dipindahkan ke wedding-photo/.`);
  }
} catch (error) {
  console.error('✗ Gagal. Penyebab dari server penyimpanan:');
  console.error(describe(error));
  console.error('\nPeriksa: endpoint (root S3, bukan URL bucket), region, nama bucket,');
  console.error('izin kredensial (tulis/baca/hapus), dan S3_FORCE_PATH_STYLE (banyak provider butuh "true").');
  process.exitCode = 1;
} finally { await db?.closeDatabase(); hooks.deregister(); }
