import { HOUR, HttpError, cachedJson, fetchJson } from './cache'

// 무료 날씨 API는 하루 요청 한도가 있어서(같은 와이파이를 여러 명이 쓰면 금방 찬다) 예보를 3시간 저장한다
const TTL = 3 * HOUR

// Open-Meteo 응답 (2026-11 실제 호출로 확인)
// {"timezone":"Asia/Tokyo","current":{"time":"2026-11-19T09:45","temperature_2m":12.4,"weather_code":2,"relative_humidity_2m":59,"wind_speed_10m":8.4},
//  "daily":{"time":["2026-11-19",...],"weather_code":[2,...],"temperature_2m_max":[13.2,...],"temperature_2m_min":[7.6,...],
//           "precipitation_sum":[0.0,...],"precipitation_probability_max":[29,...]}}
// 먼 날짜는 값이 null일 수 있다.
interface OpenMeteoRes {
  timezone: string
  utc_offset_seconds?: number
  current?: { time: string; temperature_2m: number | null; weather_code: number | null; relative_humidity_2m: number | null; wind_speed_10m: number | null }
  daily: {
    time: string[]
    weather_code: (number | null)[]
    temperature_2m_max: (number | null)[]
    temperature_2m_min: (number | null)[]
    precipitation_sum: (number | null)[]
    precipitation_probability_max: (number | null)[]
    sunrise?: (string | null)[]
    sunset?: (string | null)[]
  }
}

export interface DayWeather {
  date: string
  code: number | null
  max: number | null
  min: number | null
  rainMm: number | null
  rainProb: number | null
  /** 현지 시각 "2026-11-19T06:34" */
  sunrise?: string | null
  sunset?: string | null
}

export interface Weather {
  timezone: string
  /** 현지 시간과 UTC의 차이(초) */
  utcOffsetSec?: number
  current?: { time: string; temp: number | null; code: number | null; humidity: number | null; wind: number | null }
  days: DayWeather[]
}

export const FORECAST_DAYS = 16

async function load(lat: number, lng: number): Promise<Weather> {
  const url =
    'https://api.open-meteo.com/v1/forecast?' +
    new URLSearchParams({
      latitude: lat.toFixed(4),
      longitude: lng.toFixed(4),
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunrise,sunset',
      current: 'temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m',
      timezone: 'auto',
      forecast_days: String(FORECAST_DAYS),
    })
  const r = await fetchJson<OpenMeteoRes>(url)
  if (!r?.daily?.time) throw new HttpError(500, url)
  const d = r.daily
  return {
    timezone: r.timezone,
    utcOffsetSec: r.utc_offset_seconds,
    current: r.current && {
      time: r.current.time,
      temp: r.current.temperature_2m,
      code: r.current.weather_code,
      humidity: r.current.relative_humidity_2m,
      wind: r.current.wind_speed_10m,
    },
    days: d.time.map((date, i) => ({
      date,
      code: d.weather_code?.[i] ?? null,
      max: d.temperature_2m_max?.[i] ?? null,
      min: d.temperature_2m_min?.[i] ?? null,
      rainMm: d.precipitation_sum?.[i] ?? null,
      rainProb: d.precipitation_probability_max?.[i] ?? null,
      sunrise: d.sunrise?.[i] ?? null,
      sunset: d.sunset?.[i] ?? null,
    })),
  }
}

/** 지점의 16일 예보 (3시간 캐시, 실패하면 저장본) */
export const getWeather = (lat: number, lng: number, force = false) =>
  cachedJson(`weather:v3:${lat.toFixed(3)},${lng.toFixed(3)}`, TTL, () => load(lat, lng), { force })

