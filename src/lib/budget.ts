import costsRaw from '../data/costs.json'
import regionsRaw from '../data/regions.json'
import { dailyFactor, lodgingFactor } from './places'

export type Tier = 0 | 1 | 2
export const TIERS = [
  { label: '알뜰', desc: '게스트하우스·호스텔, 길거리 음식, 대중교통' },
  { label: '보통', desc: '3성급 호텔, 현지 식당, 대중교통+가끔 택시' },
  { label: '고급', desc: '4~5성급 호텔, 좋은 식당, 택시·투어' },
] as const

export type PartyType = 'solo' | 'couple' | 'friends' | 'family'
export interface Party {
  type: PartyType
  /** friends: 인원, family: 어른 수 */
  adults: number
  /** family: 아이 수 */
  kids: number
}

interface CostRow {
  currency: string
  lodging: number[]
  food: number[]
  transport: number[]
  sightseeing: number[]
}

const costs = costsRaw as unknown as { updated: string; countries: Record<string, CostRow>; regions: Record<string, CostRow> }
const regionOf = new Map<string, string>()
for (const [region, codes] of Object.entries(regionsRaw)) {
  if (Array.isArray(codes)) codes.forEach((c) => regionOf.set(c, region))
}

export const COSTS_UPDATED = costs.updated

export function getCostRow(code: string): { row: CostRow; basis: 'country' | 'region' | 'global'; region?: string } {
  const own = costs.countries[code]
  if (own) return { row: own, basis: 'country' }
  const region = regionOf.get(code)
  if (region && costs.regions[region]) return { row: costs.regions[region], basis: 'region', region }
  return { row: costs.regions['전체'], basis: 'global' }
}

/** 실제 계산에 쓰는 어른·아이 수 */
export function headcount(p: Party) {
  switch (p.type) {
    case 'solo':
      return { adults: 1, kids: 0 }
    case 'couple':
      return { adults: 2, kids: 0 }
    case 'friends':
      return { adults: Math.max(3, p.adults), kids: 0 }
    case 'family':
      return { adults: Math.max(1, p.adults), kids: Math.max(0, p.kids) }
  }
}

/**
 * 방 수. 기본은 2인 1실.
 * 가족은 한 방에 어른 2명 + 아이 2명(최대 4명)까지 묵는다고 보고,
 * 어른 기준 방 수와 전체 인원 기준 방 수 중 큰 값을 쓴다.
 */
export function roomCount(p: Party) {
  const { adults, kids } = headcount(p)
  if (p.type === 'family') return Math.max(Math.ceil(adults / 2), Math.ceil((adults + kids) / 4), 1)
  return Math.max(1, Math.ceil(adults / 2))
}

export const KID_RATE = 0.7

export interface BudgetLine {
  key: 'lodging' | 'food' | 'transport' | 'sightseeing'
  label: string
  unit: number // 원래 통화 기준 단가
  formula: string
  amount: number // 원래 통화 기준 합계
}

export interface BudgetResult {
  currency: string // costs.json 값의 통화
  lines: BudgetLine[]
  total: number
  perPerson: number
  people: number
  rooms: number
  nights: number
  days: number
  personUnits: number // 어른 1 + 아이 0.7 환산 인원
}

/** factor: 도시 물가 보정 (숙소는 그대로, 나머지는 절반만 반영) */
export function calcBudget(row: CostRow, tier: Tier, party: Party, days: number, factor = 1): BudgetResult {
  const { adults, kids } = headcount(party)
  const rooms = roomCount(party)
  const nights = Math.max(0, days - 1)
  const personUnits = adults + kids * KID_RATE
  const people = adults + kids
  const who = kids ? `(어른 ${adults} + 아이 ${kids}×70%)` : `${adults}명`

  const perPerson = (key: 'food' | 'transport' | 'sightseeing', label: string): BudgetLine => ({
    key,
    label,
    unit: row[key][tier] * dailyFactor(factor),
    formula: `1인 1일 × ${who} × ${days}일`,
    amount: row[key][tier] * dailyFactor(factor) * personUnits * days,
  })

  const lines: BudgetLine[] = [
    {
      key: 'lodging',
      label: '숙소',
      unit: row.lodging[tier] * lodgingFactor(factor),
      formula: nights ? `1박 1실 × ${rooms}실 × ${nights}박` : '당일치기 (숙박 없음)',
      amount: row.lodging[tier] * lodgingFactor(factor) * rooms * nights,
    },
    perPerson('food', '식비'),
    perPerson('transport', '현지 교통'),
    perPerson('sightseeing', '관광·입장료'),
  ]
  const total = lines.reduce((s, l) => s + l.amount, 0)
  return { currency: row.currency, lines, total, perPerson: total / people, people, rooms, nights, days, personUnits }
}
