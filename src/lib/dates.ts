/** 날짜 문자열(YYYY-MM-DD)을 시간대 영향 없이 다루기 위한 도우미 */
const toUTC = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}
export const fmt = (t: number) => new Date(t).toISOString().slice(0, 10)

export const todayStr = () => {
  const n = new Date()
  return fmt(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()))
}
export const addDays = (s: string, n: number) => fmt(toUTC(s) + n * 86400000)
export const diffDays = (a: string, b: string) => Math.round((toUTC(b) - toUTC(a)) / 86400000)
export const isWithin = (d: string, start: string, end: string) => d >= start && d <= end

const WEEK = ['일', '월', '화', '수', '목', '금', '토']
export const weekdayKo = (s: string) => WEEK[new Date(toUTC(s)).getUTCDay()]
export const formatKo = (s: string) => {
  const [, m, d] = s.split('-').map(Number)
  return `${m}월 ${d}일 (${weekdayKo(s)})`
}
