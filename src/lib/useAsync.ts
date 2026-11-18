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
export function useAsync<T>(fn: ((force: boolean) => Promise<T>) | null, deps: unknown[]) {
  const [state, setState] = useState<AsyncState<T>>({ status: 'idle' })
  const seq = useRef(0)

  const run = useCallback(
    (force = false) => {
      if (!fn) {
        setState({ status: 'idle' })
        return
      }
      const id = ++seq.current
      setState({ status: 'loading' })
      fn(force).then(
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

  return { ...state, retry: () => run(true) } as AsyncState<T> & { retry: () => void }
}
