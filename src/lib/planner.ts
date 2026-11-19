import type { Place, TripDates } from '../types'
import type { Spot, SpotCategory } from './spots'
import type { Eatery } from './nearby'
import type { DayWeather } from './weather'
import type { Holiday } from './holidays'
import { festivalWhen, overlapWithTrip, type Festival } from './festivals'
import { addDays, diffDays } from './dates'
import { distanceKm, formatDistance } from './osm'

// ---------------- 스타일 해석 ----------------

export type Interest = 'nature' | 'view' | 'history' | 'museum' | 'art' | 'food' | 'cafe' | 'night' | 'shopping'
export type Pace = 'relaxed' | 'normal' | 'packed'

export interface Style {
  weights: Record<Interest, number>
  /** -1(유명한 곳 선호) ~ 1(숨은 곳 선호) */
  hidden: number
  pace: Pace
  kids: boolean
  cheap: boolean
  /** 화면에 보여 줄 '이렇게 이해했어요' */
  understood: string[]
}

/** 키워드 → 해석. 한국어 활용형까지 잡기 위해 짧은 어간으로 적는다. */
const KEYWORDS: { words: string[]; apply: (s: Style) => void; label: string }[] = [
  { label: '🌿 자연', words: ['자연', '산', '폭포', '바다', '해변', '비치', '숲', '공원', '하이킹', '등산', '트레킹', '동굴', '온천', '호수', '계곡', '섬', '캠핑'], apply: (s) => (s.weights.nature += 2) },
  { label: '📸 사진·전망', words: ['사진', '전망', '뷰', '풍경', '인스타', '노을', '일몰', '일출', '경치', '포토'], apply: (s) => (s.weights.view += 2) },
  { label: '🏯 역사·문화', words: ['역사', '유적', '성', '절', '사원', '신사', '문화', '전통', '궁', '고성', '옛', '유네스코', '세계유산'], apply: (s) => (s.weights.history += 2) },
  { label: '🖼️ 박물관·미술관', words: ['박물관', '미술관', '전시', '갤러리', '예술', '아트', '실내'], apply: (s) => ((s.weights.museum += 2), (s.weights.art += 1)) },
  { label: '🍜 맛집', words: ['맛집', '음식', '먹방', '먹고', '먹는', '먹을', '먹거리', '식당', '미식', '요리', '로컬푸드', '시장', '노포', '라멘', '스시', '쌀국수'], apply: (s) => (s.weights.food += 2) },
  { label: '☕ 카페', words: ['카페', '커피', '디저트', '빵', '베이커리', '브런치', '차 마시'], apply: (s) => (s.weights.cafe += 2) },
  { label: '🌙 야경·밤', words: ['야경', '밤', '술', '바', '펍', '이자카야', '나이트'], apply: (s) => ((s.weights.night += 2), (s.weights.view += 1)) },
  { label: '🛍️ 쇼핑', words: ['쇼핑', '시장', '기념품', '아울렛'], apply: (s) => (s.weights.shopping += 1) },
  { label: '🤫 숨은 곳 우선', words: ['숨은', '조용', '한적', '사람 적', '사람이 적', '로컬', '현지인', '덜 알려', '비밀', '붐비지 않', '한산'], apply: (s) => (s.hidden = Math.min(1, s.hidden + 0.8)) },
  { label: '⭐ 유명한 곳 우선', words: ['유명', '랜드마크', '필수', '대표', '처음', '꼭 가', '핫플', '인기'], apply: (s) => (s.hidden = Math.max(-1, s.hidden - 0.8)) },
  { label: '🐢 느긋하게', words: ['느긋', '여유', '천천히', '휴양', '힐링', '쉬엄쉬엄', '푹 쉬'], apply: (s) => (s.pace = 'relaxed') },
  { label: '🏃 알차게', words: ['빡빡', '알차', '많은 곳', '최대한', '부지런', '꽉 채'], apply: (s) => { if (s.pace !== 'relaxed') s.pace = 'packed' } },
  { label: '👨‍👩‍👧 아이와 함께', words: ['아이', '가족', '아기', '어린이', '키즈', '부모님'], apply: (s) => (s.kids = true) },
  { label: '💰 알뜰하게', words: ['알뜰', '가성비', '저렴', '싸게', '배낭', '절약'], apply: (s) => (s.cheap = true) },
]

export const STYLE_CHIPS = KEYWORDS.map((k) => ({ label: k.label, word: k.words[0] }))

