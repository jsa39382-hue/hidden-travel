import { HOUR, HttpError, cachedJson, fetchJson } from './cache.ts'

/**
 * Open-Meteo 바다 API (키 없음): 하루 최고 파고와 바다 표면 수온.
 * 응답: {"daily":{"time":["2026-11-24",...],"wave_height_max":[1.12,...],"sea_surface_temperature_max":[30.3,...]}}
 * 바다가 아닌 내륙 좌표는 값이 모두 null이고, 값은 보통 8~9일 앞까지만 나온다.
 */
interface MarineRes {
  daily?: { time: string[]; wave_height_max?: (number | null)[]; sea_surface_temperature_max?: (number | null)[] }
}

export interface SeaDay {
  date: string
  /** 하루 최고 파고 (m, 앞바다 격자 기준) */
  wave: number | null
  /** 바다 표면 수온 (°C) */
  water: number | null
}

export interface Sea {
  /** 바다 값이 하나라도 있으면 true (내륙이면 false) */
  coastal: boolean
  days: SeaDay[]
}

export function toSea(r: MarineRes): Sea {
  const d = r.daily
  if (!d?.time?.length) return { coastal: false, days: [] }
  const days = d.time
    .map((date, i) => ({ date, wave: d.wave_height_max?.[i] ?? null, water: d.sea_surface_temperature_max?.[i] ?? null }))
    .filter((x) => x.wave != null || x.water != null)
  return { coastal: days.length > 0, days }
}

async function load(lat: number, lng: number): Promise<Sea> {
  const url =
    'https://marine-api.open-meteo.com/v1/marine?' +
    new URLSearchParams({
      latitude: lat.toFixed(4),
      longitude: lng.toFixed(4),
      daily: 'wave_height_max,sea_surface_temperature_max',
      timezone: 'auto',
      forecast_days: '16',
    })
  const r = await fetchJson<MarineRes>(url)
  if (!r?.daily) throw new HttpError(500, url)
  return toSea(r)
}

/** 지점의 바다 예보 (3시간 캐시, 실패하면 저장본) */
export const getSea = (lat: number, lng: number, force = false) =>
  cachedJson(`sea:v1:${lat.toFixed(3)},${lng.toFixed(3)}`, 3 * HOUR, () => load(lat, lng), { force })

/** 세계기상기구(WMO) 해상 상태 구분으로 본 파도와 물놀이 안내 */
export function seaState(wave: number): { label: string; swim: string; tone: 'good' | 'ok' | 'bad' } {
  if (wave <= 0.5) return { label: '잔잔', swim: '물놀이 좋아요', tone: 'good' }
  if (wave <= 1.25) return { label: '약한 물결', swim: '물놀이 괜찮아요', tone: 'good' }
  if (wave <= 2.5) return { label: '보통 물결', swim: '물놀이는 조심하세요', tone: 'ok' }
  if (wave <= 4) return { label: '높은 물결', swim: '물놀이는 피하세요', tone: 'bad' }
  return { label: '매우 높은 물결', swim: '바다에 들어가지 마세요', tone: 'bad' }
}

/** 수온 느낌 (바다 수영 기준 대략) */
export function waterFeel(c: number) {
  return c >= 26 ? '따뜻해요' : c >= 22 ? '수영하기 알맞아요' : c >= 18 ? '조금 차가워요' : '차가워요'
}
