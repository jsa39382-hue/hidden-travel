/**
 * 일출·일몰과 시간대를 인터넷 없이 계산한다 (날씨 API가 막혀도·16일 예보 밖이어도 골든아워와 시차가 나오게).
 * 일출·일몰: 표준 일출 방정식(NOAA 간이식, 대기 굴절 -0.833° 반영). 오차는 보통 1~2분이다.
 */

/** 나라(와 좌표) → IANA 시간대. 시간대가 여러 개인 나라는 경도·위도로 고른다 */
export function timeZoneFor(code: string, lat: number, lng: number): string | null {
  switch (code) {
    case 'JP': return 'Asia/Tokyo'
    case 'CN': return 'Asia/Shanghai'
    case 'HK': return 'Asia/Hong_Kong'
    case 'MO': return 'Asia/Macau'
    case 'TW': return 'Asia/Taipei'
    case 'MN': return lng < 100 ? 'Asia/Hovd' : 'Asia/Ulaanbaatar'
    case 'VN': return 'Asia/Ho_Chi_Minh'
    case 'TH': return 'Asia/Bangkok'
    case 'PH': return 'Asia/Manila'
    case 'SG': return 'Asia/Singapore'
    case 'MY': return 'Asia/Kuala_Lumpur'
    case 'ID': return lng < 114.6 ? 'Asia/Jakarta' : lng < 134 ? 'Asia/Makassar' : 'Asia/Jayapura'
    case 'KH': return 'Asia/Phnom_Penh'
    case 'IN': return 'Asia/Kolkata'
    case 'AE': return 'Asia/Dubai'
    case 'TR': return 'Europe/Istanbul'
    case 'GU': return 'Pacific/Guam'
    case 'US':
      if (lng < -154) return 'Pacific/Honolulu'
      if (lat > 52) return 'America/Anchorage'
      if (lat > 31 && lat < 37 && lng > -115 && lng < -109) return 'America/Phoenix' // 애리조나(그랜드캐니언)는 서머타임 없음
      return lng < -114.5 ? 'America/Los_Angeles' : lng < -102 ? 'America/Denver' : lng < -87.5 ? 'America/Chicago' : 'America/New_York'
    case 'CA':
      return lng < -120 ? 'America/Vancouver' : lng < -110 ? 'America/Edmonton' : lng < -102 ? 'America/Regina' : lng < -90 ? 'America/Winnipeg' : lng < -64 ? 'America/Toronto' : 'America/Halifax'
    case 'AU':
      if (lng < 129) return 'Australia/Perth'
      if (lat > -26 && lng < 138) return 'Australia/Darwin'
      if (lng < 141) return 'Australia/Adelaide'
      return lat > -29 ? 'Australia/Brisbane' : 'Australia/Sydney'
    case 'NZ': return 'Pacific/Auckland'
    case 'GB': return 'Europe/London'
    case 'FR': return 'Europe/Paris'
    case 'IT': return 'Europe/Rome'
    case 'ES': return lng < -13 ? 'Atlantic/Canary' : 'Europe/Madrid'
    case 'DE': return 'Europe/Berlin'
    case 'CH': return 'Europe/Zurich'
    case 'AT': return 'Europe/Vienna'
    case 'CZ': return 'Europe/Prague'
    case 'PT': return lng < -20 ? 'Atlantic/Azores' : lng < -15 ? 'Atlantic/Madeira' : 'Europe/Lisbon'
    case 'GR': return 'Europe/Athens'
    default: return null
  }
}

/** 그 시간대의 UTC 차이(초), 예: 도쿄 32400 */
export function tzOffsetSec(timeZone: string, at = new Date()): number | undefined {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
        .formatToParts(at)
        .map((p) => [p.type, p.value]),
    )
    const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second)
    return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 1000)
  } catch {
    return undefined
  }
}

const rad = Math.PI / 180
const J1970 = 2440587.5
const J2000 = 2451545

/** 날짜("YYYY-MM-DD")의 일출·일몰 시각 (UTC Date). 백야·극야면 null */
export function sunTimes(date: string, lat: number, lng: number): { sunrise: Date; sunset: Date } | null {
  const noonUtc = Date.parse(`${date}T12:00:00Z`)
  const n = Math.round(noonUtc / 86400000 + J1970 - J2000 - 0.0009 + lng / 360)
  const jStar = n + 0.0009 - lng / 360
  const M = (357.5291 + 0.98560028 * jStar) % 360
  const C = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad)
  const lambda = (M + C + 180 + 102.9372) % 360
  const jTransit = J2000 + jStar + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * lambda * rad)
  const decl = Math.asin(Math.sin(lambda * rad) * Math.sin(23.4397 * rad))
  const cosW = (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(decl)) / (Math.cos(lat * rad) * Math.cos(decl))
  if (cosW < -1 || cosW > 1) return null
  const w = Math.acos(cosW) / rad
  const toDate = (j: number) => new Date((j - J1970) * 86400000)
  return { sunrise: toDate(jTransit - w / 360), sunset: toDate(jTransit + w / 360) }
}

/** 현지 시각 "HH:MM" */
export function localHHMM(d: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d)
}
