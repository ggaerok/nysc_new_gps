/* 공통 유틸: 암호화(E2E), 도분초 변환 */
(function (g) {
  const enc = new TextEncoder(), dec = new TextDecoder();

  function b64u(buf) {
    const b = new Uint8Array(buf); let s = '';
    for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function unb64u(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
    const bin = atob(s), b = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    return b;
  }
  const rand = n => crypto.getRandomValues(new Uint8Array(n));
  const ECDH = { name: 'ECDH', namedCurve: 'P-256' };

  async function newKeyPair() {
    const kp = await crypto.subtle.generateKey(ECDH, true, ['deriveKey']);
    return { priv: kp.privateKey, pub: b64u(await crypto.subtle.exportKey('raw', kp.publicKey)) };
  }
  async function exportPriv(k) { return crypto.subtle.exportKey('jwk', k); }
  async function importPriv(jwk) { return crypto.subtle.importKey('jwk', jwk, ECDH, true, ['deriveKey']); }

  // 운영자 공개키 + 참가자 개인키 → 참가자별 전용 AES 키
  async function deriveAes(priv, pubB64) {
    const pub = await crypto.subtle.importKey('raw', unb64u(pubB64), ECDH, false, []);
    return crypto.subtle.deriveKey({ name: 'ECDH', public: pub }, priv,
      { name: 'AES-GCM', length: 128 }, false, ['encrypt', 'decrypt']);
  }
  async function groupKey(kB64) {
    return crypto.subtle.importKey('raw', unb64u(kB64), 'AES-GCM', false, ['encrypt', 'decrypt']);
  }
  async function seal(key, obj) {
    const iv = rand(12);
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj))));
    const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12);
    return b64u(out);
  }
  async function open(key, s) {
    const b = unb64u(s);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.slice(0, 12) }, key, b.slice(12));
    return JSON.parse(dec.decode(pt));
  }

  // 십진 도 → 도·분·초
  function dms(v, pos, neg) {
    const hemi = v < 0 ? neg : pos; v = Math.abs(v);
    let d = Math.floor(v), mf = (v - d) * 60, m = Math.floor(mf), s = Math.round((mf - m) * 60 * 100) / 100;
    if (s >= 60) { s = 0; m++; } if (m >= 60) { m = 0; d++; }
    return { d, m, s: s.toFixed(2), h: hemi, text: `${d}°${String(m).padStart(2, '0')}′${s.toFixed(2).padStart(5, '0')}″ ${hemi}` };
  }
  const dmsLat = v => dms(v, 'N', 'S'), dmsLng = v => dms(v, 'E', 'W');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const validPos = (la, lo) => Number.isFinite(la) && Number.isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180;
  const fmtTime = t => new Date(t).toLocaleTimeString('ko-KR', { hour12: false });

  g.GT = { b64u, unb64u, rand, newKeyPair, exportPriv, importPriv, deriveAes, groupKey, seal, open, dms, dmsLat, dmsLng, esc, validPos, fmtTime };
})(window);
