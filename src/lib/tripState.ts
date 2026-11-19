import { useEffect, useState } from 'react'
import type { Place, TripDates } from '../types'
import { addDays, diffDays, todayStr } from './dates'
import { getCountry } from './countries'
import { defaultPlace } from './places'

const KEY = 'hidden-travel:trip'
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

interface TripState {
  countryCode: string | null
  dates: TripDates
  /** 고른 도시·지역 (나라별로 기억) */
  places: Record<string, Place>
}

function defaultDates(): TripDates {
  const start = addDays(todayStr(), 14)
  return { start, end: addDays(start, 4) }
}

const isPlace = (p: unknown): p is Place =>
  !!p && typeof p === 'object' && typeof (p as Place).name === 'string' && Number.isFinite((p as Place).lat) && Number.isFinite((p as Place).lng)

/** URL(?c=JP&from=..&to=..&place=..&lat=..&lng=..) → localStorage → 기본값 순서로 초기 상태를 정한다. */
function load(): TripState {
  let saved: Partial<TripState> = {}
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    /* 무시 */
  }
  const p = new URLSearchParams(location.search)
  const code = (p.get('c') ?? saved.countryCode ?? '').toUpperCase()
  const start = p.get('from') ?? saved.dates?.start
  const end = p.get('to') ?? saved.dates?.end
  const datesOk = start && end && DATE_RE.test(start) && DATE_RE.test(end) && diffDays(start, end) >= 0
  const places: Record<string, Place> = {}
  for (const [k, v] of Object.entries(saved.places ?? {})) if (isPlace(v)) places[k] = v
  // 공유 링크의 지역 정보
  const name = p.get('place')
  const lat = Number(p.get('lat'))
  const lng = Number(p.get('lng'))
  if (getCountry(code) && name && Number.isFinite(lat) && Number.isFinite(lng) && p.get('lat')) {
    const f = Number(p.get('f'))
    places[code] = { name, lat, lng, factor: Number.isFinite(f) && f > 0 ? f : 1, source: 'search' }
  }
  return {
    countryCode: getCountry(code) ? code : null,
    dates: datesOk ? { start, end } : defaultDates(),
    places,
  }
}

export function useTripState() {
  const [state, setState] = useState<TripState>(load)
  const country = getCountry(state.countryCode)
  const place = country ? (state.places[country.code] ?? defaultPlace(country)) : undefined

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* 무시 */
    }
    const p = new URLSearchParams(location.search)
    if (state.countryCode) p.set('c', state.countryCode)
    else p.delete('c')
    p.set('from', state.dates.start)
    p.set('to', state.dates.end)
    const pl = state.countryCode ? state.places[state.countryCode] : undefined
    if (pl) {
      p.set('place', pl.name)
      p.set('lat', pl.lat.toFixed(4))
      p.set('lng', pl.lng.toFixed(4))
      p.set('f', String(pl.factor))
    } else ['place', 'lat', 'lng', 'f'].forEach((k) => p.delete(k))
    history.replaceState(null, '', `${location.pathname}?${p}${location.hash}`)
  }, [state])

  return {
    country,
    dates: state.dates,
    place,
    setCountry: (code: string | null) => setState((s) => ({ ...s, countryCode: code })),
    setDates: (dates: TripDates) => setState((s) => ({ ...s, dates })),
    setPlace: (pl: Place) => setState((s) => (s.countryCode ? { ...s, places: { ...s.places, [s.countryCode]: pl } } : s)),
  }
}
