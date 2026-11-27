/* Cloudflare Workers + Durable Object(SQLite 백엔드, 무료 플랜 가능). 정적 파일은 Workers Assets 가 직접 서빙(요청 수 무제한·무료). */
import { Room } from './room.js';

export class RoomDO {
  constructor(state, env) { this.room = new Room({ password: env.OPERATOR_PASSWORD }); }
  async fetch(req) {
    const role = new URL(req.url).searchParams.get('role') === 'op' ? 'op' : 'p';
    const [client, server] = Object.values(new WebSocketPair());
    server.accept();
    const h = this.room.connect({
      send: s => { try { server.send(s); } catch (e) {} },
      close: (c, r) => { try { server.close(c || 1000, r); } catch (e) {} }
    }, role);
    server.addEventListener('message', e => h.message(e.data));
    server.addEventListener('close', () => h.close());
    server.addEventListener('error', () => h.close());
    return new Response(null, { status: 101, webSocket: client });
  }
}

export default {
  async fetch(req, env) {
    const u = new URL(req.url), m = u.pathname.match(/^\/ws\/([A-Za-z0-9_-]{16,32})$/);
    if (!m) return env.ASSETS.fetch(req);
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('WebSocket only', { status: 426 });
    const o = req.headers.get('Origin');
    if (o) { let h = ''; try { h = new URL(o).host; } catch (e) {} if (h !== u.host) return new Response('Forbidden', { status: 403 }); }
    return env.ROOM.get(env.ROOM.idFromName(m[1])).fetch(req);
  }
};
