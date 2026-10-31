// Test RPC sect.* bằng server thật, không cần TikTok live.
// Chạy: node --test tests/
// Biến môi trường: PORT tự chọn, SECT_RPC_TOKEN=test-token-123
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 34567;
const BASE = `http://127.0.0.1:${PORT}`;
const TOKEN = 'test-token-123';
let proc;

async function waitReady() {
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(`${BASE}/api/state`); if (r.ok) return; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('server did not start');
}
async function rpc(method, params, token = TOKEN) {
  const r = await fetch(`${BASE}/rpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Sect-Token': token } : {}) },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  return r.json();
}

before(async () => {
  proc = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT), SECT_RPC_TOKEN: TOKEN },
    stdio: 'ignore',
  });
  await waitReady();
});
after(() => { proc?.kill(); });

test('state ban đầu: sect Thanh Vân Tông, tu vi 0, TikTok chưa kết nối', async () => {
  const st = await (await fetch(`${BASE}/api/state`)).json();
  assert.equal(st.sectName, 'Thanh Vân Tông');
  assert.equal(st.totalTuVi, 0);
  assert.equal(st.tiktok.connected, false);
  assert.equal(st.tiktok.username, '');
  assert.equal(st.settings.autoSim, false);
});

test('không token thì RPC bị từ chối', async () => {
  const out = await rpc('sect.lightLamp', { user: 'A', count: 1 }, null);
  assert.equal(out.ok, false);
});

test('sect.lightLamp cộng đúng 5 tu vi cho 1 linh đăng', async () => {
  const out = await rpc('sect.lightLamp', { user: 'Vân Phi', count: 1, wish: 'Cầu đột phá' });
  assert.equal(out.result.event.type, 'lightLamp');
  assert.equal(out.result.event.tuVi, 5);
});

test('sect.comment đo linh căn ra thẻ công pháp, comment lạ chỉ tụ linh +1', async () => {
  const a = await rpc('sect.comment', { comment: 'đo linh căn', user: 'Linh Nhi' });
  assert.equal(a.result.event.type, 'drawTechnique');
  assert.ok(a.result.event.technique.grade);
  const b = await rpc('sect.comment', { comment: 'chào mọi người', user: 'Khách' });
  assert.equal(b.result.event.type, 'cultivate');
  assert.equal(b.result.event.tuVi, 1);
});

test('quà 500 xu bị trần 300 tu vi và ra type tribulation', async () => {
  const out = await rpc('sect.offerGift', { user: 'Trần Kiếm', coins: 500, giftName: 'Linh Thạch' });
  assert.equal(out.result.event.tuVi, 300);
  assert.equal(out.result.event.type, 'tribulation');
});

test('method temple.* cũ bị từ chối', async () => {
  const out = await rpc('temple.burnIncense', { user: 'X' });
  assert.match(out.error.message, /Không tìm thấy phương thức/);
});
