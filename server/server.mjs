// Zero-dependency static file server for the portfolio.
// Binds to localhost only; a tunnel (Tailscale Funnel or Cloudflare) is the sole public entry point.
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { resolve, join, sep, extname, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { brotliCompress, gzip, constants as zlib } from 'node:zlib';

const brotliAsync = promisify(brotliCompress);
const gzipAsync = promisify(gzip);
// Media is already compressed; only text formats benefit (e.g. three.js 691 KB -> ~140 KB with brotli).
const COMPRESSIBLE_TYPES = ['text/', 'application/json', 'application/xml', 'image/svg+xml'];
const MIN_COMPRESS_BYTES = 1024;
const MAX_COMPRESSED_ENTRIES = 200;
const ENCODING_TAGS = { br: 'br', gzip: 'gz' };

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "media-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

const SECURITY_HEADERS = {
  'Content-Security-Policy': CONTENT_SECURITY_POLICY,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'X-Frame-Options': 'DENY',
};

const ASSET_CACHE = 'public, max-age=86400';
// Code and markup revalidate every load (cheap 304 via ETag) so site edits reach visitors immediately.
const REVALIDATE_TYPES = ['text/html', 'text/css', 'text/javascript', 'application/json'];
const DEFAULT_RATE_LIMIT = { max: 600, windowMs: 60_000 };
// Bound slow-read and connection-exhaustion attacks arriving through the tunnel.
const DEFAULT_IDLE_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_CONNECTIONS = 256;
const KEEP_ALIVE_TIMEOUT_MS = 5_000;
const MAX_TRACKED_CLIENTS = 10_000;

export function createRateLimiter({ max, windowMs }) {
  const clients = new Map();
  return function isAllowed(key, now = Date.now()) {
    if (clients.size > MAX_TRACKED_CLIENTS) {
      for (const [k, entry] of clients) {
        if (now - entry.start >= windowMs) clients.delete(k);
      }
    }
    const entry = clients.get(key);
    if (!entry || now - entry.start >= windowMs) {
      clients.set(key, { start: now, count: 1 });
      return true;
    }
    const next = { start: entry.start, count: entry.count + 1 };
    clients.set(key, next);
    return next.count <= max;
  };
}

// The server only listens on loopback, so every connection comes from a local proxy (cloudflared or
// Tailscale Funnel). Prefer the proxy's client header; for X-Forwarded-For take the rightmost entry,
// which the proxy appends itself (visitors can only forge entries to its left).
function clientKey(req) {
  const cloudflare = req.headers['cf-connecting-ip'];
  if (typeof cloudflare === 'string' && cloudflare) return cloudflare;
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',').pop().trim();
  return req.socket.remoteAddress ?? 'unknown';
}

// Maps a request URL to an absolute path inside webRoot, or an HTTP status on rejection.
export function resolveRequestPath(webRoot, rawUrl) {
  const pathname = rawUrl.split('?')[0].split('#')[0];
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return { status: 400 };
  }
  // ':' blocks Windows drive letters (C:) and NTFS alternate data streams (file::$DATA, :Zone.Identifier).
  if (decoded.includes('\0') || decoded.includes('\\') || decoded.includes(':')) return { status: 400 };
  const segments = decoded.split('/').filter(Boolean);
  if (segments.some((segment) => segment.startsWith('.'))) return { status: 404 };
  const filePath = resolve(webRoot, ...segments);
  if (filePath !== webRoot && !filePath.startsWith(webRoot + sep)) return { status: 404 };
  return { status: 200, filePath };
}

async function findFile(filePath) {
  try {
    const stats = await stat(filePath);
    if (stats.isFile()) return { filePath, stats };
    if (!stats.isDirectory()) return null;
    const indexPath = join(filePath, 'index.html');
    const indexStats = await stat(indexPath);
    return indexStats.isFile() ? { filePath: indexPath, stats: indexStats } : null;
  } catch {
    return null;
  }
}

// Returns null (serve whole file), { start, end }, or 'unsatisfiable'.
export function parseRange(header, size) {
  if (typeof header !== 'string') return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === '' && match[2] === '')) return null;
  let start;
  let end;
  if (match[1] === '') {
    const suffix = Number(match[2]);
    if (suffix === 0) return 'unsatisfiable';
    start = Math.max(size - suffix, 0);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1);
  }
  if (start >= size || start > end) return 'unsatisfiable';
  return { start, end };
}

function sendStatus(res, status, message) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(message);
}

// Picks br or gzip from an Accept-Encoding header, honouring explicit q=0 refusals.
export function pickEncoding(header) {
  if (typeof header !== 'string') return null;
  const accepted = new Set();
  for (const part of header.toLowerCase().split(',')) {
    const [name, ...params] = part.trim().split(';').map((token) => token.trim());
    const quality = params.find((param) => param.startsWith('q='));
    if (quality && Number(quality.slice(2)) === 0) continue;
    accepted.add(name);
  }
  if (accepted.has('br')) return 'br';
  if (accepted.has('gzip')) return 'gzip';
  return null;
}

