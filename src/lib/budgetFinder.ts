import { COUNTRIES } from './countries'
import { calcBudget, getCostRow, type Party, type Tier } from './budget'
import { flightEstimate } from './extras'
import { defaultPlace } from './places'
import type { Country } from '../types'

export interface Affordable {
  country: Country
  total: number
  flight: number
  local: number
  basis: 'country' | 'region' | 'global'
}

/** '이 예산으로 갈 수 있는 나라': 모든 나라의 항공권 + 현지 경비를 원화로 추정 (costs.json 값은 USD) */
export function estimateAll(opts: { days: number; adults: number; tier: Tier; startDate: string; usdKrw: number }): Affordable[] {
  const { days, adults, tier, startDate, usdKrw } = opts
  const party: Party = adults <= 1 ? { type: 'solo', adults: 1, kids: 0 } : adults === 2 ? { type: 'couple', adults: 2, kids: 0 } : { type: 'friends', adults, kids: 0 }
  return COUNTRIES.filter((c) => c.code !== 'KR').map((country) => {
    const { row, basis } = getCostRow(country.code)
    const place = defaultPlace(country)
    const local = calcBudget(row, tier, party, days, place.factor).total * usdKrw
    const flight = flightEstimate([place.lat, place.lng], tier, startDate).perAdult * adults
    return { country, total: local + flight, flight, local, basis }
  })
}
