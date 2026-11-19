import { useEffect, useRef, useState, type ReactNode } from 'react'

/** 화면 가까이(위아래 600px) 올 때 처음 그린다. 무거운 요청을 필요할 때까지 미룬다. */
export function WhenVisible({ children, placeholder }: { children: ReactNode; placeholder: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    if (seen || !ref.current) return
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setSeen(true), { rootMargin: '600px 0px' })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [seen])
  return <div ref={ref}>{seen ? children : placeholder}</div>
}
