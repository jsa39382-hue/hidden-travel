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

interface Inflight {
  promise: Promise<unknown>
  ctrl: AbortController
  refs: number
}
const inflight = new Map<string, Inflight>()

const abortError = () => new DOMException('요청을 취소했어요', 'AbortError')

/**
 * 같은 키로 동시에 들어온 요청은 하나의 네트워크 호출로 합친다.
 * 기다리는 쪽이 모두 취소했을 때만 실제 요청을 취소한다.
 */
function dedupe<T>(key: string, fn: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal): Promise<T> {
  let entry = inflight.get(key)
  if (!entry || entry.ctrl.signal.aborted) {
    const ctrl = new AbortController()
    const created: Inflight = { promise: Promise.resolve(), ctrl, refs: 0 }
    created.promise = fn(ctrl.signal).finally(() => {
      if (inflight.get(key) === created) inflight.delete(key)
    })
    created.promise.catch(() => undefined)
    inflight.set(key, created)
    entry = created
  }
  const e = entry
  if (!signal) {
    // 취소 신호 없이 기다리는 쪽이 있으면 실제 요청은 끝까지 유지
    e.refs += 1_000_000
    return e.promise as Promise<T>
  }
  if (signal.aborted) return Promise.reject(abortError())
  e.refs++
  return new Promise<T>((resolve, reject) => {
    let settled = false
    const onAbort = () => {
      if (settled) return
      settled = true
      e.refs--
      reject(abortError())
      // 같은 순간에 다시 구독하는 경우(React 개발 모드의 이중 실행 등)를 위해 한 틱 뒤에 판단
      setTimeout(() => {
        if (e.refs <= 0) e.ctrl.abort()
      }, 0)
    }
    signal.addEventListener('abort', onAbort, { once: true })
    const done = () => {
      signal.removeEventListener('abort', onAbort)
      if (settled) return false
      settled = true
      e.refs--
      return true
    }
    ;(e.promise as Promise<T>).then(
      (v) => done() && resolve(v),
      (err) => done() && reject(err),
    )
  })
}

/**
 * 캐시 우선 조회. 캐시가 유효하면 네트워크를 쓰지 않는다.
 * 네트워크가 실패하면 만료된 캐시라도 돌려주고 stale=true로 표시한다.
 * signal로 취소하면 AbortError로 끝난다 (만료 캐시로 대신하지 않음).
 */
export async function cachedJson<T>(
  key: string,
  ttlMs: number,
  loader: (signal: AbortSignal) => Promise<T>,
  { force = false, signal }: { force?: boolean; signal?: AbortSignal } = {},
): Promise<{ data: T; savedAt: number; stale: boolean }> {
  if (!force) {
    const hit = readCache<T>(key, ttlMs)
    if (hit) return { ...hit, stale: false }
  }
  try {
    const data = await dedupe(
      key,
      async (sig) => {
        const d = await loader(sig)
        writeCache(key, d)
        return d
      },
      signal,
    )
    return { data, savedAt: Date.now(), stale: false }
  } catch (err) {
    if (signal?.aborted) throw err
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

/** 예전 버전 키·오래된 항목을 지운다 (앱 시작 시 한 번) */
const OBSOLETE = ['spots:v1:', 'lodging:v1:', 'spots:base:v2:', 'spots:fame:v2:', 'spots:base:v3:', 'spots:fame:v3:', 'nearby:v1:', 'nearby:v2:', 'weather:v1:']
const MAX_AGE = 14 * DAY
export function cleanupCache() {
  try {
    const remove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k?.startsWith(PREFIX)) continue
      const rest = k.slice(PREFIX.length)
      if (OBSOLETE.some((o) => rest.startsWith(o))) {
        remove.push(k)
        continue
      }
      try {
        const e = JSON.parse(localStorage.getItem(k) ?? '{}') as Entry<unknown>
        if (!e.savedAt || Date.now() - e.savedAt > MAX_AGE) remove.push(k)
      } catch {
        remove.push(k)
      }
    }
    remove.forEach((k) => localStorage.removeItem(k))
  } catch {
    /* localStorage를 쓸 수 없는 환경 */
  }
}

/** 저장된 응답 캐시 크기(KB) */
export function cacheSizeKb() {
  let n = 0
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith(PREFIX)) n += k.length + (localStorage.getItem(k)?.length ?? 0)
    }
  } catch {
    return 0
  }
  return Math.round((n * 2) / 1024)
}

/** 응답 캐시 전부 지우기 (여행 설정은 남김) */
export function clearCache() {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith(PREFIX)) keys.push(k)
    }
    keys.forEach((k) => localStorage.removeItem(k))
  } catch {
    /* 무시 */
  }
}