/** WMO 날씨 코드 → [이모지, 한국어] */
export function describeWeather(code: number | null): [string, string] {
  if (code == null) return ['❔', '정보 없음']
  if (code === 0) return ['☀️', '맑음']
  if (code === 1) return ['🌤️', '대체로 맑음']
  if (code === 2) return ['⛅', '구름 조금']
  if (code === 3) return ['☁️', '흐림']
  if (code === 45 || code === 48) return ['🌫️', '안개']
  if (code >= 51 && code <= 57) return ['🌦️', '이슬비']
  if (code >= 61 && code <= 65) return ['🌧️', code === 65 ? '강한 비' : '비']
  if (code === 66 || code === 67) return ['🌧️', '어는 비']
  if (code >= 71 && code <= 77) return ['🌨️', code === 75 ? '많은 눈' : '눈']
  if (code >= 80 && code <= 82) return ['🌦️', '소나기']
  if (code === 85 || code === 86) return ['🌨️', '소낙눈']
  if (code >= 95) return ['⛈️', '뇌우']
  return ['❔', '정보 없음']
}

/** 예보로 짐 싸기 한 줄 조언 */
export function packingTips(days: DayWeather[]): string[] {
  const valid = days.filter((d) => d.max != null && d.min != null)
  if (!valid.length) return []
  const tips: string[] = []
  const maxT = Math.max(...valid.map((d) => d.max!))
  const minT = Math.min(...valid.map((d) => d.min!))
  const rainy = days.filter((d) => (d.rainProb ?? 0) >= 50 || (d.rainMm ?? 0) >= 1).length
  const snowy = days.some((d) => d.code != null && ((d.code >= 71 && d.code <= 77) || d.code === 85 || d.code === 86))
  if (minT <= 0) tips.push('🧤 영하로 내려가요. 두꺼운 외투·장갑을 챙기세요.')
  else if (minT <= 8) tips.push('🧥 아침저녁이 쌀쌀해요. 겉옷을 챙기세요.')
  if (maxT >= 30) tips.push('🧴 한낮에 30도가 넘어요. 자외선 차단제·물을 챙기세요.')
  if (maxT - minT >= 12) tips.push('🌡️ 일교차가 커요. 얇은 옷을 겹쳐 입으세요.')
  if (snowy) tips.push('❄️ 눈 예보가 있어요. 미끄럼에 강한 신발이 좋아요.')
  if (rainy) tips.push(`☂️ 비 올 확률이 높은 날이 ${rainy}일 있어요. 우산을 챙기세요.`)
  return tips
}

/** 사진 찍기 좋은 골든아워 (대략: 일출 후 1시간, 일몰 전 1시간) */
export function goldenHours(d: DayWeather) {
  const t = (iso?: string | null) => (iso ? iso.slice(11, 16) : null)
  const add = (iso: string, min: number) => {
    const [h, m] = iso.slice(11, 16).split(':').map(Number)
    const v = h * 60 + m + min
    return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`
  }
  if (!d.sunrise || !d.sunset) return null
  return { sunrise: t(d.sunrise)!, sunset: t(d.sunset)!, morning: [t(d.sunrise)!, add(d.sunrise, 60)], evening: [add(d.sunset, -60), t(d.sunset)!] }
}

/** 여러 지점의 일별 예보를 한 번에 (Open-Meteo는 좌표를 쉼표로 이어 보내면 배열로 돌려준다, 3시간 캐시) */
export function getWeatherMulti(points: [number, number][], force = false) {
  const key = 'weather-multi:v1:' + points.map(([a, b]) => `${a.toFixed(2)},${b.toFixed(2)}`).join(';')
  return cachedJson(
    key,
    TTL,
    async () => {
      const url =
        'https://api.open-meteo.com/v1/forecast?' +
        new URLSearchParams({
          latitude: points.map((p) => p[0].toFixed(3)).join(','),
          longitude: points.map((p) => p[1].toFixed(3)).join(','),
          daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code',
          timezone: 'auto',
          forecast_days: String(FORECAST_DAYS),
        })
      const r = await fetchJson<OpenMeteoRes | OpenMeteoRes[]>(url)
      const list = Array.isArray(r) ? r : [r]
      return list.map((x) =>
        x.daily.time.map((date, i) => ({
          date,
          code: x.daily.weather_code?.[i] ?? null,
          max: x.daily.temperature_2m_max?.[i] ?? null,
          min: x.daily.temperature_2m_min?.[i] ?? null,
          rainMm: null,
          rainProb: x.daily.precipitation_probability_max?.[i] ?? null,
        })),
      ) as DayWeather[][]
    },
    { force },
  )
}
