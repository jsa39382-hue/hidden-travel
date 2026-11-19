# 숨은여행

여행 갈 나라를 고르면 한 화면에서 공휴일·축제, 환율, 예상 경비, 잘 알려지지 않은 명소, 주변 숙소·식당, 지도와 날씨를 보여 주고,
원하는 여행 스타일을 적으면 추천 리스트와 일정표를 만들어 주는 웹사이트입니다.
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
| `npm run build:cities` | Wikidata에서 나라별 주요 도시를 받아 `src/data/cities.wikidata.json` 재생성 |
| `npm run build:festivals` | Wikidata에서 나라별 축제를 받아 `src/data/wikidata-festivals.json` 재생성 (몇 분 걸림) |

## 직접 고칠 수 있는 데이터

| 파일 | 내용 |
|---|---|
| `src/data/festivals.json` | 주요 축제 보충 (Wikidata에 없거나 부족한 나라) |
| `src/data/costs.json` | 나라별 하루 경비 [알뜰, 보통, 고급] (31개국 + 지역 평균, USD) |
| `src/data/cities.json` | 31개국 여행 도시 좌표와 물가 보정값(factor) |
| `src/data/regions.json` | 비용 지역 평균에 쓰는 나라별 지역 분류 |
| `src/data/holidays.json` | Nager.Date가 지원하지 않는 나라(태국·대만·말레이시아·인도·UAE)의 고정 공휴일 |

## 맞춤 일정은 어떻게 만들어지나

키 없이 쓸 수 있는 AI(LLM) API가 없어서 규칙 기반으로 만든다 (`src/lib/planner.ts`).

1. 자유롭게 쓴 글·선택 버튼을 키워드 사전으로 해석 (자연·사진·역사·맛집·카페·야경·숨은 곳·느긋하게 등)
2. 명소마다 취향·숨은 정도·거리로 점수를 매기고, 같은 종류가 몰리지 않게 고름
3. 중심에서의 방향으로 묶어 날짜에 나누고, 하루 안에서는 가까운 순서로 동선을 짬
4. 비 예보 날은 실내 명소로 바꾸고, 공휴일·그 지역 축제를 표시, 점심·저녁은 가까운 식당으로 채움

## 데이터 출처 (모두 키 불필요)

- 국가 정보: Wikidata (REST Countries v3.1은 폐기, v5는 API 키 필요 → 정적 파일로 생성)
- 국기: flagcdn.com
- 공휴일: Nager.Date
- 환율: Frankfurter, 백업 open.er-api.com
- 축제: Wikidata SPARQL (나라별 실시간 조회가 40초 이상 걸려 미리 받아 둔 파일 사용)
- 명소·숙소·식당: Overpass API(OpenStreetMap, 늦으면 공개 미러에 같이 요청)
  - Overpass가 2.5초 안에 답하지 않으면 대체 경로를 같이 시작: 명소는 Wikidata 위치 검색, 숙소·식당은 Nominatim
  - Overpass가 완전히 실패하면 15분 동안은 대체 경로만 사용 (일부 네트워크에서 Overpass가 응답하지 않음)
  - `?diag=1`로 열면 서버별 연결 진단 화면, Wikipedia 요약, Wikimedia Pageviews
- 지역 검색: Nominatim (OSM 서버 요청은 1초에 1번 이하로 줄 세움)
- 지도: Leaflet + OpenStreetMap 타일
- 날씨: Open-Meteo

## 진행 상황

- [x] 1. 프로젝트 생성, 기본 레이아웃, 나라 선택
- [x] 2. 환율 계산기
- [x] 3. 공휴일 캘린더, 축제
- [x] 4. 경비 계산기
- [x] 5. 숨은 명소 + 지도 (+ 도시 선택·도시별 물가 보정·주변 숙소)
- [x] 6. 날씨
- [x] 7. 캐시·에러 처리·모바일 점검
- [x] 추가: 주변 식당·카페, 명소·숙소 검색 속도 개선, 스타일 기반 맞춤 일정
- [x] 8. GitHub Pages 배포 (https://jsa39382-hue.github.io/hidden-travel/)
