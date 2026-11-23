// 실제로 한 번 받아 둔 응답(tests/fixtures)으로 대기질·바다·지진 해석을 확인한다
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { airTips, gradePm10, gradePm25, gradeUv, toAirDays } from '../src/lib/airQuality.ts'
import { seaState, toSea, waterFeel } from '../src/lib/marine.ts'
import { magKo, toQuakes } from '../src/lib/quakes.ts'
import { lastYearRange, summarize, toPastDays, yearsBefore } from '../src/lib/history.ts'
import { hasHangul, toHits } from '../src/lib/photon.ts'

const load = (f: string) => JSON.parse(readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8'))

test('대기질: 시간별 → 날짜별 평균·최고', () => {
  const days = toAirDays(load('air-paris.json'))
  assert.equal(days.length, 2)
  for (const d of days) {
    assert.match(d.date, /^\d{4}-\d{2}-\d{2}$/)
    assert.ok(d.pm25 != null && d.pm25 >= 0)
    assert.ok(d.uvMax != null && d.uvMax >= 0)
  }
  // 직접 계산한 값과 같은지
  const r = load('air-paris.json')
  const first = r.hourly.pm2_5.slice(0, 24).filter((x: number | null) => x != null) as number[]
  assert.ok(Math.abs(days[0].pm25! - first.reduce((s, x) => s + x, 0) / first.length) < 1e-9)
  assert.equal(days[0].uvMax, Math.max(...(r.hourly.uv_index.slice(0, 24).filter((x: number | null) => x != null) as number[])))
})

test('대기질 등급: 환경부·WHO 기준 경계', () => {
  assert.equal(gradePm25(15).label, '좋음')
  assert.equal(gradePm25(16).label, '보통')
  assert.equal(gradePm25(76).label, '매우 나쁨')
  assert.equal(gradePm10(80).label, '보통')
  assert.equal(gradePm10(81).label, '나쁨')
  assert.equal(gradeUv(2.4).label, '낮음')
  assert.equal(gradeUv(7).label, '높음')
  assert.equal(gradeUv(11).label, '위험')
  assert.equal(airTips([{ date: 'x', pm25: 40, pm10: 20, uvMax: 9 }]).length, 2)
  assert.equal(airTips([{ date: 'x', pm25: 5, pm10: 10, uvMax: 1 }]).length, 0)
})

test('바다: 해안은 값 있는 날만, 내륙은 coastal=false', () => {
  const bali = toSea(load('sea-bali.json'))
  assert.equal(bali.coastal, true)
  assert.ok(bali.days.length > 0 && bali.days.length < 16)
  assert.ok(bali.days.every((d) => d.wave != null || d.water != null))
  const paris = toSea(load('sea-paris.json'))
  assert.equal(paris.coastal, false)
  assert.equal(seaState(0.4).label, '잔잔')
  assert.equal(seaState(2).swim, '물놀이는 조심하세요')
  assert.equal(waterFeel(29), '따뜻해요')
})

test('지진: 규모·거리·최신순', () => {
  const qs = toQuakes(load('quakes-tokyo.json'), 35.68, 139.76)
  assert.equal(qs.length, 5)
  for (let i = 1; i < qs.length; i++) assert.ok(qs[i - 1].time >= qs[i].time)
  for (const q of qs) {
    assert.ok(q.mag >= 4.5)
    assert.ok(q.distKm > 0 && q.distKm <= 310, `거리 ${q.distKm}`)
    assert.ok(q.url?.startsWith('https://earthquake.usgs.gov/'))
  }
  assert.equal(magKo(5.2), '중간 지진')
})

test('과거 날씨: 작년 같은 기간 날짜 계산과 요약', () => {
  assert.equal(yearsBefore('2026-12-10'), '2025-12-10')
  assert.equal(yearsBefore('2028-02-29'), '2027-02-28')
  assert.deepEqual(lastYearRange('2026-12-10', '2026-12-14'), ['2025-12-10', '2025-12-14'])
  assert.deepEqual(lastYearRange('2026-07-01', '2026-08-30'), ['2025-07-01', '2025-07-16']) // 최대 16일
  const days = toPastDays(load('past-paris.json'))
  assert.equal(days.length, 5)
  assert.equal(days[0].date, '2025-12-10')
  const s = summarize(days)
  assert.ok(s.avgMax != null && s.avgMin != null && s.avgMax > s.avgMin)
  assert.equal(s.known, 5)
})

test('Photon: 고른 나라 결과만, 한글 판별', () => {
  const jp = toHits(load('photon-kyto.json'), 'JP')
  assert.ok(jp.length > 0)
  assert.ok(jp.some((h) => h.name === 'Kyoto'))
  assert.ok(jp.every((h) => Number.isFinite(h.lat) && Number.isFinite(h.lng)))
  assert.equal(toHits(load('photon-kyto.json'), 'KR').length, 0)
  assert.equal(hasHangul('교토'), true)
  assert.equal(hasHangul('Kyoto 京都'), false)
})

test('공유 링크: lz-string 압축(z)이 예전(w)보다 짧고, 둘 다 그대로 읽힌다', async () => {
  const { decodeLiked, encodeLiked, encodeLikedZ } = await import('../src/lib/share.ts')
  const liked = [
    { id: 'node/123456789', name: '간다묘진', kind: '신사', lat: 35.702141, lng: 139.767912, hiddenScore: 62 },
    { id: 'way/98765432', name: '구 이와사키 저택 정원', kind: '정원', lat: 35.70988, lng: 139.76988, hiddenScore: 66 },
    { id: 'node/2222222', name: '미쓰비시 1호관 미술관', kind: '미술관', lat: 35.67811, lng: 139.76311 },
  ]
  const z = encodeLikedZ(liked as never)
  const w = encodeLiked(liked as never)
  assert.ok(z.length < w.length, `z ${z.length} < w ${w.length}`)
  const back = decodeLiked(z, 'z')
  assert.equal(back.length, 3)
  assert.equal(back[0].name, '간다묘진')
  assert.equal(back[0].lat, 35.70214)
  assert.equal(back[2].hiddenScore, undefined)
  assert.deepEqual(decodeLiked(w, 'w'), back)
  assert.deepEqual(decodeLiked('망가진값', 'z'), [])
})
