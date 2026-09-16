// ---------------------------------------------------------------------------
// server.mjs — JEE Planner static server + file-based data persistence
//
// Serves the built app (dist/) on http://localhost:3000 and auto-saves ALL
// planner data (completions, settings, theme) to a JSON file on disk so the
// data survives browser wipes / switches.
//
// Data file: /home/anurag/jee-planner/data/planner-data.json
//
// Run:  node server.mjs
// ---------------------------------------------------------------------------
import { createServer } from 'node:http';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, 'dist');
const DATA_DIR = '/home/anurag/jee-planner/data'; // <-- user-requested location
const DATA_FILE = join(DATA_DIR, 'planner-data.json');
const PORT = process.env.PORT || 1601;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

await mkdir(DATA_DIR, { recursive: true });

async function loadData() {
  try {
    const raw = await readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function saveData(payload) {
  const tmp = DATA_FILE + '.tmp';
  await writeFile(tmp, JSON.stringify(payload, null, 2), 'utf8');
  await rename(tmp, DATA_FILE);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);

  // ---- API ----
  if (req.method === 'GET' && pathname === '/api/load') {
    const data = await loadData();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
    return;
  }
  if (req.method === 'POST' && pathname === '/api/save') {
    let body = '';
    for await (const chunk of req) body += chunk;
    try {
      const payload = JSON.parse(body);
      if (!payload || payload.app !== 'jee-planner') throw new Error('invalid payload');
      await saveData(payload);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, file: DATA_FILE }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: String(err) }));
    }
    return;
  }
  if (req.method === 'GET' && pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, dataFile: DATA_FILE }));
    return;
  }

  // ---- Static files (SPA fallback to index.html) ----
  let filePath = join(DIST, pathname === '/' ? 'index.html' : pathname);
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  // Cache policy — "latest wala hamesha mile":
  //   index.html + sw.js → NO cache (har launch par fresh check)
  //   hashed /assets/*   → browser cache OK (filename badalne par naya hi milega)
  const isHtml = pathname === '/' || pathname === '/index.html' || !extname(pathname);
  const isSW = pathname === '/sw.js';
  const cacheHeader = isHtml || isSW
    ? (isSW ? 'no-store' : 'no-cache')
    : 'public, max-age=31536000, immutable';
  try {
    const st = await stat(filePath);
    if (st.isDirectory()) filePath = join(filePath, 'index.html');
    const ext = extname(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': cacheHeader,
    });
    createReadStream(filePath).pipe(res);
  } catch {
    try {
      const idx = join(DIST, 'index.html');
      await stat(idx);
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      createReadStream(idx).pipe(res);
    } catch {
      res.writeHead(500);
      res.end('Build not found');
    }
  }
});

server.listen(PORT, () => {
  console.log(`JEE Planner → http://localhost:${PORT}`);
  console.log(`Data file  → ${DATA_FILE}`);
});