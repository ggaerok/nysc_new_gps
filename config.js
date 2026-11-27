/* ===== 설정 파일 (이 파일만 수정하면 됩니다) ===== */
window.GT_CONFIG = {
  // Supabase 프로젝트 > Settings > API 에서 확인 (anon/publishable 키는 공개되어도 되는 키입니다)
  SUPABASE_URL: 'https://frtkscwrzixkojsokpae.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZydGtzY3dyeml4a29qc29rcGFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU3MjMzMTIsImV4cCI6MjExMTI5OTMxMn0.Z454not-OoJleLlaPJcanE61owMsa2nkCU04YH5_qPE',

  SEND_INTERVAL_MS: 30000,   // 참가자 위치 전송 주기 (30초)
  MAX_PARTICIPANTS: 300,     // 운영자 화면이 받아주는 최대 인원(남용 방지)

  // 지도 기준점: 국립청소년우주센터 핀 = 네이버 캡처의 픽셀(473,465)
  // 네이버 지도 링크의 확대 수준 17.24 를 그대로 사용
  ANCHOR: { lat: 34.5330125, lng: 127.4682344, zoom: 17.24 },   // 국립청소년우주센터 (구글 8Q69GFM9+675)

  // 네이버 지도 캡처 이미지를 좌표에 맞춘 뒤 여기에 고정합니다.
  // (운영자 화면 [지도 보정] 버튼에서 계산된 JSON 을 그대로 붙여넣기)
  // 예: { url: 'map/field.jpg', bounds: [[남쪽위도, 서쪽경도], [북쪽위도, 동쪽경도]] }
  // 네이버 위성 캡처(1779×741, 줌 17.24, 1px≈0.833m) 를 위 기준점에 맞춰 고정한 값
  MAP_IMAGE: { url: 'map/field.jpg', bounds: [[34.5309469, 127.4639374], [34.5364924, 127.4800989]] },
  // 고해상도 보강 이미지(줌 약 19.4, 1px≈0.19m). 확대(줌 18.3 이상)할 때만 불러옵니다.
  MAP_HIRES_MINZOOM: 18.3,
  MAP_HIRES: [{"url": "map/hr_13.jpg", "bounds": [[34.5317226, 127.4724129], [34.5341292, 127.4773617]]}, {"url": "map/hr_01.jpg", "bounds": [[34.5323122, 127.4657884], [34.5340413, 127.4689814]]}, {"url": "map/hr_02.jpg", "bounds": [[34.5312813, 127.466129], [34.5329651, 127.4693628]]}, {"url": "map/hr_03.jpg", "bounds": [[34.5333736, 127.4678491], [34.5350791, 127.4713924]]}, {"url": "map/hr_04.jpg", "bounds": [[34.5325017, 127.4694113], [34.5342122, 127.472943]]}, {"url": "map/hr_05.jpg", "bounds": [[34.533954, 127.4695688], [34.5356513, 127.4730941]]}, {"url": "map/hr_06.jpg", "bounds": [[34.5338221, 127.4716395], [34.5355624, 127.4751767]]}, {"url": "map/hr_07.jpg", "bounds": [[34.5326173, 127.4709001], [34.534328, 127.4744355]]}, {"url": "map/hr_08.jpg", "bounds": [[34.533869, 127.4722604], [34.535583, 127.4757955]]}, {"url": "map/hr_09.jpg", "bounds": [[34.5333608, 127.4745527], [34.5350647, 127.4780822]]}, {"url": "map/hr_10.jpg", "bounds": [[34.5329191, 127.4762385], [34.5346511, 127.4797455]]}, {"url": "map/hr_11.jpg", "bounds": [[34.531795, 127.4763768], [34.5335037, 127.4799262]]}, {"url": "map/hr_12.jpg", "bounds": [[34.5318533, 127.4640132], [34.5336593, 127.4676276]]}, {"url": "map/hr_14.jpg", "bounds": [[34.5318846, 127.4675044], [34.5336669, 127.4711702]]}]
};
