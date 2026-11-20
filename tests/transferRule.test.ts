// recommendTransfer 단위 테스트. 실행: npm run test:transfer
// 아래 요금은 규칙을 시험하려고 만든 '예시 값'이에요. 실제 요금이 아니에요.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cityTransitAdvice, inHours, isOperating, recommendTransfer, taxiFare, type Candidate } from '../src/lib/transferRule.ts'

const OPTIONS: Candidate[] = [
  { id: 'rail', mode: 'rail', name: '공항철도 (예시)', minutes: 45, price: [1300, 1300], firstLast: '05:30-23:40', transfers: 1 },
  { id: 'express', mode: 'rail', name: '공항 특급 (예시)', minutes: 36, price: [2500, 2600], firstLast: '06:30-23:00', transfers: 1 },
  { id: 'bus', mode: 'bus', name: '리무진버스 (예시)', minutes: 70, price: [1500, 1800], firstLast: '06:00-22:30', transfers: 0 },
  { id: 'taxi', mode: 'taxi', name: '택시 (예시)', minutes: 40, price: [3600, 5400], firstLast: null, transfers: 0 },
]

export const SCENARIOS = {
  '혼자 · 알뜰 · 14:00 · 짐 보통': { adults: 1, kids: 0, tier: 0 as const, arrival: '14:00', luggage: 'normal' as const, options: OPTIONS },
  '4명 · 보통 · 14:00 · 짐 보통': { adults: 4, kids: 0, tier: 1 as const, arrival: '14:00', luggage: 'normal' as const, options: OPTIONS },
  '2명 · 보통 · 00:30 도착(막차 이후)': { adults: 2, kids: 0, tier: 1 as const, arrival: '00:30', luggage: 'normal' as const, options: OPTIONS },
  '어른 2+아이 1 · 보통 · 짐 많음': { adults: 2, kids: 1, tier: 1 as const, arrival: '14:00', luggage: 'heavy' as const, options: OPTIONS },
}

test('혼자 알뜰이면 가장 싼 공항철도', () => {
  const r = recommendTransfer(SCENARIOS['혼자 · 알뜰 · 14:00 · 짐 보통'])
  assert.equal(r.recommended?.option.id, 'rail')
  assert.match(r.reason, /가장 싸게/)
})

test('4명이면 택시가 1인당 더 쌀 때 택시', () => {
  const r = recommendTransfer(SCENARIOS['4명 · 보통 · 14:00 · 짐 보통'])
  assert.equal(r.recommended?.option.id, 'taxi')
  assert.match(r.reason, /4명이면 택시가 1인당 더 싸요/)
})

test('막차 이후면 운행하는 수단(택시)만', () => {
  const r = recommendTransfer(SCENARIOS['2명 · 보통 · 00:30 도착(막차 이후)'])
  assert.equal(r.recommended?.option.id, 'taxi')
  assert.equal(r.excluded.length, 3)
  assert.match(r.reason, /막차/)
})

test('아이·짐 많음이면 갈아타지 않는 수단', () => {
  const r = recommendTransfer(SCENARIOS['어른 2+아이 1 · 보통 · 짐 많음'])
  assert.equal(r.recommended?.option.transfers, 0)
})

test('고급이면 갈아타지 않는 것 중 가장 빠른 것', () => {
  const r = recommendTransfer({ ...SCENARIOS['혼자 · 알뜰 · 14:00 · 짐 보통'], tier: 2 })
  assert.equal(r.recommended?.option.id, 'taxi')
})

test('요금이 모두 없어도 죽지 않음', () => {
  const r = recommendTransfer({ adults: 2, kids: 0, tier: 0, arrival: '10:00', luggage: 'light', options: OPTIONS.map((o) => ({ ...o, price: null })) })
  assert.ok(r.recommended)
  assert.match(r.reason, /요금 정보가 없어/)
  const empty = recommendTransfer({ adults: 1, kids: 0, tier: 1, arrival: '10:00', luggage: 'light', options: [] })
  assert.equal(empty.recommended, null)
})

