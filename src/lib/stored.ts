import { useEffect, useRef, useState } from 'react'

const EVENT = 'hidden-travel:stored'

/**
 * localStorage에 저장되는 상태 (막혀 있으면 메모리에서만 동작).
 * 같은 키를 쓰는 다른 컴포넌트와 값이 바로 맞춰진다.
 */
export function useStored<T>(key: string, init: T, valid: (v: unknown) => boolean = () => true) {
  const read = (): T => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const v = JSON.parse(raw)
        if (valid(v)) return v as T
      }
    } catch {
      /* 무시 */
    }
    return init
  }
  const [value, setValue] = useState<T>(read)
  const last = useRef(JSON.stringify(value))
  // 키가 바뀌면(다른 나라·도시) 그 키의 값을 다시 읽는다
  const [k, setK] = useState(key)
  if (k !== key) {
    setK(key)
    setValue(read())
  }
  useEffect(() => {
    const json = JSON.stringify(value)
    if (json === last.current && localStorage.getItem(key) === json) return
    last.current = json
    try {
      localStorage.setItem(key, json)
    } catch {
      /* 무시 */
    }
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { key, json } }))
  }, [key, value])
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ key: string; json: string }>).detail
      if (d.key !== key || d.json === last.current) return
      last.current = d.json
      setValue(JSON.parse(d.json) as T)
    }
    window.addEventListener(EVENT, on)
    return () => window.removeEventListener(EVENT, on)
  }, [key])
  return [value, setValue] as const
}
