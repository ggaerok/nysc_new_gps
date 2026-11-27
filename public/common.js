/* 공통 유틸: 도분초 변환 */
(function (g) {
  // 십진 도 → 도·분·초 (화면 표시와 전송에 같은 숫자를 사용)
  function dms(v, pos, neg) {
    const hemi = v < 0 ? neg : pos; v = Math.abs(v);
    let d = Math.floor(v), mf = (v - d) * 60, m = Math.floor(mf), s = Math.round((mf - m) * 60 * 100) / 100;
    if (s >= 60) { s = 0; m++; } if (m >= 60) { m = 0; d++; }
    return { d, m, s, h: hemi, neg: v !== 0 && hemi === neg, text: fmt(d, m, s, hemi) };
  }
  function fmt(d, m, s, hemi) { return `${d}°${String(m).padStart(2, '0')}′${s.toFixed(2).padStart(5, '0')}″ ${hemi}`; }
  // 도·분·초 숫자 → 십진 도 (운영자 쪽 변환)
  const toDec = (d, m, s, neg) => (d + m / 60 + s / 3600) * (neg ? -1 : 1);
  const dmsLat = v => dms(v, 'N', 'S'), dmsLng = v => dms(v, 'E', 'W');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const validPos = (la, lo) => Number.isFinite(la) && Number.isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180;
  const fmtTime = t => new Date(t).toLocaleTimeString('ko-KR', { hour12: false });
  const rand = n => crypto.getRandomValues(new Uint8Array(n));
  const rid = n => { let s = ''; rand(n).forEach(b => s += String.fromCharCode(b)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const wsUrl = (room, role) => ((window.GT_CONFIG && GT_CONFIG.WS_BASE) || (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host) + '/ws/' + room + (role ? '?role=' + role : '');
  g.GT = { dms, fmt, toDec, dmsLat, dmsLng, esc, validPos, fmtTime, rid, wsUrl };
})(window);
