# 예약 페이지 DB 연동 실행 순서

## 1. 패키지 설치
```bash
npm install
```

## 2. 환경변수 파일 만들기
`.env.example` 을 복사해서 `.env` 로 바꾸고 DB 정보를 채운다.

예:
```bash
copy .env.example .env
```

## 3. PostgreSQL에 스키마/시드 적용
- `reservation_schema.sql`
- `reservation_seed.sql`

## 4. 서버 실행
```bash
npm run dev
```

기본 주소: `http://localhost:3000`

## 5. 프론트 페이지 열기
- `public/reservation.html`
- 또는 기존 홈페이지 프로젝트에 `public/script.js`, `public/reservation.html`, `public/styles.css` 변경분만 반영

## API 목록
- `GET /api/health`
- `GET /api/calendar?month=YYYY-MM`
- `GET /api/availability?date=YYYY-MM-DD`
- `POST /api/reservations`