// Compressed bodies are cached per file version, so each asset is compressed once per edit.
function createCompressionCache() {
  const cache = new Map();
  return async function compressed(filePath, stats, encoding) {
    const key = `${filePath}|${stats.size}|${stats.mtimeMs}|${encoding}`;
    if (cache.has(key)) return cache.get(key);
    const data = await readFile(filePath);
    const body = encoding === 'br'
      ? await brotliAsync(data, { params: { [zlib.BROTLI_PARAM_QUALITY]: 11, [zlib.BROTLI_PARAM_SIZE_HINT]: data.length } })
      : await gzipAsync(data, { level: 9 });
    if (cache.size >= MAX_COMPRESSED_ENTRIES) cache.delete(cache.keys().next().value);
    cache.set(key, body);
    return body;
  };
}

async function sendFile(req, res, { filePath, stats }, compress) {
  const type = MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
  const compressible = COMPRESSIBLE_TYPES.some((prefix) => type.startsWith(prefix));
  const wantsRange = typeof req.headers.range === 'string';
  const encoding = compressible && stats.size >= MIN_COMPRESS_BYTES && !wantsRange ? pickEncoding(req.headers['accept-encoding']) : null;
  const tagSuffix = encoding ? `-${ENCODING_TAGS[encoding]}` : '';
  const etag = `W/"${stats.size.toString(16)}-${Math.floor(stats.mtimeMs).toString(16)}${tagSuffix}"`;
  const headers = {
    'Content-Type': type,
    'Cache-Control': REVALIDATE_TYPES.some((prefix) => type.startsWith(prefix)) ? 'no-cache' : ASSET_CACHE,
    ETag: etag,
    'Last-Modified': stats.mtime.toUTCString(),
    ...(compressible ? { Vary: 'Accept-Encoding' } : {}),
  };
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, headers);
    res.end();
    return;
  }
  if (encoding) {
    const body = await compress(filePath, stats, encoding);
    res.writeHead(200, { ...headers, 'Content-Encoding': encoding, 'Content-Length': body.length });
    res.end(req.method === 'HEAD' ? undefined : body);
    return;
  }
  sendIdentity(req, res, filePath, stats, { ...headers, 'Accept-Ranges': 'bytes' });
}

function sendIdentity(req, res, filePath, stats, headers) {
  const range = parseRange(req.headers.range, stats.size);
  if (range === 'unsatisfiable') {
    res.writeHead(416, { ...headers, 'Content-Range': `bytes */${stats.size}` });
    res.end();
    return;
  }
  const { start, end } = range ?? { start: 0, end: stats.size - 1 };
  const status = range ? 206 : 200;
  const rangeHeaders = range ? { 'Content-Range': `bytes ${start}-${end}/${stats.size}` } : {};
  res.writeHead(status, { ...headers, ...rangeHeaders, 'Content-Length': end - start + 1 });
  if (req.method === 'HEAD' || stats.size === 0) {
    res.end();
    return;
  }
  const stream = createReadStream(filePath, { start, end });
  stream.on('error', () => res.destroy());
  stream.pipe(res);
}

function safeLogPath(url) {
  return String(url).slice(0, 200).replace(/[^\x20-\x7e]/g, '?');
}

export function createSiteServer({
  root,
  rateLimit = DEFAULT_RATE_LIMIT,
  idleTimeoutMs = DEFAULT_IDLE_TIMEOUT_MS,
  maxConnections = DEFAULT_MAX_CONNECTIONS,
  log = console.log,
} = {}) {
  if (!root) throw new Error('createSiteServer: "root" is required');
  const webRoot = resolve(root);
  const isAllowed = createRateLimiter(rateLimit);
  const compress = createCompressionCache();

  async function handle(req, res) {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(name, value);
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      return sendStatus(res, 405, 'Method not allowed');
    }
    if (!isAllowed(clientKey(req))) {
      res.setHeader('Retry-After', String(Math.ceil(rateLimit.windowMs / 1000)));
      return sendStatus(res, 429, 'Too many requests');
    }
    const resolved = resolveRequestPath(webRoot, req.url ?? '/');
    if (resolved.status === 400) return sendStatus(res, 400, 'Bad request');
    if (resolved.status === 404) return sendStatus(res, 404, 'Not found');
    const file = await findFile(resolved.filePath);
    if (!file) return sendStatus(res, 404, 'Not found');
    return sendFile(req, res, file, compress);
  }

  const server = http.createServer((req, res) => {
    const started = Date.now();
    res.on('finish', () => {
      log(`${new Date().toISOString()} ${req.method} ${safeLogPath(req.url)} ${res.statusCode} ${Date.now() - started}ms`);
    });
    handle(req, res).catch((error) => {
      log(`ERROR ${safeLogPath(req.url)}: ${error.message}`);
      if (!res.headersSent) sendStatus(res, 500, 'Internal server error');
      else res.destroy();
    });
  });
  server.timeout = idleTimeoutMs; // idle sockets (including stalled slow readers) are destroyed
  server.keepAliveTimeout = Math.min(KEEP_ALIVE_TIMEOUT_MS, idleTimeoutMs);
  server.maxConnections = maxConnections;
  return server;
}

function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = process.env.SITE_ROOT ?? join(here, '..', 'site');
  const port = Number(process.env.PORT ?? 8080);
  const host = process.env.HOST ?? '127.0.0.1';
  const server = createSiteServer({ root });
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Stop the other process or set PORT to a free port.`);
    } else {
      console.error(`Server error: ${error.message}`);
    }
    process.exit(1);
  });
  server.listen(port, host, () => console.log(`Serving ${resolve(root)} at http://${host}:${port}`));
  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
