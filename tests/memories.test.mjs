import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
const root = new URL('../', import.meta.url);
const cwd = process.cwd();
const temporary = mkdtempSync(join(tmpdir(), 'memories-test-'));
process.env.DATABASE_URL = '';
process.env.NODE_ENV = 'test';
process.chdir(temporary); mkdirSync('data');
const objects = new Map();
let failUpload = false;
globalThis.memoryTestStorage = {
  upload: async (key, image) => { if (failUpload) throw new Error('Storage unavailable'); objects.set(key, Buffer.from(image)); },
  remove: async key => { objects.delete(key); },
};
let role = null;
globalThis.memoryTestRole = () => role;
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === '@/lib/object-storage') return { url: 'data:text/javascript,' + encodeURIComponent(`
    export { memoryObjectKey, StorageConfigurationError } from ${JSON.stringify(new URL('src/lib/object-storage.ts',root).href)};
    export const storageConfig = () => ({});
    export const uploadMemoryObject = (key, image) => globalThis.memoryTestStorage.upload(key,image);
    export const deleteMemoryObject = key => globalThis.memoryTestStorage.remove(key);
    export const memoryDownloadUrl = async key => 'https://example.invalid/' + key;
  `), shortCircuit:true };
  if (specifier === '@/lib/auth') return { url: 'data:text/javascript,export async function getRole(){return globalThis.memoryTestRole()}', shortCircuit: true };
  if (specifier.startsWith('@/lib/')) return { url: new URL(`src/lib/${specifier.slice(6)}.ts`, root).href, shortCircuit: true };
  if (specifier === 'next/server') return { url: new URL('node_modules/next/server.js', root).href, shortCircuit: true };
  return next(specifier, context);
}});
const db = await import(new URL('src/lib/db.ts', root));
const api = await import(new URL('src/app/api/memories/route.ts', root));
const imageApi = await import(new URL('src/app/api/memories/[id]/route.ts', root));
const picture = await sharp({ create: { width: 2000, height: 1400, channels: 3, background: '#a88760' } }).jpeg().toBuffer();
const post = (id = randomUUID(), token = 'demo-1', image = picture, mime = 'image/jpeg') => api.POST(new Request('http://localhost/api/memories', {
  method: 'POST', headers: { 'x-invitation-token': token, 'x-upload-id': id, 'content-type': mime }, body: image,
}));
const list = token => api.GET(new Request(`http://localhost/api/memories?token=${token}`));
const photo = (id, token) => imageApi.GET(new Request(`http://localhost/api/memories/${id}?token=${token}`), { params: Promise.resolve({ id }) });

test('memory upload: validation, persistent quota, retry safety and photo privacy', async () => {
 try {
  const guests = await db.listGuests();const guest = guests.find(g => g.token === 'demo-1');
  assert.equal((await list('bad')).status, 401);
  assert.equal((await post(randomUUID(), 'bad')).status, 401);
  assert.equal((await post(randomUUID(), 'demo-1', Buffer.from('not a photo'))).status, 400);
  assert.equal((await post(randomUUID(), 'demo-1', picture, 'image/svg+xml')).status, 415);
  assert.equal((await post(randomUUID(), 'demo-1', Buffer.alloc(1048577))).status, 413);
  const id = randomUUID();assert.equal((await post(id)).status, 200);
  assert.equal((await post(id)).status, 200);
  assert.equal((await db.listMemories(guest.id)).length, 1, 'retries do not consume extra quota');
  assert.equal((await post(id, 'demo-2')).status, 400);
  assert.equal((await photo(id, 'demo-2')).status, 404);
  assert.equal((await photo(id, '')).status, 404);
  role='staff';assert.equal((await photo(id, '')).status, 404);
  role='admin';assert.equal((await photo(id, '')).status, 307);role=null;
  const response = await photo(id, 'demo-1');assert.equal(response.status, 307);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  const key = (await db.getMemory(id)).objectKey;
  assert.match(key, new RegExp('^wedding-photo/budi-santoso--'+guest.id+'/'));
  assert.equal(response.headers.get('location'),'https://example.invalid/'+key);
  const metadata = await sharp(objects.get(key)).metadata();
  const persisted = JSON.parse(readFileSync('data/memories.json','utf8'));
  assert.equal(persisted[0].image,undefined,'database stores no new image bytes');
  failUpload=true;assert.equal((await post()).status,503);failUpload=false;
  assert.equal((await db.listMemories(guest.id)).length,1,'failed storage does not consume quota');
  assert.equal(metadata.width, 1600);assert.equal(metadata.format, 'jpeg');assert.equal(metadata.exif, undefined);
  const attempts = await Promise.all(Array.from({length:12},()=>post()));
  assert.equal(attempts.filter(r=>r.status===200).length, 9);
  assert.equal(attempts.filter(r=>r.status===409).length, 3);
  const result = await (await list('demo-1')).json();assert.equal(result.photos.length,10);assert.equal(result.limit,10);
  assert.equal(JSON.parse(readFileSync('data/memories.json','utf8')).length,10);
  assert.equal((await post(id)).status,200,'retry at full quota is still idempotent');
  assert.equal((await post(randomUUID(),'demo-2')).status,200,'quota belongs to each guest');
  const second = guests.find(g => g.token === 'demo-2');
  const legacyId = randomUUID();
  const all = JSON.parse(readFileSync('data/memories.json','utf8'));
  all.push({id:legacyId,guestId:second.id,slot:2,image:picture.toString('base64'),createdAt:new Date().toISOString()});
  writeFileSync('data/memories.json',JSON.stringify(all));
  assert.equal((await photo(legacyId,'demo-2')).status,200,'legacy bytes remain readable');
  failUpload=true;await assert.rejects(()=>db.migrateLegacyMemories());failUpload=false;
  assert((await db.getMemory(legacyId)).image,'failed migration preserves old bytes');
  assert.equal(await db.migrateLegacyMemories(),1);
  assert.equal(await db.migrateLegacyMemories(),0,'migration is repeatable');
  assert.equal((await db.getMemory(legacyId)).image,null);
  assert.equal((await photo(legacyId,'demo-2')).status,307);
  assert.equal((await db.listMemories(second.id)).length,2,'migration preserves quota');
  await db.deleteGuest(guest.id);assert.equal(await db.getMemory(id),null);
 } finally {hooks.deregister();process.chdir(cwd);rmSync(temporary,{recursive:true,force:true});delete globalThis.memoryTestRole;delete globalThis.memoryTestStorage;}
});
