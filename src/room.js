/*
 * 방(Room) 중계 로직 — Cloudflare Durable Object 와 Node(server.js) 가 함께 사용.
 * 위치는 메모리에서만 전달하며 디스크/DB 에 저장하지 않는다. 방이 닫히면 모두 사라진다.
 *
 * 참가자 → 서버 : {"t":"hi","id":"..","n":"이름"} 1회, 이후 숫자 배열 [h,위도d,m,s,경도d,m,s,정확도,측정경과초]
 * 서버 → 운영자 : {"t":"s","p":[[id,경과ms,...숫자배열]]} 를 1초에 한 번 묶어서 전송 (참가자 수와 무관하게 1통/초)
 */
const IVS = [1000, 2000, 5000];
const ID_RE = /^[A-Za-z0-9_-]{6,24}$/;
const IDLE_NO_OP_MS = 10 * 60e3;   // 운영자가 10분간 없으면 방 자동 종료
const OPEN_TIMEOUT_MS = 60e3;      // 만들어 놓고 60초 안에 운영자 인증이 없으면 폐기

const rnd = n => { const b = crypto.getRandomValues(new Uint8Array(n)); let s = ''; for (const x of b) s += String.fromCharCode(x); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
function safeEq(a, b) { a = String(a); b = String(b); let r = a.length ^ b.length; for (let i = 0; i < Math.max(a.length, b.length); i++) r |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0); return r === 0; }
const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const num = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
function validPos(m) {
  return Array.isArray(m) && m.length === 9 && int(m[0], 0, 3) &&
    int(m[1], 0, 90) && int(m[2], 0, 59) && num(m[3], 0, 59.9999) &&
    int(m[4], 0, 180) && int(m[5], 0, 59) && num(m[6], 0, 59.9999) &&
    num(m[7], 0, 99999) && num(m[8], 0, 9999);
}

export class Room {
  constructor(opts = {}) {
    this.pw = String(opts.password || '');
    this.max = opts.max || 300;
    this.onDone = opts.onDone || (() => {});
    this.state = 'new';           // new → open → closed
    this.op = null; this.tok = null; this.exp = 0; this.iv = 1000;
    this.parts = new Map();       // id → {id,n,pos,rx,c,bye}
    this.dirty = new Set();
    this.flushT = null; this.expT = null; this.idleT = setTimeout(() => this.close('unused'), OPEN_TIMEOUT_MS);
  }

  connect(sock, role) {
    const c = { sock, role: role === 'op' ? 'op' : 'p', id: null, authed: false, last: 0 };
    if (c.role === 'p' && this.state !== 'open') { this._send(c, { t: 'end', why: 'nr' }); sock.close(1000, 'no room'); return { message() {}, close() {} }; }
    return { message: s => this._msg(c, s), close: () => this._close(c) };
  }

  _send(c, o) { try { c.sock.send(typeof o === 'string' ? o : JSON.stringify(o)); } catch (e) {} }
  _toOp(o) { if (this.op) this._send(this.op, o); }

  _msg(c, s) {
    if (typeof s !== 'string' || s.length > 400) return;
    let m; try { m = JSON.parse(s); } catch (e) { return; }
    if (c.role === 'op') this._opMsg(c, m); else this._pMsg(c, m);
  }

