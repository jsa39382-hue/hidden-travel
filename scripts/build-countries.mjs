// REST Countries v3.1은 폐기되었고 v5는 API 키가 필요하므로,
// 키가 필요 없는 Wikidata SPARQL에서 국가 목록을 만들어 src/data/countries.json에 저장한다.
// 실행: npm run build:countries
import { writeFile } from 'node:fs/promises';

const QUERY = `
SELECT ?c ?iso ?ko ?en ?capKo ?capEn ?capCoord ?coord ?cur ?curKo ?pop WHERE {
  ?c wdt:P297 ?iso .
  FILTER NOT EXISTS { ?c wdt:P576 [] }
  OPTIONAL { ?c rdfs:label ?ko FILTER(LANG(?ko)="ko") }
  OPTIONAL { ?c rdfs:label ?en FILTER(LANG(?en)="en") }
  OPTIONAL { ?c wdt:P1082 ?pop }
  OPTIONAL { ?c wdt:P625 ?coord }
  OPTIONAL {
    ?c p:P36 ?capSt . ?capSt ps:P36 ?cap .
    FILTER NOT EXISTS { ?capSt pq:P582 [] }
    OPTIONAL { ?cap rdfs:label ?capKo FILTER(LANG(?capKo)="ko") }
    OPTIONAL { ?cap rdfs:label ?capEn FILTER(LANG(?capEn)="en") }
    OPTIONAL { ?cap wdt:P625 ?capCoord }
  }
  OPTIONAL {
    ?c p:P38 ?curSt . ?curSt ps:P38 ?curItem . ?curItem wdt:P498 ?cur .
    FILTER NOT EXISTS { ?curSt pq:P582 [] }
    OPTIONAL { ?curItem rdfs:label ?curKo FILTER(LANG(?curKo)="ko") }
  }
}`;

// Wikidata 정보가 부정확하거나 여러 개인 경우 보정
const EXCLUDE = new Set(['AQ', 'BV', 'HM', 'CP', 'DG', 'AC', 'TA', 'CQ', 'UM', 'EA', 'IC']);
const CURRENCY_OVERRIDE = { FO: 'DKK', CU: 'CUP', ZW: 'ZWG', PS: 'ILS', SV: 'USD', EC: 'USD', PA: 'PAB', BT: 'BTN', LS: 'LSL', NA: 'NAD', SZ: 'SZL', KH: 'KHR', XK: 'EUR', ME: 'EUR', TW: 'TWD', HK: 'HKD', MO: 'MOP' };
const NAME_OVERRIDE = { KR: '대한민국', KP: '북한', TW: '대만', CN: '중국', US: '미국', GB: '영국' };

const point = (wkt) => {
  const m = /Point\(([-\d.eE]+) ([-\d.eE]+)\)/.exec(wkt ?? '');
  return m ? [Number(Number(m[2]).toFixed(4)), Number(Number(m[1]).toFixed(4))] : undefined;
};
const cleanCity = (s) => s?.replace(/(특별시|광역시|특별자치시|도쿄도)$/, (x) => (x === '도쿄도' ? '도쿄' : '')) ;

const res = await fetch('https://query.wikidata.org/sparql', {
  method: 'POST',
  body: new URLSearchParams({ query: QUERY }),
  headers: { Accept: 'application/sparql-results+json', 'User-Agent': 'hidden-travel-build/0.1 (country list generator)' },
});
if (!res.ok) throw new Error('Wikidata 요청 실패: ' + res.status);
const rows = (await res.json()).results.bindings;

// 통화 코드 유효성 확인용(키 없는 환율 API)
const rates = await fetch('https://open.er-api.com/v6/latest/KRW').then((r) => r.json()).then((j) => j.rates).catch(() => ({}));

const byIso = new Map();
for (const b of rows) {
  const v = (k) => b[k]?.value;
  const iso = v('iso');
  if (!/^[A-Z]{2}$/.test(iso)) continue;
  const item = v('c');
  const pop = Number(v('pop') ?? 0);
  let e = byIso.get(iso);
  if (!e || (e.item !== item && (pop > e.pop || (!e.ko && v('ko'))))) {
    e = { item, iso, ko: v('ko'), en: v('en'), pop, coord: point(v('coord')), caps: new Map(), curs: new Map() };
    byIso.set(iso, e);
  }
  if (e.item !== item) continue;
  if (pop > e.pop) e.pop = pop;
  if (v('capEn') || v('capKo')) e.caps.set(v('capEn') ?? v('capKo'), { ko: cleanCity(v('capKo')), en: v('capEn'), coord: point(v('capCoord')) });
  if (v('cur')) e.curs.set(v('cur'), v('curKo'));
}

const countries = [...byIso.values()]
  .map((e) => {
    const curCodes = [...e.curs.keys()];
    let cur = CURRENCY_OVERRIDE[e.iso] ?? curCodes.find((c) => c in rates) ?? curCodes[0];
    if (cur && Object.keys(rates).length && !(cur in rates)) cur = curCodes.find((c) => c in rates) ?? cur;
    const cap = [...e.caps.values()].find((c) => c.coord) ?? [...e.caps.values()][0];
    return {
      code: e.iso,
      nameKo: NAME_OVERRIDE[e.iso] ?? e.ko ?? e.en ?? e.iso,
      nameEn: e.en ?? e.iso,
      capitalKo: cap?.ko ?? cap?.en ?? null,
      capitalEn: cap?.en ?? null,
      latlng: cap?.coord ?? e.coord ?? null,
      countryLatlng: e.coord ?? cap?.coord ?? null,
      currency: cur ?? null,
      currencyNameKo: (cur && e.curs.get(cur)) || null,
    };
  })
  .filter((c) => c.latlng && c.currency && !EXCLUDE.has(c.code))
  .sort((a, b) => a.nameKo.localeCompare(b.nameKo, 'ko'));

await writeFile(new URL('../src/data/countries.json', import.meta.url), JSON.stringify(countries, null, 0).replace(/\},\{/g, '},\n{') + '\n');
console.log(`국가 ${countries.length}개 저장 완료`);
