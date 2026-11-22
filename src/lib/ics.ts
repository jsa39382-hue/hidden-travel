/**
 * 일정표 → 캘린더 파일(.ics, RFC 5545). 휴대폰·구글·애플 캘린더에 그대로 넣을 수 있다.
 * 현지 시각을 그 나라 시간대로 UTC로 바꿔 적는다 (VTIMEZONE 없이도 어디서나 같은 시각으로 보이게).
 */
import type { Plan } from './planner'
import { tzOffsetSec } from './sun.ts'

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** 75바이트가 넘는 줄은 접는다 (한글은 3바이트) */
function fold(line: string) {
  const out: string[] = []
  let cur = ''
  let bytes = 0
  for (const ch of line) {
    const b = new TextEncoder().encode(ch).length
    if (bytes + b > 73) {
      out.push(cur)
      cur = ' '
      bytes = 1
    }
    cur += ch
    bytes += b
  }
  out.push(cur)
  return out.join('\r\n')
}

/** "2026-12-10" + "09:30" (현지) → "20261210T003000Z" */
export function localToUtcStamp(date: string, hhmm: string, timeZone: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const guess = Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10), h, m)
  const off = tzOffsetSec(timeZone, new Date(guess)) ?? 0
  return new Date(guess - off * 1000).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

const ICON: Record<string, string> = { spot: '📍', lunch: '🍽️', dinner: '🍽️', cafe: '☕' }

export function planToIcs(plan: Plan, opts: { placeName: string; countryName: string; timeZone: string }): string {
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//hidden-travel//plan//KO', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${esc(`숨은여행 ${opts.countryName} ${opts.placeName}`)}`]
  for (const d of plan.days) {
    const items = d.items.filter((it) => it.kind !== 'move')
    items.forEach((it, i) => {
      const next = items[i + 1]
      // 끝 시각: 다음 일정 시작, 마지막은 1시간
      const [h, m] = it.time.split(':').map(Number)
      const endHHMM = next?.time ?? `${String(Math.min(23, h + 1)).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      const lat = it.spot?.lat ?? it.eatery?.lat ?? it.lat
      const lng = it.spot?.lng ?? it.eatery?.lng ?? it.lng
      lines.push(
        'BEGIN:VEVENT',
        `UID:${d.date}-${i}-${it.title.length}-${Math.abs([...it.title].reduce((a, c) => (a * 31 + c.codePointAt(0)!) | 0, 7))}@hidden-travel`,
        `DTSTAMP:${now}`,
        `DTSTART:${localToUtcStamp(d.date, it.time, opts.timeZone)}`,
        `DTEND:${localToUtcStamp(d.date, endHHMM, opts.timeZone)}`,
        fold(`SUMMARY:${esc(`${ICON[it.kind] ?? ''} ${it.title}`.trim())}`),
        ...(it.detail ? [fold(`DESCRIPTION:${esc(`${it.detail}\n숨은여행 자동 일정 · 영업시간은 방문 전에 확인하세요`)}`)] : []),
        fold(`LOCATION:${esc(`${it.title}, ${opts.placeName}`)}`),
        ...(lat != null && lng != null ? [`GEO:${lat.toFixed(5)};${lng.toFixed(5)}`] : []),
        'END:VEVENT',
      )
    })
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}