  /* ---------- 참가자 ---------- */
  _pMsg(c, m) {
    if (this.state !== 'open') return;
    if (Array.isArray(m)) {
      if (!c.id) return;
      const now = Date.now(); if (now - c.last < 300) return; c.last = now;
      const p = this.parts.get(c.id); if (!p || p.c !== c || !validPos(m)) return;
      p.pos = m; p.rx = now; this.dirty.add(c.id); this._sched(); return;
    }
    if (!m || typeof m !== 'object') return;
    if (m.t === 'hi') {
      if (c.id || typeof m.id !== 'string' || !ID_RE.test(m.id)) return;
      const n = (typeof m.n === 'string' ? m.n : '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 12) || ('참가자-' + m.id.slice(-3));
      let p = this.parts.get(m.id);
      if (!p && this.parts.size >= this.max) { this._send(c, { t: 'end', why: 'full' }); c.sock.close(1000, 'full'); return; }
      if (p && p.c && p.c !== c) { const o = p.c; o.id = null; try { o.sock.close(1000, 'replaced'); } catch (e) {} }
      if (!p) { p = { id: m.id, n, pos: null, rx: 0, c, bye: false }; this.parts.set(m.id, p); }
      p.n = n; p.c = c; p.bye = false; c.id = m.id;
      this._send(c, { t: 'cfg', iv: this.iv });
      this._toOp({ t: 'j', id: p.id, n: p.n });
      if (p.pos) { this.dirty.add(p.id); this._sched(); }
    } else if (m.t === 'bye' && c.id) {
      const p = this.parts.get(c.id);
      if (p && p.c === c) { this.parts.delete(c.id); this.dirty.delete(c.id); this._toOp({ t: 'l', id: c.id, bye: 1 }); }
      c.id = null; try { c.sock.close(1000, 'bye'); } catch (e) {}
    }
  }

  /* ---------- 운영자 ---------- */
  _opMsg(c, m) {
    if (!m || typeof m !== 'object') return;
    if (!c.authed) {
      let ok = false;
      if (m.t === 'open' && this.pw && typeof m.pw === 'string' && safeEq(m.pw, this.pw) && this.state !== 'closed') {
        if (this.state === 'new') {
          const h = Math.min(Math.max(Math.round(+m.dur) || 2, 1), 8);
          this.exp = Date.now() + h * 3600e3; this.tok = rnd(18); this.state = 'open';
          clearTimeout(this.expT); this.expT = setTimeout(() => this.close('exp'), h * 3600e3);
        }
        ok = true;
      } else if (m.t === 'resume' && this.state === 'open' && typeof m.tok === 'string' && safeEq(m.tok, this.tok)) ok = true;
      if (!ok) { this._send(c, { t: 'err', e: this.state === 'closed' ? 'closed' : 'auth' }); try { c.sock.close(1000, 'auth'); } catch (e) {} return; }
      if (this.op && this.op !== c) { this._send(this.op, { t: 'err', e: 'taken' }); const o = this.op; this.op = null; try { o.sock.close(1000, 'taken'); } catch (e) {} }
      c.authed = true; this.op = c; clearTimeout(this.idleT); this.idleT = null;
      this._send(c, { t: 'ok', tok: this.tok, exp: this.exp, iv: this.iv });
      this._send(c, { t: 'full', p: [...this.parts.values()].map(p => ({ id: p.id, n: p.n, on: p.c ? 1 : 0, age: p.pos ? Date.now() - p.rx : -1, pos: p.pos })) });
      return;
    }
    if (m.t === 'close') this.close('op');
    else if (m.t === 'iv' && IVS.includes(m.iv)) {
      this.iv = m.iv;
      for (const p of this.parts.values()) if (p.c) this._send(p.c, { t: 'cfg', iv: this.iv });
    }
  }

  /* ---------- 묶음 전송(1초 1통) ---------- */
  _sched() { if (!this.flushT) this.flushT = setTimeout(() => { this.flushT = null; this._flush(); }, 1000); }
  _flush() {
    if (!this.op || !this.dirty.size) { if (!this.op) this.dirty.clear(); return; }
    const now = Date.now(), out = [];
    for (const id of this.dirty) { const p = this.parts.get(id); if (p && p.pos) out.push([id, now - p.rx, ...p.pos]); }
    this.dirty.clear();
    if (out.length) this._send(this.op, { t: 's', p: out });
  }

  _close(c) {
    if (c.role === 'op') {
      if (this.op === c) {
        this.op = null;
        if (this.state === 'open') { clearTimeout(this.idleT); this.idleT = setTimeout(() => this.close('idle'), IDLE_NO_OP_MS); }
      }
      return;
    }
    if (!c.id) return;
    const p = this.parts.get(c.id);
    if (p && p.c === c) { p.c = null; this._toOp({ t: 'l', id: c.id, bye: 0 }); }
  }

  close(why) {
    if (this.state === 'closed') return;
    this.state = 'closed';
    clearTimeout(this.flushT); clearTimeout(this.expT); clearTimeout(this.idleT);
    for (const p of this.parts.values()) if (p.c) { this._send(p.c, { t: 'end', why }); try { p.c.sock.close(1000, 'end'); } catch (e) {} }
    if (this.op) { this._send(this.op, { t: 'end', why }); try { this.op.sock.close(1000, 'end'); } catch (e) {} }
    this.parts.clear(); this.dirty.clear(); this.op = null; this.tok = null;   // 메모리의 위치 정보 삭제
    this.onDone();
  }
}
