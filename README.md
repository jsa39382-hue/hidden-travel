# 숨은여행

여행 갈 나라를 고르면 한 화면에서 공휴일·축제, 환율, 예상 경비, 잘 알려지지 않은 명소, 지도와 날씨를 보여 주는 웹사이트입니다.
API 키가 필요한 서비스는 쓰지 않고, 백엔드 없이 프론트엔드만으로 동작합니다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:5173 을 엽니다.

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 타입 검사 + 배포용 빌드 (`dist/`) |
| `npm run build:countries` | Wikidata에서 국가 목록을 받아 `src/data/countries.json` 재생성 |
| `npm run build:festivals` | Wikidata에서 나라별 축제를 받아 `src/data/wikidata-festivals.json` 재생성 (몇 분 걸림) |

## 직접 고칠 수 있는 데이터

| 파일 | 내용 |
|---|---|
| `src/data/festivals.json` | 주요 축제 보충 (Wikidata에 없거나 부족한 나라) |
| `src/data/holidays.json` | Nager.Date가 지원하지 않는 나라(태국·대만·말레이시아·인도·UAE)의 고정 공휴일 |

## 데이터 출처 (모두 키 불필요)

- 국가 정보: Wikidata (REST Countries v3.1은 폐기, v5는 API 키 필요 → 정적 파일로 생성)
- 국기: flagcdn.com
- 공휴일: Nager.Date
- 환율: Frankfurter, 백업 open.er-api.com
- 축제: Wikidata SPARQL (나라별 실시간 조회가 40초 이상 걸려 미리 받아 둔 파일 사용)
- 명소: Overpass API(OpenStreetMap), Wikipedia, Wikimedia Pageviews
- 날씨: Open-Meteo

## 진행 상황

- [x] 1. 프로젝트 생성, 기본 레이아웃, 나라 선택
- [x] 2. 환율 계산기
- [x] 3. 공휴일 캘린더, 축제
- [ ] 4. 경비 계산기
- [ ] 5. 숨은 명소 + 지도
- [ ] 6. 날씨
- [ ] 7. 캐시·에러 처리·모바일 점검
- [x] 8. GitHub Pages 배포 (https://jsa39382-hue.github.io/hidden-travel/)
