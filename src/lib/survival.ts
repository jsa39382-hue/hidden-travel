import { useEffect, useState } from 'react'

export interface Tip {
  lang: string
  language: string
  emergency?: string
  entry?: string
  tipping: string
  water: string
  payment: string
  transport: string
  tips: string[]
  phrases: { ko: string; local: string; say: string }[]
}
export interface Facts {
  plugs?: string[]
  voltage?: number
  driving?: 'left' | 'right'
  calling?: string
  emergency?: string[]
  languages?: string[]
  population?: number
  areaKm2?: number
  continents?: string[]
  tld?: string
}

export type SurvivalData = typeof import('./survivalData')
let loading: Promise<SurvivalData> | null = null
/** 팁·생활 정보 데이터를 처음 필요할 때 불러온다 */
export const loadSurvival = () => (loading ??= import('./survivalData'))

/** 데이터가 준비되면 반환 (그 전에는 null) */
export function useSurvival(): SurvivalData | null {
  const [data, setData] = useState<SurvivalData | null>(null)
  useEffect(() => {
    let alive = true
    loadSurvival().then((d) => alive && setData(d))
    return () => {
      alive = false
    }
  }, [])
  return data
}

/** 한국 콘센트(C·F형, 220V) 기준 비교 */
export function plugAdvice(f: Facts) {
  if (!f.plugs?.length) return { value: '정보 없음', note: '' }
  const ok = f.plugs.some((p) => p === 'C' || p === 'F' || p === 'E')
  return {
    value: `${f.plugs.join('·')}형`,
    note: ok ? (f.plugs.every((p) => ['C', 'E', 'F'].includes(p)) ? '한국 플러그 그대로 써요' : '한국 플러그가 맞는 곳도 있지만 어댑터가 있으면 안심') : '변환 어댑터가 필요해요',
    warn: !ok,
  }
}

export function voltageAdvice(v?: number) {
  if (!v) return { value: '정보 없음', note: '' }
  return v < 200
    ? { value: `${v}V`, note: '한국(220V)과 달라요. 충전기에 100~240V 표시가 있는지 확인하세요', warn: true }
    : { value: `${v}V`, note: '한국과 비슷해요' }
}

export function timeDiff(offsetSec?: number) {
  if (offsetSec == null) return null
  const diffH = (offsetSec - 9 * 3600) / 3600
  if (diffH === 0) return { value: '시차 없음', note: '한국과 같은 시간이에요' }
  const abs = Math.abs(diffH)
  const h = Number.isInteger(abs) ? `${abs}시간` : `${Math.floor(abs)}시간 ${Math.round((abs % 1) * 60)}분`
  return { value: diffH > 0 ? `+${h}` : `−${h}`, note: diffH > 0 ? `한국보다 ${h} 빨라요` : `한국보다 ${h} 느려요` }
}

