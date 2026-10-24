// Node.js 24+: uses native TypeScript stripping for the application's storage adapter.
import { registerHooks } from 'node:module';
const root = new URL('../', import.meta.url);
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('@/lib/')) return { url: new URL(`src/lib/${specifier.slice(6)}.ts`, root).href, shortCircuit: true };
  return next(specifier, context);
}});
let db;
try {
  const storage = await import('../src/lib/object-storage.ts');
  await storage.checkObjectStorage();
  console.log('✓ Bucket S3 dapat diakses.');
  if (process.argv.includes('--migrate')) {
    db = await import('../src/lib/db.ts');
    console.log(`✓ ${await db.migrateLegacyMemories()} foto lama dipindahkan ke wedding-photo/.`);
  } else console.log('Pemeriksaan hanya membaca akses bucket; tidak mengunggah atau menghapus file.');
} catch (error) {
  // Never print the SDK request, environment values, or signed URLs.
  console.error(`✗ Koneksi/migrasi gagal (${error?.name || 'Error'}). Periksa endpoint, region, bucket, izin kredensial, dan S3_FORCE_PATH_STYLE.`);
  process.exitCode = 1;
} finally { await db?.closeDatabase(); hooks.deregister(); }
