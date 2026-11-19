/**
 * 교통수단 추천 규칙 (순수 함수만, 다른 모듈을 가져오지 않음 → 단위 테스트하기 쉽게).
 * 금액은 모두 현지 통화.
 */

export type Mode = 'rail' | 'bus' | 'taxi' | 'ride' | 'shuttle'
export type Luggage = 'light' | 'normal' | 'heavy'
export type Range = [number, number]

export interface Candidate {
  id: string
  mode: Mode
  name: string
  minutes: number | null
  /** 대중교통은 1인, 택시·차량 호출은 1대 요금 */
  price: Range | null
  /** "05:30-23:40" (막차가 자정을 넘기면 "05:30-00:20"), null이면 시간 정보 없음 */
  firstLast: string | null
  transfers: number
}

export interface TransferInput {
  adults: number
  kids: number
  /** 0 알뜰, 1 보통, 2 고급 */
  tier: 0 | 1 | 2
  /** 도착 시각 "HH:MM" */
  arrival: string
  luggage: Luggage
  options: Candidate[]
  /** 아이 요금 비율. 나라 데이터에 없으면 null → 어른 요금 */
  childRate?: number | null
}

export interface Evaluated {
  option: Candidate
  /** 일행 전체 금액 */
  total: Range | null
  perPerson: Range | null
  vehicles: number
  operating: boolean
}

export interface TransferResult {
  recommended: Evaluated | null
  reason: string
  others: Evaluated[]
  excluded: Evaluated[]
}