export function parseStyle(text: string, chips: string[]): Style {
  const s: Style = {
    weights: { nature: 0, view: 0, history: 0, museum: 0, art: 0, food: 0, cafe: 0, night: 0, shopping: 0 },
    hidden: 0.3, // 이 사이트는 기본적으로 숨은 곳을 조금 더 우선한다
    pace: 'normal',
    kids: false,
    cheap: false,
    understood: [],
  }
  const t = ` ${text.toLowerCase()} `
  for (const k of KEYWORDS) {
    const hit = chips.includes(k.label) || k.words.some((w) => (w.length === 1 ? new RegExp(`${w}(?![가-힣])|${w}[을를이가과와에도]`).test(t) : t.includes(w)))
    if (hit) {
      k.apply(s)
      s.understood.push(k.label)
    }
  }
  if (s.kids) s.understood.push('→ 아이 동반: 험한 산봉우리는 빼고 하루 일정을 줄여요')
  if (!s.understood.length) s.understood.push('특별한 취향이 없어 골고루 섞고 숨은 곳을 조금 더 넣었어요')
  return s
}

// ---------------- 일정 만들기 ----------------

export interface PlanItem {
  time: string
  kind: 'spot' | 'lunch' | 'dinner' | 'cafe' | 'move'
  title: string
  detail?: string
  spot?: Spot
  eatery?: Eatery
  lat?: number
  lng?: number
}

export interface PlanDay {
  date: string
  dayIndex: number
  items: PlanItem[]
  notes: string[]
  weather?: DayWeather
  centroid?: [number, number]
}

export interface Recommendation {
  spot: Spot
  score: number
  reasons: string[]
}

export interface Plan {
  recommended: Recommendation[]
  days: PlanDay[]
  /** 계획에 필요한 명소가 부족할 때 안내 */
  warnings: string[]
}

const CAT_TO_INTEREST: Record<SpotCategory, Interest[]> = {
  nature: ['nature'],
  view: ['view', 'night'],
  museum: ['museum'],
  history: ['history'],
  art: ['art'],
  attraction: ['history', 'view', 'shopping'],
}
const CAT_LABEL: Record<SpotCategory, string> = {
  nature: '자연',
  view: '전망·사진',
  museum: '박물관·실내',
  history: '역사·문화',
  art: '예술',
  attraction: '볼거리',
}
/** 머무는 시간(분) */
const STAY_MIN: Record<SpotCategory, number> = { nature: 120, view: 45, museum: 90, history: 75, art: 30, attraction: 75 }
const INDOOR = (s: Spot) => s.category === 'museum' || /건물|교회|사원|수도원|궁전/.test(s.kind)

/** 같은 입력이면 같은 결과, '다시 짜기'를 누르면 다른 결과가 나오도록 하는 간단한 난수 */
function rng(seed: number) {
  let x = seed * 2654435761 || 1
  return () => {
    x ^= x << 13
    x ^= x >>> 17
    x ^= x << 5
    return ((x >>> 0) % 10000) / 10000
  }
}

function scoreSpot(s: Spot, st: Style, rand: () => number): Recommendation {
  const reasons: string[] = []
  const interests = CAT_TO_INTEREST[s.category]
  const w = Math.max(...interests.map((i) => st.weights[i]))
  if (w > 0) reasons.push(`${CAT_LABEL[s.category]} 취향`)
  let score = 10 + w * 6
  const hiddenness = (s.hiddenScore - 50) / 50 // -1 ~ 1
  score += st.hidden * hiddenness * 8
  if (s.hiddenScore >= 50 && st.hidden > 0) reasons.push(s.views == null ? '숨은 곳 (위키 문서 없음)' : '숨은 곳 (조회수 적음)')
  if (s.hiddenScore < 50 && st.hidden < 0) reasons.push('유명한 곳')
  if (s.koTitle || s.enTitle) score += 3 // 설명을 보여 줄 수 있음
  const distPenalty = st.pace === 'relaxed' ? 0.9 : st.pace === 'packed' ? 0.35 : 0.6
  score -= Math.min(12, s.distKm * distPenalty)
  if (s.distKm < 2) reasons.push('중심에서 가까움')
  if (st.kids && s.category === 'nature' && s.kind === '산봉우리') score -= 20
  if (st.kids && (s.category === 'museum' || s.kind === '해변')) score += 3
  if (s.category === 'art') score -= 4 // 작은 조형물은 일정의 주인공이 되기 어렵다
  score += rand() * 4
  return { spot: s, score, reasons }
}

/** 하루에 넣을 명소 수 */
function perDay(st: Style) {
  const base = st.pace === 'relaxed' ? 2 : st.pace === 'packed' ? 5 : 3
  return st.kids ? Math.max(2, base - 1) : base
}

