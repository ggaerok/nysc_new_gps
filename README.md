# 위치 관제 (운영자 PC / 참가자 모바일)

정적 파일 4개 + Supabase Realtime Broadcast. DB 테이블 없음 → 서버에 위치가 저장되지 않습니다.

## 배포
1. Supabase: Settings > API 의 URL / anon 키를 `config.js` 에 입력. (Realtime 은 기본 활성, 테이블 생성 불필요)
2. 이 폴더를 Vercel 에 그대로 배포 (빌드 설정 없음).
3. 운영자: `https://도메인/` → [방 열기] → QR 표시. 참가자: QR 스캔.
   - 키 미입력 상태에서는 가상 참가자 데모로 동작합니다. 

## 지도
배경은 Esri 위성지도(기본) / OpenStreetMap 입니다. 첫 화면 위치는 `config.js` 의 `ANCHOR`.

## 보안·사용량 설계
- 방 주소(#해시)에 방ID·운영자 공개키·그룹키·만료시각 포함 → 해시는 서버/CDN 에 전송되지 않음
- 위치는 참가자별 ECDH+AES-GCM 으로 암호화 → Supabase 는 암호문만 중계
- 참가자는 구독 없이 HTTP 로 전송만 함 (수신 egress 0), 운영자만 구독
- JS/CSS 는 24시간 캐시, 외부 라이브러리는 jsDelivr 사용 → Vercel 전송량 최소
