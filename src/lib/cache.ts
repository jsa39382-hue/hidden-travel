/**
 * localStorage 기반 응답 캐시.
 * 사생활 보호 모드 등에서 localStorage가 막혀 있어도 앱이 동작하도록 모든 접근을 try/catch로 감싼다.
 */
const PREFIX = 'hidden-travel:v1:'

export const HOUR = 60 * 60 * 1000
export const DAY = 24 * HOUR

interface Entry<T> {
  savedAt: number
  data: T
}

export function readCache<T>(key: string, ttlMs: number): { data: T; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const entry = JSON.parse(raw) as Entry<T>
    if (Date.now() - entry.savedAt > ttlMs) return null
    return entry
  } catch {
    return null
  }
}

/** 만료됐더라도 남아 있는 캐시 (네트워크 실패 시 비상용) */
export function readStale<T>(key: string): { data: T; savedAt: number } | null {
  return readCache<T>(key, Number.POSITIVE_INFINITY)
}

export function writeCache<T>(key: string, data: T) {
  const entry: Entry<T> = { savedAt: Date.now(), data }
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(entry))
  } catch {
    // 용량 초과 시 오래된 항목을 지우고 한 번 더 시도
    try {
      pruneCache()
      localStorage.setItem(PREFIX + key, JSON.stringify(entry))
    } catch {
      /* 캐시 없이 진행 */
    }
  }
}

function pruneCache() {
  const items: [string, number][] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k?.startsWith(PREFIX)) continue
    try {
      items.push([k, (JSON.parse(localStorage.getItem(k) ?? '{}') as Entry<unknown>).savedAt ?? 0])
    } catch {
      items.push([k, 0])
    }
  }
  items.sort((a, b) => a[1] - b[1]).slice(0, Math.ceil(items.length / 2)).forEach(([k]) => localStorage.removeItem(k))
}

export class HttpError extends Error {
  status: number
  constructor(status: number, url: string) {
    super(`HTTP ${status} (${new URL(url).host})`)
    this.status = status
  }
}

/** 타임아웃이 있는 JSON fetch */
export async function fetchJson<T>(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const { timeoutMs = 15000, ...rest } = init
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...rest, signal: rest.signal ?? ctrl.signal })
    if (!res.ok) throw new HttpError(res.status, url)
    return (await res.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

const inflight = new Map<string, Promise<unknown>>()

/** 같은 키로 동시에 들어온 요청은 하나의 네트워크 호출로 합친다. */
function dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const running = inflight.get(key) as Promise<T> | undefined
  if (running) return running
  const p = fn().finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}

/**
 * 캐시 우선 조회. 캐시가 유효하면 네트워크를 쓰지 않는다.
 * 네트워크가 실패하면 만료된 캐시라도 돌려주고 stale=true로 표시한다.
 */
export async function cachedJson<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
  { force = false } = {},
): Promise<{ data: T; savedAt: number; stale: boolean }> {
  if (!force) {
    const hit = readCache<T>(key, ttlMs)
    if (hit) return { ...hit, stale: false }
  }
  try {
    const data = await dedupe(key, async () => {
      const d = await loader()
      writeCache(key, d)
      return d
    })
    return { data, savedAt: Date.now(), stale: false }
  } catch (err) {
    const old = readStale<T>(key)
    if (old) return { ...old, stale: true }
    throw err
  }
}

/** 화면에 보여 줄 한국어 오류 원인 */
export function errorReasonKo(e: unknown): string {
  if (e instanceof HttpError) {
    if (e.status === 429) return '요청이 너무 많아 서버가 잠시 막았어요. 잠시 뒤 다시 시도해 주세요.'
    if (e.status >= 500) return `서버에 일시적인 문제가 있어요. (오류 ${e.status})`
    return `서버가 요청을 처리하지 못했어요. (오류 ${e.status})`
  }
  if (e instanceof DOMException && (e.name === 'AbortError' || e.name === 'TimeoutError')) return '서버 응답이 너무 늦어요.'
  if (e instanceof TypeError) return '인터넷 연결을 확인해 주세요.'
  if (e instanceof SyntaxError) return '서버 응답을 읽지 못했어요.'
  return e instanceof Error && /[가-힣]/.test(e.message) ? e.message : '알 수 없는 오류가 났어요.'
}