function fmtTime(min: number) {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60 / 5) * 5
  return `${String(h + Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

function moveText(km: number) {
  if (km < 1.2) return { min: Math.max(5, Math.round(km * 13)), text: `걸어서 약 ${Math.max(5, Math.round(km * 13))}분 (${formatDistance(km)})` }
  const min = Math.round(10 + km * 3.5)
  return { min, text: `대중교통·택시 약 ${min}분 (${formatDistance(km)})` }
}

/** 가장 가까운 식당 (이미 쓴 곳 제외) */
function nearestEatery(list: Eatery[], at: [number, number], used: Set<string>, pred: (e: Eatery) => boolean, maxKm: number) {
  let best: Eatery | undefined
  let bestD = maxKm
  for (const e of list) {
    if (used.has(e.id) || !pred(e)) continue
    const d = distanceKm(at, [e.lat, e.lng])
    if (d < bestD) {
      best = e
      bestD = d
    }
  }
  if (best) used.add(best.id)
  return best
}

export interface PlanInput {
  spots: Spot[]
  eateries: Eatery[]
  place: Place
  dates: TripDates
  style: Style
  seed: number
  weather?: DayWeather[]
  holidays: Holiday[]
  festivals: Festival[]
  /** 날짜별로 따로 찾아 둔 식당 (그 날 동선 근처) */
  dayEateries?: Record<string, Eatery[]>
}

export function makePlan(input: PlanInput): Plan {
  const { spots, place, dates, style, seed } = input
  const rand = rng(seed + 1)
  const warnings: string[] = []
  const nDays = Math.min(10, Math.max(1, diffDays(dates.start, dates.end) + 1))
  if (diffDays(dates.start, dates.end) + 1 > 10) warnings.push('일정표는 앞 10일까지만 만들어요.')

  // 1) 점수 매기기 + 다양성(같은 종류는 뽑을수록 점수 감소)
  const scored = spots.map((s) => scoreSpot(s, style, rand)).sort((a, b) => b.score - a.score)
  const capacity = Array.from({ length: nDays }, (_, i) => {
    const n = perDay(style)
    // 첫날(도착)·마지막 날(출발)은 하나 적게
    return nDays >= 3 && (i === 0 || i === nDays - 1) ? Math.max(1, n - 1) : n
  })
  const total = capacity.reduce((a, b) => a + b, 0)
  const picked: Recommendation[] = []
  const catCount: Partial<Record<SpotCategory, number>> = {}
  const pool = [...scored]
  while (picked.length < total && pool.length) {
    pool.sort((a, b) => b.score - 3 * (catCount[b.spot.category] ?? 0) - (a.score - 3 * (catCount[a.spot.category] ?? 0)))
    const r = pool.shift()!
    picked.push(r)
    catCount[r.spot.category] = (catCount[r.spot.category] ?? 0) + 1
  }
  if (picked.length < total) warnings.push(`이 지역에서 찾은 명소가 ${picked.length}곳뿐이라 일정이 여유로워요. 명소 섹션에서 반경을 넓히면 더 채울 수 있어요.`)

  // 2) 중심 기준 방향(각도)으로 정렬해 날짜별로 나눔 → 하루 동선이 한 방향으로 모인다
  const c: [number, number] = [place.lat, place.lng]
  const angle = (s: Spot) => Math.atan2(s.lat - c[0], (s.lng - c[1]) * Math.cos((c[0] * Math.PI) / 180))
  const byAngle = [...picked].sort((a, b) => angle(a.spot) - angle(b.spot))
  // 시작 각도를 무작위로 돌려 '다시 짜기'마다 묶음이 달라지게
  const rot = Math.floor(rand() * byAngle.length)
  const ring = [...byAngle.slice(rot), ...byAngle.slice(0, rot)]
  const groups: Recommendation[][] = []
  let k = 0
  for (const cap of [...capacity].sort((a, b) => b - a)) {
    groups.push(ring.slice(k, k + cap))
    k += cap
  }

  // 3) 날짜 배정: 비 오는 날에는 실내가 많은 묶음
  const dates_ = Array.from({ length: nDays }, (_, i) => addDays(dates.start, i))
  const weatherOf = (d: string) => input.weather?.find((w) => w.date === d)
  const rainy = (d: string) => {
    const w = weatherOf(d)
    return !!w && ((w.rainProb ?? 0) >= 60 || (w.rainMm ?? 0) >= 5)
  }
  const remaining = [...groups]
  const assignment = new Map<string, Recommendation[]>()
  const order = [...dates_].sort((a, b) => Number(rainy(b)) - Number(rainy(a)))
  for (const d of order) {
    const i = dates_.indexOf(d)
    const cap = capacity[i]
    // 용량이 맞는 묶음 중에서 고르기
    let candidates = remaining.filter((g) => g.length <= cap)
    if (!candidates.length) candidates = remaining
    let g = candidates[0]
    if (rainy(d)) g = candidates.reduce((best, x) => (x.filter((r) => INDOOR(r.spot)).length > best.filter((r) => INDOOR(r.spot)).length ? x : best), g)
    if (g) {
      remaining.splice(remaining.indexOf(g), 1)
      assignment.set(d, g.slice(0, cap))
    } else assignment.set(d, [])
  }

  // 3-1) 비 오는 날: 야외(자연·전망) 명소를 아직 안 고른 실내 명소로 바꾼다
  const pickedIds = new Set(picked.map((r) => r.spot.id))
  const indoorPool = scored.filter((r) => !pickedIds.has(r.spot.id) && INDOOR(r.spot))
  for (const d of dates_) {
    if (!rainy(d)) continue
    const g = assignment.get(d) ?? []
    g.forEach((r, idx) => {
      if ((r.spot.category === 'nature' || r.spot.category === 'view') && indoorPool.length) {
        const sub = indoorPool.shift()!
        g[idx] = { ...sub, reasons: [...sub.reasons, '비 예보라 실내로'] }
      }
    })
  }

  // 4) 하루 동선·시간표
  const usedEat = new Set<string>()
  const days: PlanDay[] = dates_.map((date, i) => {
    const group = assignment.get(date) ?? []
    const notes: string[] = []
    const w = weatherOf(date)
    if (rainy(date))
      notes.push(
        group.some((r) => INDOOR(r.spot))
          ? '☔ 비 예보가 있어 실내 위주로 짰어요. 우산을 챙기세요.'
          : '☔ 비 예보가 있는데 이 지역에서 실내 명소를 찾지 못했어요. 우산을 챙기고 일정을 줄이는 것도 좋아요.',
      )
    const hs = input.holidays.filter((h) => h.date === date && h.dayOff)
    if (hs.length) notes.push(`🎌 ${hs.map((h) => h.name).join(', ')} — 공휴일이라 가게 휴무·혼잡 가능, 식당은 예약을 권해요.`)
    // 축제 데이터는 나라 단위라 다른 도시 축제가 섞일 수 있다 → 장소 이름이 고른 지역과 맞는 것만
    const placeKey = place.name.replace(/\s*\(.*\)$/, '').replace(/[\s·]/g, '')
    for (const f of input.festivals) {
      if (overlapWithTrip(f, date, date) !== 'date') continue
      const fp = (f.place ?? '').replace(/[\s·]/g, '')
      if (fp && (fp.includes(placeKey) || placeKey.includes(fp)))
        notes.push(`🎉 ${f.name} (${f.place}) — 이 날 열리는 축제예요.`)
    }
    if (nDays >= 2 && i === 0) notes.push('✈️ 도착일이라 가볍게 짰어요.')
    if (nDays >= 2 && i === nDays - 1) notes.push('🧳 출발일이라 오전 위주로 짰어요.')

    // 동선: 중심에서 가장 가까운 곳부터 가까운 순서로
    const rest = group.map((r) => r.spot)
    const route: Spot[] = []
    let cur: [number, number] = c
    while (rest.length) {
      rest.sort((a, b) => distanceKm(cur, [a.lat, a.lng]) - distanceKm(cur, [b.lat, b.lng]))
      const s = rest.shift()!
      route.push(s)
      cur = [s.lat, s.lng]
    }
    // 야경 취향: 전망 포인트가 있으면 마지막으로
    if (style.weights.night > 0) {
      const vi = route.findIndex((s) => s.category === 'view')
      if (vi >= 0 && vi !== route.length - 1) route.push(route.splice(vi, 1)[0])
    }

    const eats = [...(input.dayEateries?.[date] ?? []), ...input.eateries]
    const mealPred = (e: Eatery) => (style.cheap ? e.kind !== 'bar' && e.kind !== 'cafe' : e.kind === 'restaurant' || (style.weights.food === 0 && e.kind !== 'cafe' && e.kind !== 'bar'))
    const items: PlanItem[] = []
    let t = i === 0 && nDays >= 2 ? 13 * 60 : 9 * 60 + 30
    let pos: [number, number] = c
    let lunchDone = t >= 13 * 60
    let cafeDone = style.weights.cafe === 0
    route.forEach((s, idx) => {
      const leg = distanceKm(pos, [s.lat, s.lng])
      if (idx > 0 || leg > 0.3) {
        const mv = moveText(leg)
        items.push({ time: fmtTime(t), kind: 'move', title: '이동', detail: mv.text })
        t += mv.min
      }
      if (!lunchDone && t >= 11 * 60 + 45) {
        const e = nearestEatery(eats, [s.lat, s.lng], usedEat, mealPred, 1.5)
        items.push({ time: fmtTime(t), kind: 'lunch', title: e ? e.name : '근처에서 점심', detail: e ? [e.cuisine, e.kindLabel, formatDistance(distanceKm([s.lat, s.lng], [e.lat, e.lng]))].filter(Boolean).join(' · ') : '이 근처 식당은 아래 버튼으로 찾아보세요', eatery: e, lat: s.lat, lng: s.lng })
        t += 60
        lunchDone = true
      }
      const stay = Math.round(STAY_MIN[s.category] * (style.pace === 'relaxed' ? 1.3 : style.pace === 'packed' ? 0.8 : 1))
      const rec = group.find((r) => r.spot.id === s.id)
      items.push({ time: fmtTime(t), kind: 'spot', title: s.name, detail: `${s.kind} · 약 ${stay >= 60 ? `${Math.floor(stay / 60)}시간${stay % 60 ? ` ${stay % 60}분` : ''}` : `${stay}분`}${rec?.reasons.length ? ` · ${rec.reasons.join(', ')}` : ''}`, spot: s })
      t += stay
      pos = [s.lat, s.lng]
      if (!cafeDone && t >= 14 * 60 + 30) {
        const e = nearestEatery(eats, pos, usedEat, (x) => x.kind === 'cafe', 1)
        if (e) {
          items.push({ time: fmtTime(t), kind: 'cafe', title: e.name, detail: `카페 쉬어 가기 · ${formatDistance(distanceKm(pos, [e.lat, e.lng]))}`, eatery: e })
          t += 40
        }
        cafeDone = true
      }
    })
    if (!lunchDone && route.length) {
      const e = nearestEatery(eats, pos, usedEat, mealPred, 1.5)
      items.push({ time: fmtTime(Math.max(t, 12 * 60)), kind: 'lunch', title: e ? e.name : '근처에서 점심', detail: e ? [e.cuisine, e.kindLabel].filter(Boolean).join(' · ') : '이 근처 식당은 아래 버튼으로 찾아보세요', eatery: e, lat: pos[0], lng: pos[1] })
      t = Math.max(t, 12 * 60) + 60
    }
    if (!(nDays >= 2 && i === nDays - 1)) {
      const dinnerPred = (e: Eatery) => (style.weights.night > 0 ? e.kind === 'restaurant' || e.kind === 'bar' : mealPred(e))
      const e = nearestEatery(eats, pos, usedEat, dinnerPred, 2)
      items.push({ time: fmtTime(Math.max(t + 30, 18 * 60 + 30)), kind: 'dinner', title: e ? e.name : '저녁 식사', detail: e ? [e.cuisine, e.kindLabel].filter(Boolean).join(' · ') : '숙소 근처나 마지막 장소 근처에서', eatery: e, lat: pos[0], lng: pos[1] })
    }
    const centroid: [number, number] | undefined = route.length
      ? [route.reduce((a, s) => a + s.lat, 0) / route.length, route.reduce((a, s) => a + s.lng, 0) / route.length]
      : undefined
    return { date, dayIndex: i, items, notes, weather: w, centroid }
  })

  return { recommended: scored.slice(0, 12), days, warnings }
}

/** 복사·공유용 텍스트 */
export function planToText(plan: Plan, placeName: string, countryName: string): string {
  const lines = [`[숨은여행] ${countryName} ${placeName} 여행 계획`, '']
  for (const d of plan.days) {
    lines.push(`■ ${d.dayIndex + 1}일차 ${d.date}`)
    d.notes.forEach((n) => lines.push(`  ${n}`))
    for (const it of d.items) {
      if (it.kind === 'move') continue
      const icon = it.kind === 'spot' ? '📍' : it.kind === 'cafe' ? '☕' : '🍽️'
      lines.push(`  ${it.time} ${icon} ${it.title}${it.detail ? ` — ${it.detail}` : ''}`)
    }
    lines.push('')
  }
  lines.push('※ 자동으로 만든 추천 일정이에요. 영업시간·휴무일은 방문 전에 꼭 확인하세요.')
  return lines.join('\n')
}

export { festivalWhen }
