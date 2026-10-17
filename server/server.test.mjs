import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import net from 'node:net';
import http from 'node:http';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import { createSiteServer } from './server.mjs';

// fetch() silently decompresses, so compression tests use node:http to see the bytes on the wire.
function rawGet(path, headers = {}) {
  const { port } = server.address();
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path, headers }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    }).on('error', reject);
  });
}

const BIG_JS = `export const data = ${JSON.stringify(Array.from({ length: 400 }, (_, i) => `item-${i % 7}`))};\n`;

let base;
let root;
let server;
let origin;

const CLIP = Buffer.from(Array.from({ length: 1000 }, (_, i) => i % 256));

before(async () => {
  base = mkdtempSync(join(tmpdir(), 'site-test-'));
  root = join(base, 'site');
  mkdirSync(join(root, 'css'), { recursive: true });
  mkdirSync(join(root, 'empty-dir'));
  mkdirSync(join(root, 'docs'));
  writeFileSync(join(root, 'index.html'), '<!doctype html><title>home</title>');
  writeFileSync(join(root, 'docs', 'index.html'), '<p>docs</p>');
  writeFileSync(join(root, 'css', 'app.css'), 'body{}');
  writeFileSync(join(root, 'app.js'), 'export {}');
  writeFileSync(join(root, 'big.js'), BIG_JS);
  writeFileSync(join(root, 'font.woff2'), 'x');
  writeFileSync(join(root, 'clip.mp4'), CLIP);
  writeFileSync(join(root, '.env'), 'SECRET=1');
  writeFileSync(join(base, 'secret.txt'), 'TOP SECRET');

  server = createSiteServer({ root, rateLimit: { max: 1000, windowMs: 60_000 }, log: () => {} });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  rmSync(base, { recursive: true, force: true });
});

// fetch() normalises "../" away, so traversal probes go over a raw socket.
function rawRequest(path, method = 'GET') {
  const { port } = server.address();
  return new Promise((resolve, reject) => {
    const socket = net.connect(port, '127.0.0.1', () => {
      socket.write(`${method} ${path} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n`);
    });
    let data = '';
    socket.on('data', (chunk) => { data += chunk.toString('latin1'); });
    socket.on('end', () => resolve({ status: Number(data.split(' ')[1]), raw: data }));
    socket.on('error', reject);
  });
}

