import { describeFailure } from './osm'

/**
 * Overpass(OpenStreetMap 검색 서버)가 응답하지 않는 네트워크가 있다 (2026-11 사용자 환경에서 가장 작은 검색도 30초 초과 확인).
 * 그래서 Overpass와 대체 경로를 겨루게 하고, Overpass가 한 번 완전히 실패하면 15분 동안은 대체 경로만 쓴다.
 */
const KEY = 'hidden-travel:overpass-down-until'
const DOWN_MS = 15 * 60 * 1000

export function overpassLikelyDown() {
  try {
    return Number(sessionStorage.getItem(KEY) ?? 0) > Date.now()
  } catch {
    return false
  }
}
function setDown(down: boolean) {
  try {
    if (down) sessionStorage.setItem(KEY, String(Date.now() + DOWN_MS))
    else sessionStorage.removeItem(KEY)
  } catch {
    /* 무시 */
  }
}

export type Source = 'osm' | 'fallback'

export function raceWithFallback<T>(
  primary: (signal: AbortSignal) => Promise<T>,
  fallback: (signal: AbortSignal) => Promise<T>,
  { delayMs = 2500, signal }: { delayMs?: number; signal?: AbortSignal } = {},
): Promise<{ data: T; source: Source }> {
  return new Promise((resolve, reject) => {
    const pCtrl = new AbortController()
    const fCtrl = new AbortController()
    let done = false
    let pErr: unknown = null
    let fErr: unknown = null
    let fStarted = false
    let pStarted = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const finish = (fn: () => void) => {
      if (done) return
      done = true
      clearTimeout(timer)
      fn()
    }
    signal?.addEventListener(
      'abort',
      () =>
        finish(() => {
          pCtrl.abort()
          fCtrl.abort()
          reject(new DOMException('요청을 취소했어요', 'AbortError'))
        }),
      { once: true },
    )
    const bothFailed = () => {
      if ((!pStarted || pErr) && fErr)
        finish(() =>
          reject(
            new Error(
              `${pStarted ? `${pErr instanceof Error && /[가-힣]/.test(pErr.message) ? pErr.message : describeFailure(pErr)} / ` : ''}대체 경로도 실패 — ${describeFailure(fErr)}`,
            ),
          ),
        )
    }
    const startFallback = () => {
      if (fStarted || done) return
      fStarted = true
      fallback(fCtrl.signal).then(
        (data) =>
          finish(() => {
            pCtrl.abort()
            resolve({ data, source: 'fallback' })
          }),
        (e) => {
          fErr = e
          bothFailed()
        },
      )
    }

    if (overpassLikelyDown()) {
      startFallback()
      return
    }
    pStarted = true
    primary(pCtrl.signal).then(
      (data) =>
        finish(() => {
          setDown(false)
          fCtrl.abort()
          resolve({ data, source: 'osm' })
        }),
      (e) => {
        if (done) return
        pErr = e
        setDown(true)
        if (fStarted) bothFailed()
        else startFallback()
      },
    )
    timer = setTimeout(startFallback, delayMs)
  })
}