test('자정을 넘는 운행 시간·심야 시간대', () => {
  assert.equal(isOperating({ mode: 'rail', firstLast: '05:30-00:20' }, '00:10'), true)
  assert.equal(isOperating({ mode: 'rail', firstLast: '05:30-00:20' }, '01:00'), false)
  assert.equal(inHours('23:30', '22:00-05:00'), true)
  assert.equal(inHours('12:00', '22:00-05:00'), false)
})

test('택시 요금 ±20%와 심야 할증', () => {
  const t = { base: 500, perKm: 300, nightMultiplier: 1.2, nightHours: '22:00-05:00' }
  assert.deepEqual(taxiFare(t, 10, '12:00'), [2800, 4200])
  assert.deepEqual(taxiFare(t, 10, '23:00'), [3360, 5040])
  assert.equal(taxiFare({ ...t, base: null }, 10), null)
})

test('시내: 패스와 1회 요금 비교', () => {
  assert.equal(cityTransitAdvice([200, 200], [{ name: '1일권', price: 600, days: 1 }], 4).pick, 'pass')
  assert.equal(cityTransitAdvice([200, 200], [{ name: '1일권', price: 900, days: 1 }], 4).pick, 'single')
  assert.equal(cityTransitAdvice(null, [{ name: '1일권', price: null, days: 1 }], 4).pick, null)
})

test('택시가 비싸도 아이·짐 많으면 갈아타기 불이익으로 바뀜', () => {
  const pricey = OPTIONS.map((o) => (o.id === 'taxi' ? { ...o, price: [5600, 8400] as [number, number] } : o))
  const light = recommendTransfer({ adults: 2, kids: 1, tier: 1, arrival: '14:00', luggage: 'light', options: pricey })
  const heavy = recommendTransfer({ adults: 2, kids: 0, tier: 1, arrival: '14:00', luggage: 'heavy', options: pricey })
  assert.equal(light.recommended?.option.transfers, 0)
  assert.equal(heavy.recommended?.option.transfers, 0)
})

test('두 단계 택시 요금: 기본 거리 포함, 일정 금액 이후 km당 요금이 바뀜', () => {
  // 홍콩 시내 택시 공식 요금표 형태: 처음 2km 29, 이후 km당 10.5, 102.5 넘으면 km당 7
  const hk = { base: 29, includedKm: 2, perKm: 10.5, afterAmount: 102.5, perKmAfter: 7, nightMultiplier: null, nightHours: null }
  const mid = (r: [number, number] | null) => (r ? (r[0] + r[1]) / 2 : NaN)
  assert.equal(mid(taxiFare(hk, 1)), 29) // 기본 거리 안
  assert.equal(mid(taxiFare(hk, 4)), 50) // 29 + 2×10.5
  assert.equal(mid(taxiFare(hk, 19)), 102.5 + 7 * 10) // 102.5 도달 지점(9km) 이후 10km × 7
})

test('일출·일몰 계산: 알려진 값과 2분 안', async () => {
  const { sunTimes, localHHMM, timeZoneFor } = await import('../src/lib/sun.ts')
  const min = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3))
  // 기준값: 널리 알려진 일출·일몰 시각 (서울 하지, 뉴욕 독립기념일), 2분 오차까지 허용
  const cases: [string, string, number, number, string, string, string][] = [
    ['KR', '2026-06-21', 37.5665, 126.978, 'Asia/Seoul', '05:11', '19:57'],
    ['US', '2026-07-04', 40.71, -74.0, '', '05:29', '20:31'],
  ]
  for (const [code, date, lat, lng, tzIn, rise, set] of cases) {
    const tz = tzIn || timeZoneFor(code, lat, lng)!
    const s = sunTimes(date, lat, lng)!
    assert.ok(Math.abs(min(localHHMM(s.sunrise, tz)) - min(rise)) <= 2, `${code} 일출 ${localHHMM(s.sunrise, tz)}`)
    assert.ok(Math.abs(min(localHHMM(s.sunset, tz)) - min(set)) <= 2, `${code} 일몰 ${localHHMM(s.sunset, tz)}`)
  }
})
