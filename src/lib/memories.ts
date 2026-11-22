import { useEffect } from 'react'
import { useStored } from './stored'
import { newId } from './settle'

/** 추억 앨범의 여행 하나 (이미지는 저장하지 않고 내용만 저장 → 볼 때 다시 그린다) */
export interface TripMemory {
  id: string
  code: string
  name: string
  place: { name: string; lat: number; lng: number }
  start: string
  end: string
  spots: { id: string; name: string; image?: string }[]
  spent: number | null
  memo: string
  photoIds: string[]
  updatedAt: number
  /** 숨은 탐험가 등급 (관심 목록의 평균 숨은 정도) */
  explorer?: { level: number; title: string; avg: number } | null
}

export const MEMORY_KEY = 'hidden-travel:memories'
const MIGRATED_KEY = 'hidden-travel:memories-migrated'
export const MAX_PHOTOS = 6
export const MAX_MEMO = 80

const isMemory = (m: unknown): m is TripMemory => {
  const x = m as TripMemory
  return !!x && typeof x.id === 'string' && typeof x.code === 'string' && typeof x.start === 'string' && typeof x.end === 'string' && !!x.place && Array.isArray(x.spots) && Array.isArray(x.photoIds)
}
const valid = (v: unknown) => Array.isArray(v) && v.every(isMemory)

/** 예전 'hidden-travel:trips' 기록을 처음 한 번만 옮겨 담는다 (기존 키는 지우지 않음) */
function migrate(list: TripMemory[]): TripMemory[] | null {
  try {
    if (localStorage.getItem(MIGRATED_KEY)) return null
    localStorage.setItem(MIGRATED_KEY, '1')
    const old = JSON.parse(localStorage.getItem('hidden-travel:trips') ?? '[]') as { code?: string; name?: string; start?: string; end?: string }[]
    if (!Array.isArray(old) || !old.length) return null
    const add = old
      .filter((t) => t.code && t.start && t.end && !list.some((m) => m.code === t.code && m.start === t.start))
      .map<TripMemory>((t) => ({
        id: newId(),
        code: t.code!,
        name: t.name ?? t.code!,
        place: { name: t.name ?? t.code!, lat: 0, lng: 0 },
        start: t.start!,
        end: t.end!,
        spots: [],
        spent: null,
        memo: '',
        photoIds: [],
        updatedAt: Date.now(),
      }))
    return add.length ? [...list, ...add] : null
  } catch {
    return null
  }
}

export const sortMemories = (list: TripMemory[]) => [...list].sort((a, b) => b.start.localeCompare(a.start) || b.updatedAt - a.updatedAt)

export function useMemories() {
  const [list, setList] = useStored<TripMemory[]>(MEMORY_KEY, [], valid)
  useEffect(() => {
    const next = migrate(list)
    if (next) setList(next)
    // 처음 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return {
    list,
    /** 같은 나라+시작일이 있으면 고치고, 없으면 추가 */
    upsert: (m: Omit<TripMemory, 'id' | 'memo' | 'photoIds' | 'updatedAt'> & Partial<Pick<TripMemory, 'memo' | 'photoIds'>>) =>
      setList((l) => {
        const i = l.findIndex((x) => x.code === m.code && x.start === m.start)
        if (i < 0) return [...l, { id: newId(), memo: '', photoIds: [], ...m, updatedAt: Date.now() }]
        const next = [...l]
        next[i] = { ...next[i], ...m, memo: m.memo ?? next[i].memo, photoIds: m.photoIds ?? next[i].photoIds, updatedAt: Date.now() }
        return next
      }),
    update: (id: string, patch: Partial<TripMemory>) => setList((l) => l.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: Date.now() } : x))),
    remove: (id: string) => setList((l) => l.filter((x) => x.id !== id)),
    restore: (m: TripMemory) => setList((l) => (l.some((x) => x.id === m.id) ? l : [...l, m])),
  }
}
