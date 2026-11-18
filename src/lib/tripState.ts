import { useEffect, useState } from 'react'
import type { TripDates } from '../types'
import { addDays, diffDays, todayStr } from './dates'
import { getCountry } from './countries'

const KEY = 'hidden-travel:trip'
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

interface TripState {
  countryCode: string | null
  dates: TripDates
}

function defaultDates(): TripDates {
  const start = addDays(todayStr(), 14)
  return { start, end: addDays(start, 4) }
}

/** URL(?c=JP&from=..&to=..) → localStorage → 기본값 순서로 초기 상태를 정한다. */
function load(): TripState {
  const fallback: TripState = { countryCode: null, dates: defaultDates() }
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
  return {
    countryCode: getCountry(code) ? code : fallback.countryCode,
    dates: datesOk ? { start, end } : fallback.dates,
  }
}

export function useTripState() {
  const [state, setState] = useState<TripState>(load)

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
    history.replaceState(null, '', `${location.pathname}?${p}${location.hash}`)
  }, [state])

  return {
    country: getCountry(state.countryCode),
    dates: state.dates,
    setCountry: (code: string) => setState((s) => ({ ...s, countryCode: code })),
    setDates: (dates: TripDates) => setState((s) => ({ ...s, dates })),
  }
}
