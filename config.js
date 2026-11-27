/* ===== 설정 파일 (이 파일만 수정하면 됩니다) ===== */
window.GT_CONFIG = {
  // Supabase 프로젝트 > Settings > API 에서 확인 (anon/publishable 키는 공개되어도 되는 키입니다)
  SUPABASE_URL: 'https://frtkscwrzixkojsokpae.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZydGtzY3dyeml4a29qc29rcGFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU3MjMzMTIsImV4cCI6MjExMTI5OTMxMn0.Z454not-OoJleLlaPJcanE61owMsa2nkCU04YH5_qPE',

  SEND_INTERVAL_MS: 30000,   // 참가자 위치 전송 주기 (30초)
  MAX_PARTICIPANTS: 300,     // 운영자 화면이 받아주는 최대 인원(남용 방지)

  // 지도 첫 화면 위치: 국립청소년우주센터(구글 플러스코드 8Q69GFM9+675), 확대 17.24
  ANCHOR: { lat: 34.5330125, lng: 127.4682344, zoom: 17.24 },   // 국립청소년우주센터 (구글 8Q69GFM9+675)

};
