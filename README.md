# 위치 관제 (운영자 PC / 참가자 모바일)

참가자 휴대폰은 GPS를 도·분·초로 실시간 표시하고, 화면의 **숫자 9개(약 40바이트)만 1초마다** 전송합니다.
중계 서버는 메모리에서 묶어(1초에 1통) 운영자에게 전달하고, 운영자 화면이 숫자를 좌표로 바꿔 지도에 표시합니다. 서버에 저장하지 않습니다.

## 구성 (Cloudflare 무료 플랜 한 곳)
- `public/` 정적 화면 (Workers Assets: 요청 무제한·무료)
- `src/room.js` 방 중계 로직, `src/worker.js` Worker + Durable Object(SQLite 백엔드, 무료 가능)
- `server.js` 같은 로직의 Node 버전 (로컬 테스트 / Render 예비용)

## 배포 (Cloudflare)
1. Workers & Pages → Create → GitHub 저장소 `nysc_new_gps` 가져오기, Worker 이름 `nysc-gps`, 배포 명령 `npx wrangler deploy`
2. Settings → Variables and Secrets → `OPERATOR_PASSWORD` (Secret, 12자 이상 권장)
3. `https://nysc-gps.<계정>.workers.dev` → 운영자 화면 → [방 열기] → 비밀번호 → QR

## 로컬 테스트
`npm i` → `OPERATOR_PASSWORD=test npm start` (http://localhost:8787, 데모는 `/?demo`) → `npm test` (150명 시뮬레이션)

## 사용량 (150명 · 1초 · 1시간 · 월 8회)
- 수신 54만 건/회 → Durable Object 요청 환산 약 2.7만 건/회 (무료 한도 10만 건/일)
- 연산 약 450 GB-s/회 (무료 한도 13,000 GB-s/일). 한도는 UTC 00:00(한국 09:00)에 초기화
- 운영자 화면 전송: 약 6KB/초. 필요하면 운영자 화면에서 전송 주기를 2초/5초로 낮춤

## 지도
`public/config.js` 의 MAP_IMAGE / MAP_HIRES (네이버 캡처 정합 이미지), 확대 시에만 고해상도 로드.
