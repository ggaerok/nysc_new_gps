/* Node 버전 중계 서버 (로컬 테스트 / Render 등 일반 호스팅용). 같은 src/room.js 를 사용. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { Room } from './src/room.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const PORT = process.env.PORT || 8787, PW = process.env.OPERATOR_PASSWORD || '';
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.css': 'text/css' };
const rooms = new Map();

const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html'; else if (!path.extname(p)) p += '.html';
  const f = path.normalize(path.join(root, p));
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory() || path.basename(f).startsWith('_')) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'public, max-age=3600', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow', 'Permissions-Policy': 'geolocation=(self)' });
  fs.createReadStream(f).pipe(res);
});
const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 });
srv.on('upgrade', (req, sock, head) => {
  const u = new URL(req.url, 'http://x'), m = u.pathname.match(/^\/ws\/([A-Za-z0-9_-]{16,32})$/);
  const o = req.headers.origin; let bad = !m;
  if (o) { try { if (new URL(o).host !== req.headers.host) bad = true; } catch (e) { bad = true; } }
  if (bad) { sock.destroy(); return; }
  wss.handleUpgrade(req, sock, head, ws => {
    let r = rooms.get(m[1]);
    if (!r) { r = new Room({ password: PW, onDone: () => rooms.delete(m[1]) }); rooms.set(m[1], r); }
    const h = r.connect({ send: s => { if (ws.readyState === 1) ws.send(s); }, close: (c, why) => { try { ws.close(c || 1000, why); } catch (e) {} } }, u.searchParams.get('role'));
    ws.on('message', d => h.message(d.toString()));
    ws.on('close', () => h.close()); ws.on('error', () => h.close());
  });
});
srv.listen(PORT, () => console.log('listening on :' + PORT + (PW ? '' : '  (OPERATOR_PASSWORD 미설정: 운영자 접속 불가)')));
