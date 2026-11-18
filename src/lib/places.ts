import curatedRaw from '../data/cities.json'
import type { Country, Place } from '../types'
import { distanceKm } from './osm'

type Curated = Record<string, { name: string; lat: number; lng: number; factor: number }[]>
const curated = curatedRaw as unknown as Curated

let wikidataCities: Promise<Record<string, { name: string; lat: number; lng: number; pop: number }[]>> | null = null
const loadWikidataCities = () => {
  wikidataCities ??= import('../data/cities.wikidata.json').then((m) => m.default as never)
  return wikidataCities
}

export const hasCuratedCities = (code: string) => Array.isArray(curated[code])

/** 나라의 기본 지역 (직접 정리한 첫 도시, 없으면 수도) */
export function defaultPlace(country: Country): Place {
  const c = curated[country.code]?.[0]
  if (c) return { name: c.name, lat: c.lat, lng: c.lng, factor: c.factor, source: 'curated' }
  return {
    name: country.capitalKo ?? country.nameKo,
    lat: country.latlng[0],
    lng: country.latlng[1],
    factor: 1.1,
    source: 'capital',
  }
}

/** 지역 선택 칩에 보여 줄 도시 목록 */
export async function cityOptions(country: Country): Promise<Place[]> {
  const list = curated[country.code]
  if (list) return list.map((c) => ({ name: c.name, lat: c.lat, lng: c.lng, factor: c.factor, source: 'curated' as const }))

  const capital = defaultPlace(country)
  let cities: { name: string; lat: number; lng: number; pop: number }[] = []
  try {
    cities = (await loadWikidataCities())[country.code] ?? []
  } catch {
    wikidataCities = null
  }
  const out: Place[] = [capital]
  cities.forEach((c, i) => {
    if (out.some((p) => p.name === c.name || distanceKm([p.lat, p.lng], [c.lat, c.lng]) < 10)) return
    // 직접 정리하지 않은 나라: 가장 큰 도시·100만 도시는 조금 비싸게, 나머지는 조금 싸게 추정
    const factor = i === 0 || c.pop >= 1_000_000 ? 1.05 : 0.9
    out.push({ name: c.name, lat: c.lat, lng: c.lng, factor, source: 'wikidata' })
  })
  return out.slice(0, 12)
}

/**
 * 검색으로 고른 지역의 물가 보정값.
 * 직접 정리한 도시 25km 안이면 그 도시 값을 쓰고, 아니면 소도시·시골로 보고 평균보다 조금 싸게 잡는다.
 */
export function factorNear(code: string, lat: number, lng: number): { factor: number; near?: string } {
  let best: { factor: number; near: string; d: number } | null = null
  for (const c of curated[code] ?? []) {
    const d = distanceKm([lat, lng], [c.lat, c.lng])
    if (d < 25 && (!best || d < best.d)) best = { factor: c.factor, near: c.name, d }
  }
  return best ? { factor: best.factor, near: best.near } : { factor: 0.95 }
}

/** 물가 보정: 숙소는 그대로, 나머지는 절반만 반영 */
export const lodgingFactor = (f: number) => f
export const dailyFactor = (f: number) => 1 + (f - 1) / 2
