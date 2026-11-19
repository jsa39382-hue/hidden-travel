import { useCallback, useEffect, useRef, useState } from 'react'

export type AsyncState<T> =
  | { status: 'idle'; data?: undefined; error?: undefined }
  | { status: 'loading'; data?: undefined; error?: undefined }
  | { status: 'success'; data: T; error?: undefined }
  | { status: 'error'; data?: undefined; error: Error }

/**
 * 비동기 함수를 실행하고 로딩/성공/실패 상태와 재시도 함수를 돌려준다.
 * deps가 바뀌면 다시 실행하고, 이전 요청의 늦은 응답은 버린다.
 */
export function useAsync<T>(fn: ((force: boolean, signal: AbortSignal) => Promise<T>) | null, deps: unknown[]) {
  const [state, setState] = useState<AsyncState<T>>({ status: 'idle' })
  const seq = useRef(0)
  const ctrl = useRef<AbortController | null>(null)

  const run = useCallback(
    (force = false) => {
      if (!fn) {
        setState({ status: 'idle' })
        return
      }
      const id = ++seq.current
      // 이전 요청은 더 이상 필요 없으므로 취소 (같은 요청을 기다리는 다른 곳이 있으면 실제 취소는 안 됨)
      ctrl.current?.abort()
      const c = (ctrl.current = new AbortController())
      setState({ status: 'loading' })
      fn(force, c.signal).then(
        (data) => id === seq.current && setState({ status: 'success', data }),
        (error: unknown) =>
          id === seq.current && setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) }),
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  )

  useEffect(() => {
    run(false)
  }, [run])
  useEffect(() => () => ctrl.current?.abort(), [])

  return { ...state, retry: () => run(true) } as AsyncState<T> & { retry: () => void }
}