export const isVehicle = (m: Mode) => m === 'taxi' || m === 'ride'
const toMin = (hhmm: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

/** 도착 시각에 운행하는지. 시간 정보가 없거나 택시·차량 호출이면 운행으로 본다 */
export function isOperating(c: Pick<Candidate, 'mode' | 'firstLast'>, arrival: string): boolean {
  if (isVehicle(c.mode) || !c.firstLast) return true
  const [a, b] = c.firstLast.split('-')
  const first = toMin(a ?? '')
  const last = toMin(b ?? '')
  const t = toMin(arrival)
  if (first == null || last == null || t == null) return true
  return last >= first ? t >= first && t <= last : t >= first || t <= last
}

/** 차 한 대에 탈 수 있는 인원 (짐이 많으면 한 명 줄임) */
export const seatsPerCar = (luggage: Luggage) => (luggage === 'heavy' ? 3 : 4)

const mid = (r: Range) => (r[0] + r[1]) / 2

export function evaluate(c: Candidate, input: Pick<TransferInput, 'adults' | 'kids' | 'luggage' | 'childRate'>, operating = true): Evaluated {
  const people = Math.max(1, input.adults + input.kids)
  const childRate = input.childRate ?? 1
  if (!c.price) return { option: c, total: null, perPerson: null, vehicles: 0, operating }
  if (isVehicle(c.mode)) {
    const vehicles = Math.ceil(people / seatsPerCar(input.luggage))
    const total: Range = [c.price[0] * vehicles, c.price[1] * vehicles]
    return { option: c, total, perPerson: [total[0] / people, total[1] / people], vehicles, operating }
  }
  const units = input.adults + input.kids * childRate
  const total: Range = [c.price[0] * units, c.price[1] * units]
  return { option: c, total, perPerson: [total[0] / people, total[1] / people], vehicles: 0, operating }
}

/**
 * 공항 → 숙소 수단 추천.
 *  - 막차 이후면 운행하는 수단만 남긴다
 *  - 알뜰: 가장 싼 것 / 고급: 갈아타지 않는 것 중 가장 빠른 것 / 보통: 금액·시간 균형
 *  - 아이가 있거나 짐이 많으면 갈아타는 수단에 불이익
 */
export function recommendTransfer(input: TransferInput): TransferResult {
  const all = input.options.map((c) => evaluate(c, input, isOperating(c, input.arrival)))
  const running = all.filter((e) => e.operating)
  const excluded = all.filter((e) => !e.operating)
  const afterLast = excluded.length > 0
  const people = Math.max(1, input.adults + input.kids)
  const burden = input.kids > 0 || input.luggage === 'heavy'

  if (!running.length) return { recommended: null, reason: '이 시간에 운행하는 수단이 없어요', others: [], excluded }

  // 갈아타기 불이익(아이·짐 많음): 금액은 1회당 25%, 시간은 1회당 30분 더한 것처럼 비교
  const cost = (e: Evaluated) => (e.total ? mid(e.total) * (burden ? 1 + 0.25 * e.option.transfers : 1) : Infinity)
  const time = (e: Evaluated) => (e.option.minutes ?? Infinity) + (burden ? 30 * e.option.transfers : 0)
  const priced = running.filter((e) => e.total)
  const timed = running.filter((e) => e.option.minutes != null)

  let pick: Evaluated | undefined
  let reason = ''
  if (input.tier === 0 && priced.length) {
    pick = [...priced].sort((a, b) => cost(a) - cost(b) || time(a) - time(b))[0]
    reason = '가장 싸게 갈 수 있어요'
  } else if (input.tier === 2 && timed.length) {
    const direct = timed.filter((e) => e.option.transfers === 0)
    pick = [...(direct.length ? direct : timed)].sort((a, b) => time(a) - time(b) || cost(a) - cost(b))[0]
    reason = direct.length ? '갈아타지 않고 가장 빨라요' : '가장 빨라요'
  } else {
    // 보통(또는 금액·시간 정보가 한쪽만 있을 때): 가장 싼 것과 가장 빠른 것 대비 비율의 합이 가장 작은 것
    const pool = running.filter((e) => e.total || e.option.minutes != null)
    const minCost = Math.min(...pool.map(cost).filter(Number.isFinite), Infinity)
    const minTime = Math.min(...pool.map(time).filter(Number.isFinite), Infinity)
    const score = (e: Evaluated) =>
      (Number.isFinite(minCost) ? (Number.isFinite(cost(e)) ? cost(e) / minCost : 3) : 0) + (Number.isFinite(minTime) ? (Number.isFinite(time(e)) ? time(e) / minTime : 3) : 0)
    pick = pool.length ? [...pool].sort((a, b) => score(a) - score(b))[0] : running[0]
    reason = '금액과 시간이 가장 균형 잡혀요'
  }
  pick ??= running[0]

  // 요금을 아는 수단이 하나도 없으면 사실대로
  if (!priced.length) reason = timed.length ? '요금 정보가 없어 시간으로만 골랐어요' : '요금·시간 정보가 아직 없어요'

  // 이유 문장 다듬기 (가장 구체적인 것 하나)
  const cheapestPublic = priced.filter((e) => !isVehicle(e.option.mode)).sort((a, b) => mid(a.perPerson!) - mid(b.perPerson!))[0]
  if (isVehicle(pick.option.mode) && people >= 3 && pick.perPerson && cheapestPublic?.perPerson && mid(pick.perPerson) < mid(cheapestPublic.perPerson)) {
    reason = `${people}명이면 ${pick.option.mode === 'taxi' ? '택시' : '차량 호출'}가 1인당 더 싸요`
  } else if (afterLast && excluded.some((e) => !isVehicle(e.option.mode))) {
    reason = `막차가 끊긴 시간이라 운행하는 수단 중에서 골랐어요 · ${reason}`
  } else if (burden && pick.option.transfers === 0 && running.some((e) => e.option.transfers > 0)) {
    reason = `${input.kids > 0 ? '아이가 있어' : '짐이 많아'} 갈아타지 않는 수단을 골랐어요 · ${reason}`
  }

  const others = running.filter((e) => e !== pick).sort((a, b) => cost(a) - cost(b) || time(a) - time(b))
  return { recommended: pick, reason, others, excluded }
}

/** 택시 요금 = 기본요금 + km당 요금 × 거리 (심야면 할증), 화면에는 ±20% 범위로 */
export function taxiFare(taxi: { base: number | null; perKm: number | null; nightMultiplier: number | null; nightHours: string | null }, km: number, hhmm?: string): Range | null {
  if (taxi.base == null || taxi.perKm == null) return null
  let v = taxi.base + taxi.perKm * km
  if (hhmm && taxi.nightMultiplier && taxi.nightHours && inHours(hhmm, taxi.nightHours)) v *= taxi.nightMultiplier
  return [Math.round(v * 0.8), Math.round(v * 1.2)]
}

/** "22:00-05:00" 안에 드는지 (자정을 넘는 구간 포함) */
export function inHours(hhmm: string, range: string) {
  const [a, b] = range.split('-')
  const s = toMin(a ?? '')
  const e = toMin(b ?? '')
  const t = toMin(hhmm)
  if (s == null || e == null || t == null) return false
  return e >= s ? t >= s && t < e : t >= s || t < e
}

/** 시내: 하루 탑승 횟수 × 1회 요금과 패스 하루 값 비교 */
export function cityTransitAdvice(
  single: Range | null,
  passes: { name: string; price: number | null; days: number }[],
  ridesPerDay: number,
): { pick: 'single' | 'pass' | null; perDay: number | null; pass?: { name: string; price: number; days: number }; singlePerDay: number | null } {
  const singlePerDay = single ? mid(single) * ridesPerDay : null
  const best = passes.filter((p): p is { name: string; price: number; days: number } => p.price != null && p.days > 0).sort((a, b) => a.price / a.days - b.price / b.days)[0]
  const passPerDay = best ? best.price / best.days : null
  if (singlePerDay == null && passPerDay == null) return { pick: null, perDay: null, singlePerDay: null }
  if (passPerDay != null && (singlePerDay == null || passPerDay < singlePerDay)) return { pick: 'pass', perDay: passPerDay, pass: best, singlePerDay }
  return { pick: 'single', perDay: singlePerDay, singlePerDay }
}
