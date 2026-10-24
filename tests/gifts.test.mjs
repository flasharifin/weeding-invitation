// Isolated file storage + real route handlers. Auth and configured destinations
// are fixtures; no production database, credentials, or guest data are touched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
const root = new URL('../', import.meta.url);
const originalCwd = process.cwd();
const directory = mkdtempSync(join(tmpdir(), 'wedding-gift-test-'));
process.env.DATABASE_URL = '';
process.env.NODE_ENV = 'test';
process.chdir(directory);
mkdirSync('data');
let role = null;
globalThis.giftTestRole = () => role;
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === '@/lib/auth') return { url: 'data:text/javascript,export async function getRole(){return globalThis.giftTestRole()}', shortCircuit: true };
  if (specifier === '@/lib/wedding-gift') return { url: 'data:text/javascript,' + encodeURIComponent(`export { demoWeddingGift as weddingGift } from ${JSON.stringify(new URL('src/lib/wedding-gift.ts', root).href)}`), shortCircuit: true };
  if (specifier.startsWith('@/lib/')) return { url: new URL(`src/lib/${specifier.slice(6)}.ts`, root).href, shortCircuit: true };
  if (specifier === 'next/server') return { url: new URL('node_modules/next/server.js', root).href, shortCircuit: true };
  return next(specifier, context);
}});
const db = await import(new URL('src/lib/db.ts', root));
const api = await import(new URL('src/app/api/gifts/route.ts', root));
const payload = (overrides = {}) => ({ id: randomUUID(), token: 'demo-1', sender: 'Pengirim Uji', kind: 'money', destination: 'bni', amount: 500000, ...overrides });
const post = body => api.POST(new Request('http://localhost/api/gifts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));

test('gift submissions, persistence, validation, privacy and retry safety', async () => {
  try {
    await db.listGuests();
    assert.equal((await api.GET()).status, 401);
    role = 'staff'; assert.equal((await api.GET()).status, 401);
    const money = payload();
    assert.equal((await post(money)).status, 200);
    assert.equal((await post(money)).status, 200);
    assert.equal((await db.listGifts()).length, 1, 'same submission is not duplicated');
    assert.equal((await post(payload({ kind: 'parcel', destination: 'shipping', description: 'Paket rumah / RESI123', amount: null }))).status, 200);
    for (const changes of [{ amount: -1 }, { amount: 1.5 }, { amount: '500000' }, { sender: ' ' }, { sender: 'x'.repeat(121) }, { destination: 'invented' }, { kind: 'parcel', destination: 'shipping', description: '' }]) {
      assert.equal((await post(payload(changes))).status, 400);
    }
    assert.equal((await post(payload({ token: 'invalid' }))).status, 404);
    assert.equal((await post(null)).status, 400);
    assert.equal((await api.POST(new Request('http://localhost', { method: 'POST', body: '{' }))).status, 400);
    assert.equal((await post({ ...money, token: 'demo-2' })).status, 404, 'another guest cannot reuse a submission ID');
    role = 'admin'; const response = await api.GET();
    assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
    const records = await response.json(); assert.equal(records.length, 2);
    assert.equal(records.find(g => g.kind === 'money').amount, 500000);
    assert.equal(records.find(g => g.kind === 'parcel').amount, null);
    assert.equal(records.find(g => g.kind === 'parcel').description, 'Paket rumah / RESI123');
    assert.equal(records[0].guestName, 'Budi Santoso');
    assert.equal(JSON.parse(readFileSync('data/gifts.json', 'utf8')).length, 2, 'persisted on disk');
    await db.deleteGuest(records[0].guestId);
    assert.equal((await db.listGifts()).length, 2, 'deleting a guest preserves gift records');
    assert.equal((await db.listGifts())[0].guestId, null);
  } finally {
    hooks.deregister(); process.chdir(originalCwd); rmSync(directory, { recursive: true, force: true });
    delete globalThis.giftTestRole;
  }
});
