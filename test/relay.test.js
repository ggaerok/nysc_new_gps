/* 로컬 통합 테스트: node server.js 를 띄워 운영자 1 + 참가자 150(1초 간격) 시뮬레이션 */
import { spawn } from 'node:child_process';
import WebSocket from 'ws';
import assert from 'node:assert';

const EXT = process.env.EXTERNAL_PORT, PORT = EXT || 18787, PW = 'test-password-123', ROOM = 'abcDEF0123456789xyz';
const srv = EXT ? { kill() {} } : spawn('node', ['server.js'], { env: { ...process.env, PORT, OPERATOR_PASSWORD: PW }, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));
const url = role => `ws://127.0.0.1:${PORT}/ws/${ROOM}?role=${role}`;
const open = u => new Promise((res, rej) => { const w = new WebSocket(u); w.on('open', () => res(w)); w.on('error', rej); });
const next = (w, f) => new Promise(res => { const h = d => { const m = JSON.parse(d.toString()); if (f(m)) { w.off('message', h); res(m); } }; w.on('message', h); });
let fail = 0; const ok = (c, t) => { console.log((c ? 'PASS ' : 'FAIL ') + t); if (!c) fail++; };

try {
  // 1) 방이 열리기 전 참가자는 거절
  const early = await open(url('p')); const e0 = await next(early, m => m.t === 'end'); ok(e0.why === 'nr', '열리지 않은 방: 참가자 거절');
  // 2) 잘못된 비밀번호
  const bad = await open(url('op')); bad.send(JSON.stringify({ t: 'open', pw: 'x', dur: 1 })); ok((await next(bad, m => m.t === 'err')).e === 'auth', '잘못된 비밀번호 거절');
  // 3) 운영자 인증
  const op = await open(url('op')); op.send(JSON.stringify({ t: 'open', pw: PW, dur: 1 })); const okm = await next(op, m => m.t === 'ok'); ok(!!okm.tok, '운영자 인증, 토큰 발급');
  let snaps = 0, entries = 0, bytes = 0; const seen = new Set(); let sample = null;
  op.on('message', d => { const m = JSON.parse(d.toString()); if (m.t === 's') { snaps++; entries += m.p.length; bytes += d.length; m.p.forEach(e => { seen.add(e[0]); sample = e; }); } });
  // 4) 참가자 150명
  const N = 150, ps = [];
  for (let i = 0; i < N; i++) {
    const w = await open(url('p')); const id = 'pid' + String(i).padStart(4, '0') + 'xx';
    w.send(JSON.stringify({ t: 'hi', id, n: '참가자' + i })); await next(w, m => m.t === 'cfg'); ps.push({ w, id });
  }
  ok(true, `참가자 ${N}명 접속`);
  // 5) 1초 간격 6회 전송
  const T0 = Date.now();
  for (let k = 0; k < 6; k++) { ps.forEach((p, i) => p.w.send(JSON.stringify([0, 34, 31, 58.58 + (i % 10) / 100, 127, 28, 5.64, 8, 0]))); await new Promise(r => setTimeout(r, 1000)); }
  await new Promise(r => setTimeout(r, 1200));
  ok(seen.size === N, `운영자가 ${seen.size}/${N}명 수신`);
  ok(snaps <= 8 && snaps >= 5, `묶음 전송 ${snaps}통 (6초 동안, 참가자 수와 무관하게 약 1통/초)`);
  console.log(`  평균 묶음 크기 ${(bytes / snaps / 1024).toFixed(1)}KB, 초당 ${(bytes / ((Date.now() - T0) / 1000) / 1024).toFixed(1)}KB, 샘플`, JSON.stringify(sample));
  // 6) 잘못된 값 무시
  ps[0].w.send(JSON.stringify([0, 999, 0, 0, 0, 0, 0, 0, 0])); ps[0].w.send('garbage');
  // 7) 전송 주기 변경
  const cfgP = next(ps[1].w, m => m.t === 'cfg'); op.send(JSON.stringify({ t: 'iv', iv: 5000 })); ok((await cfgP).iv === 5000, '전송 주기 변경이 참가자에게 전달');
  // 8) 운영자 재접속(토큰) 시 전체 상태 복구
  op.close(); await new Promise(r => setTimeout(r, 200));
  const op2 = await open(url('op')); op2.send(JSON.stringify({ t: 'resume', tok: okm.tok })); const full = await next(op2, m => m.t === 'full');
  ok(full.p.length === N && full.p.filter(x => x.pos).length === N, `재접속: 전체 ${full.p.length}명 위치 복구`);
  // 9) 참가자 종료(bye)
  const lp = next(op2, m => m.t === 'l'); ps[2].w.send(JSON.stringify({ t: 'bye' })); ok((await lp).bye === 1, '참가자 종료 알림');
  // 10) 방 종료 → 모든 참가자 end, 이후 재사용 불가
  const ends = Promise.all(ps.slice(3, 10).map(p => next(p.w, m => m.t === 'end'))); op2.send(JSON.stringify({ t: 'close' })); await ends; ok(true, '방 종료: 참가자 연결 종료');
  const late = await open(url('op')); late.send(JSON.stringify({ t: 'resume', tok: okm.tok })); const le = await next(late, m => m.t === 'err'); ok(!!le, '종료된 방은 토큰으로 재진입 불가');
} catch (e) { console.error(e); fail++; }
srv.kill(); console.log(fail ? `\n${fail}건 실패` : '\n모두 통과'); process.exit(fail ? 1 : 0);
