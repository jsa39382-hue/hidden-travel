import { distanceKm } from './osm'
import type { Tier } from './budget'

/**
 * 현지 경비 밖의 비용 추정 (모두 원화, 키 없는 무료 API가 없어 규칙으로 계산).
 * 실제 가격과 차이가 클 수 있으므로 화면에 '추정'임을 꼭 밝힌다.
 */

const INCHEON: [number, number] = [37.4602, 126.4407]

export interface FlightEstimate {
  perAdult: number
  distanceKm: number
  peak: boolean
}

/** 성수기: 여름방학(7~8월), 연말연시(12/20~1/10) */
export function isPeak(date: string) {
  const m = Number(date.slice(5, 7))
  const md = date.slice(5)
  return m === 7 || m === 8 || md >= '12-20' || md <= '01-10'
}

/**
 * 인천 출발 왕복 일반석 운임 추정.
 * 2025~2026년 대표 노선 운임(도쿄 약 35만, 방콕 약 65만, 파리 약 130만, 뉴욕 약 150만 원)에 맞춘 거리 비례식.
 * 알뜰 = 저비용 항공·특가, 고급 = 일반석 정상가·좋은 시간대 (비즈니스석은 아님)
 */
export function flightEstimate(dest: [number, number], tier: Tier, startDate: string, domestic = false): FlightEstimate {
  const km = distanceKm(INCHEON, dest)
  const base = domestic ? 120_000 : 200_000 + 120 * km
  const peak = isPeak(startDate)
  const v = base * [0.8, 1, 1.6][tier] * (peak ? 1.25 : 1)
  return { perAdult: Math.round(v / 10_000) * 10_000, distanceKm: km, peak }
}

/** 아이(만 2~11세) 항공권은 어른의 약 75% */
export const KID_FLIGHT_RATE = 0.75

const ASIA = new Set(['동아시아', '동남아시아', '남아시아', '중앙아시아'])

/** 여행자 보험 1인 추정: 기본 + 하루 요금(아시아는 싸고 미주·유럽은 비쌈). 알뜰=기본형, 고급=보장 확대형 */
export function insuranceEstimate(region: string | undefined, days: number, tier: Tier) {
  const perDay = region && ASIA.has(region) ? 1_800 : region === '북아메리카' ? 3_500 : 3_000
  const v = (5_000 + perDay * days) * [0.8, 1, 1.6][tier]
  return Math.round(v / 1_000) * 1_000
}

/** 현지 데이터(eSIM·유심) 1인 추정 */
export const simEstimate = (days: number) => Math.round((5_000 + 1_500 * days) / 1_000) * 1_000

export const SHOPPING = [
  { label: '안 함', krw: 0 },
  { label: '조금', krw: 100_000 },
  { label: '보통', krw: 300_000 },
  { label: '많이', krw: 700_000 },
] as const

export interface ExtraPrefs {
  flight: boolean
  /** 직접 입력한 1인 왕복 항공권 가격(원) */
  flightPrice?: number
  insurance: boolean
  sim: boolean
  shopping: 0 | 1 | 2 | 3
}

export const DEFAULT_EXTRAS: ExtraPrefs = { flight: true, insurance: true, sim: true, shopping: 1 }

export interface ExtraLine {
  key: string
  label: string
  formula: string
  krw: number
}