test('serves index.html at the root with an html content type', async () => {
  const res = await fetch(`${origin}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /^text\/html/);
  assert.match(await res.text(), /<title>home<\/title>/);
});

test('serves a directory index when the directory has index.html', async () => {
  const res = await fetch(`${origin}/docs/`);
  assert.equal(res.status, 200);
  assert.equal(await res.text(), '<p>docs</p>');
});

test('returns correct MIME types for static assets', async () => {
  const cases = {
    '/css/app.css': /^text\/css/,
    '/app.js': /^text\/javascript/,
    '/font.woff2': /^font\/woff2/,
    '/clip.mp4': /^video\/mp4/,
  };
  for (const [path, type] of Object.entries(cases)) {
    const res = await fetch(origin + path);
    assert.equal(res.status, 200, path);
    assert.match(res.headers.get('content-type'), type, path);
    await res.arrayBuffer();
  }
});

test('returns 404 for missing files and never lists a directory', async () => {
  const missing = await fetch(`${origin}/nope.html`);
  assert.equal(missing.status, 404);
  const dir = await fetch(`${origin}/empty-dir/`);
  assert.equal(dir.status, 404);
  assert.doesNotMatch(await dir.text(), /empty-dir/);
});

test('blocks path traversal outside the web root', async () => {
  const probes = [
    '/../secret.txt',
    '/%2e%2e/secret.txt',
    '/css/..%2f..%2fsecret.txt',
    '/%2e%2e%5csecret.txt',
    '/..\\secret.txt',
  ];
  for (const probe of probes) {
    const res = await rawRequest(probe);
    assert.ok([400, 404].includes(res.status), `${probe} -> ${res.status}`);
    assert.doesNotMatch(res.raw, /TOP SECRET/, probe);
  }
});

test('rejects Windows drive letters and NTFS alternate data streams', async () => {
  for (const probe of ['/index.html::$DATA', '/favicon.svg:Zone.Identifier', '/C:/Windows/win.ini', '/c%3a/secret.txt']) {
    const res = await rawRequest(probe);
    assert.equal(res.status, 400, probe);
    assert.doesNotMatch(res.raw, /<title>home<\/title>|TOP SECRET/, probe);
  }
});

test('closes connections that stay idle past the timeout', async () => {
  const idle = createSiteServer({ root, idleTimeoutMs: 150, log: () => {} });
  await new Promise((resolve) => idle.listen(0, '127.0.0.1', resolve));
  try {
    const closedAfter = await new Promise((resolve, reject) => {
      const started = Date.now();
      const socket = net.connect(idle.address().port, '127.0.0.1');
      socket.on('close', () => resolve(Date.now() - started));
      socket.on('error', () => {});
      setTimeout(() => reject(new Error('idle socket was never closed')), 3000);
    });
    assert.ok(closedAfter < 2000, `closed after ${closedAfter} ms`);
  } finally {
    idle.closeAllConnections();
    await new Promise((resolve) => idle.close(resolve));
  }
});

test('caps the number of simultaneous connections', async () => {
  const capped = createSiteServer({ root, maxConnections: 2, log: () => {} });
  await new Promise((resolve) => capped.listen(0, '127.0.0.1', resolve));
  const sockets = [];
  try {
    const open = () => new Promise((resolve) => {
      const socket = net.connect(capped.address().port, '127.0.0.1', () => resolve(socket));
      socket.on('error', () => {});
      sockets.push(socket);
    });
    await open();
    await open();
    const third = await open();
    const dropped = await new Promise((resolve) => {
      third.on('close', () => resolve(true));
      setTimeout(() => resolve(false), 1000);
    });
    assert.equal(dropped, true, 'third connection should be dropped');
  } finally {
    sockets.forEach((socket) => socket.destroy());
    capped.closeAllConnections();
    await new Promise((resolve) => capped.close(resolve));
  }
});

test('hides dot-files', async () => {
  const res = await fetch(`${origin}/.env`);
  assert.equal(res.status, 404);
  assert.doesNotMatch(await res.text(), /SECRET/);
});

test('rejects malformed URIs and null bytes with 400', async () => {
  assert.equal((await rawRequest('/%E0%A4%A')).status, 400);
  assert.equal((await rawRequest('/index.html%00.css')).status, 400);
});

test('rejects non-GET/HEAD methods with 405 and an Allow header', async () => {
  const res = await fetch(`${origin}/`, { method: 'POST', body: 'x' });
  assert.equal(res.status, 405);
  assert.equal(res.headers.get('allow'), 'GET, HEAD');
});

test('HEAD returns headers without a body', async () => {
  const res = await fetch(`${origin}/css/app.css`, { method: 'HEAD' });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-length'), '6');
  assert.equal(await res.text(), '');
});

test('sends security headers on every response', async () => {
  for (const path of ['/', '/nope']) {
    const res = await fetch(origin + path);
    const csp = res.headers.get('content-security-policy');
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.doesNotMatch(csp, /unsafe-eval/);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.match(res.headers.get('permissions-policy'), /camera=\(\)/);
    await res.arrayBuffer();
  }
});

test('revalidates HTML, CSS and JS so edits show up immediately', async () => {
  for (const path of ['/', '/css/app.css', '/app.js']) {
    const res = await fetch(origin + path);
    assert.equal(res.headers.get('cache-control'), 'no-cache', path);
    await res.text();
  }
});

test('caches media and fonts for a day', async () => {
  for (const path of ['/clip.mp4', '/font.woff2']) {
    const res = await fetch(origin + path);
    assert.match(res.headers.get('cache-control'), /max-age=86400/, path);
    await res.arrayBuffer();
  }
});

test('answers a byte range with 206 and the exact bytes', async () => {
  const res = await fetch(`${origin}/clip.mp4`, { headers: { Range: 'bytes=10-19' } });
  assert.equal(res.status, 206);
  assert.equal(res.headers.get('content-range'), 'bytes 10-19/1000');
  assert.equal(res.headers.get('accept-ranges'), 'bytes');
  assert.deepEqual(Buffer.from(await res.arrayBuffer()), CLIP.subarray(10, 20));
});

test('supports open-ended and suffix byte ranges', async () => {
  const open = await fetch(`${origin}/clip.mp4`, { headers: { Range: 'bytes=990-' } });
  assert.equal(open.headers.get('content-range'), 'bytes 990-999/1000');
  assert.deepEqual(Buffer.from(await open.arrayBuffer()), CLIP.subarray(990));
  const suffix = await fetch(`${origin}/clip.mp4`, { headers: { Range: 'bytes=-5' } });
  assert.equal(suffix.headers.get('content-range'), 'bytes 995-999/1000');
  assert.deepEqual(Buffer.from(await suffix.arrayBuffer()), CLIP.subarray(995));
});

test('returns 416 for an unsatisfiable range', async () => {
  const res = await fetch(`${origin}/clip.mp4`, { headers: { Range: 'bytes=5000-6000' } });
  assert.equal(res.status, 416);
  assert.equal(res.headers.get('content-range'), 'bytes */1000');
  await res.arrayBuffer();
});

test('compresses large text assets with brotli when the client accepts it', async () => {
  const res = await rawGet('/big.js', { 'Accept-Encoding': 'gzip, deflate, br' });
  assert.equal(res.status, 200);
  assert.equal(res.headers['content-encoding'], 'br');
  assert.match(res.headers.vary, /Accept-Encoding/);
  assert.equal(Number(res.headers['content-length']), res.body.length);
  assert.ok(res.body.length < BIG_JS.length / 3, `only shrank to ${res.body.length} bytes`);
  assert.equal(brotliDecompressSync(res.body).toString(), BIG_JS);
});

test('falls back to gzip when brotli is not accepted', async () => {
  const res = await rawGet('/big.js', { 'Accept-Encoding': 'gzip' });
  assert.equal(res.headers['content-encoding'], 'gzip');
  assert.equal(gunzipSync(res.body).toString(), BIG_JS);
});

test('sends identity when compression is refused, small, binary or ranged', async () => {
  const cases = [
    ['/big.js', {}],
    ['/big.js', { 'Accept-Encoding': 'br;q=0, gzip;q=0' }],
    ['/css/app.css', { 'Accept-Encoding': 'br' }],
    ['/clip.mp4', { 'Accept-Encoding': 'br' }],
    ['/big.js', { 'Accept-Encoding': 'br', Range: 'bytes=0-9' }],
  ];
  for (const [path, headers] of cases) {
    const res = await rawGet(path, headers);
    assert.equal(res.headers['content-encoding'], undefined, `${path} ${JSON.stringify(headers)}`);
  }
});

test('uses a distinct ETag per encoding and honours it with 304', async () => {
  const plain = await rawGet('/big.js');
  const br = await rawGet('/big.js', { 'Accept-Encoding': 'br' });
  assert.notEqual(plain.headers.etag, br.headers.etag);
  const revalidated = await rawGet('/big.js', { 'Accept-Encoding': 'br', 'If-None-Match': br.headers.etag });
  assert.equal(revalidated.status, 304);
  assert.equal(revalidated.body.length, 0);
});

test('returns 304 when the ETag matches', async () => {
  const first = await fetch(`${origin}/css/app.css`);
  const etag = first.headers.get('etag');
  await first.text();
  assert.ok(etag);
  const second = await fetch(`${origin}/css/app.css`, { headers: { 'If-None-Match': etag } });
  assert.equal(second.status, 304);
});

test('rate-limits a client that exceeds the window budget', async () => {
  const limited = createSiteServer({ root, rateLimit: { max: 3, windowMs: 60_000 }, log: () => {} });
  await new Promise((resolve) => limited.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${limited.address().port}/css/app.css`;
  try {
    const statuses = [];
    for (let i = 0; i < 5; i += 1) {
      const res = await fetch(url);
      statuses.push(res.status);
      await res.arrayBuffer();
    }
    assert.deepEqual(statuses, [200, 200, 200, 429, 429]);
  } finally {
    await new Promise((resolve) => limited.close(resolve));
  }
});

test('rate limit keys on the proxy-added (rightmost) X-Forwarded-For address', async () => {
  const limited = createSiteServer({ root, rateLimit: { max: 1, windowMs: 60_000 }, log: () => {} });
  await new Promise((resolve) => limited.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${limited.address().port}/css/app.css`;
  try {
    // A visitor can forge the left entries, but the proxy appends the real address on the right.
    const a1 = await fetch(url, { headers: { 'X-Forwarded-For': '1.1.1.1, 198.51.100.7' } });
    const b1 = await fetch(url, { headers: { 'X-Forwarded-For': '1.1.1.1, 198.51.100.8' } });
    const a2 = await fetch(url, { headers: { 'X-Forwarded-For': '9.9.9.9, 198.51.100.7' } });
    await Promise.all([a1.arrayBuffer(), b1.arrayBuffer(), a2.arrayBuffer()]);
    assert.deepEqual([a1.status, b1.status, a2.status], [200, 200, 429]);
  } finally {
    await new Promise((resolve) => limited.close(resolve));
  }
});

test('rate limit keys on the Cloudflare client IP header when present', async () => {
  const limited = createSiteServer({ root, rateLimit: { max: 1, windowMs: 60_000 }, log: () => {} });
  await new Promise((resolve) => limited.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${limited.address().port}/css/app.css`;
  try {
    const a1 = await fetch(url, { headers: { 'CF-Connecting-IP': '203.0.113.1' } });
    const b1 = await fetch(url, { headers: { 'CF-Connecting-IP': '203.0.113.2' } });
    const a2 = await fetch(url, { headers: { 'CF-Connecting-IP': '203.0.113.1' } });
    await Promise.all([a1.arrayBuffer(), b1.arrayBuffer(), a2.arrayBuffer()]);
    assert.deepEqual([a1.status, b1.status, a2.status], [200, 200, 429]);
  } finally {
    await new Promise((resolve) => limited.close(resolve));
  }
});
