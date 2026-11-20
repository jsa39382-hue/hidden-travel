/**
 * 내 기록 백업: 이 기기에만 저장된 기록(여행 설정·추억 앨범·짐 체크·정산·찜 등)을 파일 하나로 내보내고 다시 불러온다.
 * 서버 없이 다른 기기로 옮기거나, 브라우저 데이터를 지우기 전에 보관하는 용도.
 * API 응답 캐시(hidden-travel:v1:)는 다시 받으면 되므로 넣지 않는다.
 */
import { MEMORY_KEY, type TripMemory } from './memories'
import { getPhoto, photosAvailable, putPhoto } from './photos'

const APP = 'hidden-travel-backup'
const VERSION = 1
const SKIP = [/^hidden-travel:v1:/, /^hidden-travel:overpass-down-until$/, /^hidden-travel:install-dismissed$/]

export interface BackupFile {
  app: typeof APP
  version: number
  exportedAt: string
  stored: Record<string, string>
  /** 사진 아이디 → data URL (JPEG) */
  photos: Record<string, string>
}

export interface BackupSummary {
  exportedAt: string
  keys: number
  trips: number
  photos: number
}

function storedEntries(): Record<string, string> {
  const out: Record<string, string> = {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k || !k.startsWith('hidden-travel:') || SKIP.some((r) => r.test(k))) continue
      const v = localStorage.getItem(k)
      if (v != null) out[k] = v
    }
  } catch {
    /* 저장소를 못 쓰면 빈 백업 */
  }
  return out
}

function memoriesOf(stored: Record<string, string>): TripMemory[] {
  try {
    const v = JSON.parse(stored[MEMORY_KEY] ?? '[]')
    return Array.isArray(v) ? (v as TripMemory[]) : []
  } catch {
    return []
  }
}

const toDataUrl = (b: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result))
    r.onerror = () => rej(r.error)
    r.readAsDataURL(b)
  })

/** 사진 개수와 대략의 크기 (백업 전에 보여 주기) */
export async function photoStats(): Promise<{ count: number; bytes: number }> {
  if (!(await photosAvailable())) return { count: 0, bytes: 0 }
  const ids = memoriesOf(storedEntries()).flatMap((m) => m.photoIds ?? [])
  let bytes = 0
  let count = 0
  for (const id of ids) {
    const b = await getPhoto(id).catch(() => undefined)
    if (b) (count++, (bytes += b.size))
  }
  return { count, bytes }
}

/** 백업 파일 만들기 */
export async function makeBackup(withPhotos: boolean): Promise<Blob> {
  const stored = storedEntries()
  const photos: Record<string, string> = {}
  if (withPhotos && (await photosAvailable())) {
    for (const id of memoriesOf(stored).flatMap((m) => m.photoIds ?? [])) {
      const b = await getPhoto(id).catch(() => undefined)
      if (b) photos[id] = await toDataUrl(b)
    }
  }
  const file: BackupFile = { app: APP, version: VERSION, exportedAt: new Date().toISOString(), stored, photos }
  return new Blob([JSON.stringify(file)], { type: 'application/json' })
}

/** 백업 파일 읽기 + 형식 검사 */
export async function readBackup(file: File): Promise<{ data: BackupFile; summary: BackupSummary }> {
  let v: unknown
  try {
    v = JSON.parse(await file.text())
  } catch {
    throw new Error('백업 파일을 읽지 못했어요 (JSON 형식이 아니에요)')
  }
  const d = v as Partial<BackupFile>
  if (!d || d.app !== APP || typeof d.stored !== 'object' || d.stored == null) throw new Error('숨은여행 백업 파일이 아니에요')
  if ((d.version ?? 0) > VERSION) throw new Error('더 새로운 버전에서 만든 백업이에요. 사이트를 새로고침한 뒤 다시 해 주세요')
  const stored: Record<string, string> = {}
  for (const [k, val] of Object.entries(d.stored)) if (k.startsWith('hidden-travel:') && !SKIP.some((r) => r.test(k)) && typeof val === 'string') stored[k] = val
  const photos: Record<string, string> = {}
  for (const [k, val] of Object.entries(d.photos ?? {})) if (/^p-[\w-]+$/.test(k) && typeof val === 'string' && val.startsWith('data:image/')) photos[k] = val
  const data: BackupFile = { app: APP, version: VERSION, exportedAt: String(d.exportedAt ?? ''), stored, photos }
  return { data, summary: { exportedAt: data.exportedAt, keys: Object.keys(stored).length, trips: memoriesOf(stored).length, photos: Object.keys(photos).length } }
}

/**
 * 백업 적용: 추억 앨범은 아이디 기준으로 합치고(지금 기기에만 있는 여행은 남긴다),
 * 나머지 설정은 백업 값으로 바꾼다. 사진은 같은 아이디로 되살린다.
 */
export async function applyBackup(data: BackupFile): Promise<void> {
  const current = memoriesOf(storedEntries())
  const incoming = memoriesOf(data.stored)
  const merged = new Map(current.map((m) => [m.id, m]))
  for (const m of incoming) {
    const old = merged.get(m.id)
    if (!old || (m.updatedAt ?? 0) >= (old.updatedAt ?? 0)) merged.set(m.id, m)
  }
  for (const [k, v] of Object.entries(data.stored)) {
    if (k === MEMORY_KEY) continue
    localStorage.setItem(k, v)
  }
  localStorage.setItem(MEMORY_KEY, JSON.stringify([...merged.values()]))
  if (await photosAvailable()) {
    for (const [id, url] of Object.entries(data.photos)) {
      const blob = await (await fetch(url)).blob()
      await putPhoto(id, blob)
    }
  }
}
