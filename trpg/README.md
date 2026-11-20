# 잿빛 왕관

브라우저에서 돌아가는 3인칭 3D 판타지 TRPG입니다. API 키나 서버 없이, 미리 써 둔 분기형 이야기로 진행됩니다.

- 이야기 노드 288개, 선택지 320여 개, 엔딩 10종
- 1막 가시골 → 2막 숲·광산·은빛성·안개 늪(순서 자유) → 3막 검은 탑
- d20 판정(능력치·동료·장비 보정), 턴제 전투, 동료 3명(브란·핀·세렌), 세력 평판 4종
- 3D 장면은 외부 에셋 없이 three.js 기본 도형으로 절차 생성

## 실행

정적 서버로 이 폴더를 열면 됩니다 (three.js는 CDN에서 불러옴).

```bash
npx serve trpg        # 또는: cd trpg && python3 -m http.server
```

## 도구

- `node trpg/tools/validate.mjs` : 끊어진 연결, 없는 인물·아이템·장소, 도달 불가능한 노드 검사
- `node trpg/tools/build-artifact.mjs <출력.html>` : 한 장짜리 HTML로 묶기

## 구조

- `src/story/*.js` 이야기 데이터 (막별)
- `src/engine.js` 조건·효과·판정·저장, `src/combat.js` 전투
- `src/world.js` 렌더링·카메라·이동, `src/scenes.js` 장소 생성, `src/models.js` 캐릭터 모델
- `src/main.js` 화면과 진행
