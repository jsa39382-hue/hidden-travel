// 시연 모드 데이터 만들기 (Playwright 필요, 개발 서버를 켠 뒤 실행): node scripts/build-demo.cjs
// 도쿄·파리를 모든 탭에서 열어 본 뒤 API 저장본(hidden-travel:v1:*)을 모아 출력한다. 결과를 src/data/demo-cache.json의 entries로 넣는다.
// 시연용 데이터 담기: 도쿄·파리를 모든 탭에서 열어 본 뒤 API 저장본(hidden-travel:v1:*)을 모은다
const { chromium, devices } = require('playwright'); const fs = require('fs');
const TRIPS = [
  'c=JP&from=2026-12-10&to=2026-12-14&place=%EB%8F%84%EC%BF%84&lat=35.6812&lng=139.7671&f=1.15',
  'c=FR&from=2026-12-10&to=2026-12-14&place=%ED%8C%8C%EB%A6%AC&lat=48.8566&lng=2.3522&f=1.2',
];
const TABS = ['home', 'plan', 'spots', 'budget', 'exchange', 'weather', 'safety', 'calendar', 'transport', 'tips', 'retro', 'settle'];
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage();
  for (const q of TRIPS) for (const t of TABS) {
    await p.goto(`http://localhost:5173/?${q}#${t}`); await p.waitForTimeout(t === 'spots' || t === 'plan' ? 60000 : 5000);
    if (t === 'spots') { // 숙소·식당 탭도
      const btn = p.getByRole('button', { name: /숙소·식당/ }).first(); if (await btn.count()) { await btn.click(); await p.waitForTimeout(15000); }
    }
    process.stdout.write(t[0]);
  }
  await p.goto('http://localhost:5173/'); await p.waitForTimeout(6000); // 첫 화면(지구본·예산으로 찾기)
  const dump = await p.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith('hidden-travel:v1:')).map(k => [k.slice('hidden-travel:v1:'.length), JSON.parse(localStorage.getItem(k)).data])));
  fs.writeFileSync(process.argv[2] ?? 'demo-dump.json', JSON.stringify(dump));
  console.log('\nkeys', Object.keys(dump).length);
  for (const [k, v] of Object.entries(dump)) console.log(String(JSON.stringify(v).length).padStart(8), k.slice(0, 90));
  await b.close();
})();
