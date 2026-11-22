import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

export interface Phrase {
  ko: string
  local: string
  say: string
}

const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window

/** 현지어로 읽기 (기기에 그 언어 목소리가 있으면 그 목소리로) */
export function speakLocal(text: string, lang: string, rate = 0.85) {
  try {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    u.rate = rate
    const voice = speechSynthesis.getVoices().find((v) => v.lang.replace('_', '-').toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()))
    if (voice) u.voice = voice
    speechSynthesis.cancel()
    speechSynthesis.speak(u)
  } catch {
    /* 음성 읽기를 지원하지 않는 브라우저 */
  }
}

/** 그 언어 목소리가 기기에 있는지 (목록이 늦게 오는 브라우저가 있어 기다린다) */
function useHasVoice(lang: string) {
  const [has, setHas] = useState<boolean | null>(null)
  useEffect(() => {
    if (!canSpeak()) return setHas(false)
    const check = () => {
      const list = speechSynthesis.getVoices()
      if (list.length) setHas(list.some((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase())))
    }
    check()
    speechSynthesis.addEventListener?.('voiceschanged', check)
    return () => speechSynthesis.removeEventListener?.('voiceschanged', check)
  }, [lang])
  return has
}

/** 현지 생존 문장: 듣기(천천히·보통)와 '크게 보여 주기'(택시·식당에서 화면을 그대로 보여 줌) */
export function Phrases({ phrases, lang, title = '현지 생존 문장' }: { phrases: Phrase[]; lang: string; title?: string }) {
  const [show, setShow] = useState<Phrase | null>(null)
  const hasVoice = useHasVoice(lang)
  const speakable = canSpeak()
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-stone-500">{title}</p>
      <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200">
        {phrases.map((p) => (
          <li key={p.ko} className="flex items-center gap-2 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-stone-500">{p.ko}</p>
              <p className="truncate font-semibold">{p.local.split(' / ')[0]}</p>
              <p className="truncate text-xs text-stone-500">[{p.say}]</p>
            </div>
            {speakable && (
              <button
                type="button"
                onClick={() => speakLocal(p.local.split(' / ')[0], lang)}
                aria-label={`${p.ko} 현지어로 듣기`}
                className="flex size-11 shrink-0 items-center justify-center rounded-full border border-stone-300 text-stone-700 active:bg-stone-100"
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                  <path d="M4 9v6h4l5 4V5L8 9H4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" strokeLinejoin="round" strokeLinecap="round" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShow(p)}
              aria-label={`${p.ko} 크게 보여 주기`}
              className="h-11 shrink-0 rounded-full border border-stone-300 px-3 text-xs font-medium text-stone-700 active:bg-stone-100"
            >
              보여 주기
            </button>
          </li>
        ))}
      </ul>
      {speakable && hasVoice === false && <p className="mt-1.5 text-[11px] text-stone-500">이 기기에는 이 언어 목소리가 없어서 다른 목소리로 읽을 수 있어요. 그럴 땐 '보여 주기'를 써 보세요.</p>}

      <AnimatePresence>
        {show && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${show.ko} 크게 보기`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setShow(null)}
            className="fixed inset-0 z-[2100] flex flex-col items-center justify-center gap-6 bg-white p-8 text-center"
          >
            <p className="text-sm text-stone-500">{show.ko}</p>
            <p className="max-w-full text-[clamp(2rem,11vw,4.5rem)] font-extrabold leading-tight [overflow-wrap:anywhere]" lang={lang}>
              {show.local.split(' / ')[0]}
            </p>
            <p className="text-base text-stone-500">[{show.say}]</p>
            <div className="mt-4 flex gap-3" onClick={(e) => e.stopPropagation()}>
              {speakable && (
                <>
                  <button type="button" onClick={() => speakLocal(show.local.split(' / ')[0], lang, 0.7)} className="h-12 rounded-full border border-stone-300 px-5 text-sm font-semibold">
                    천천히 듣기
                  </button>
                  <button type="button" onClick={() => speakLocal(show.local.split(' / ')[0], lang, 1)} className="h-12 rounded-full border border-stone-300 px-5 text-sm font-semibold">
                    보통 속도
                  </button>
                </>
              )}
              <button type="button" onClick={() => setShow(null)} className="h-12 rounded-full bg-stone-900 px-5 text-sm font-semibold text-stone-50">
                닫기
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
