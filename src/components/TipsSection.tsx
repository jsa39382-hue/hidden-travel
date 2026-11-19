import tipsRaw from '../data/tips.json'
import factsRaw from '../data/country-facts.json'
import type { Country, Place } from '../types'
import { useAsync } from '../lib/useAsync'
import { getWeather } from '../lib/weather'

interface Tip {
  lang: string
  language: string
  emergency?: string
  entry?: string
  tipping: string
  water: string
  payment: string
  transport: string
  tips: string[]
  phrases: { ko: string; local: string; say: string }[]
}
interface Facts {
  plugs?: string[]
  voltage?: number
  driving?: 'left' | 'right'
  calling?: string
  emergency?: string[]
  languages?: string[]
}
const TIPS = tipsRaw as unknown as Record<string, Tip>
const FACTS = factsRaw as unknown as Record<string, Facts>

/** 한국 콘센트(C·F형, 220V) 기준 비교 */
function plugAdvice(f: Facts) {
  if (!f.plugs?.length) return { value: '정보 없음', note: '' }
  const ok = f.plugs.some((p) => p === 'C' || p === 'F' || p === 'E')
  return {
    value: `${f.plugs.join('·')}형`,
    note: ok ? (f.plugs.every((p) => ['C', 'E', 'F'].includes(p)) ? '한국 플러그 그대로 써요' : '한국 플러그가 맞는 곳도 있지만 어댑터가 있으면 안심') : '변환 어댑터가 필요해요',
    warn: !ok,
  }
}

function voltageAdvice(v?: number) {
  if (!v) return { value: '정보 없음', note: '' }
  return v < 200
    ? { value: `${v}V`, note: '한국(220V)과 달라요. 충전기에 100~240V 표시가 있는지 확인하세요', warn: true }
    : { value: `${v}V`, note: '한국과 비슷해요' }
}

function timeDiff(offsetSec?: number) {
  if (offsetSec == null) return null
  const diffH = (offsetSec - 9 * 3600) / 3600
  if (diffH === 0) return { value: '시차 없음', note: '한국과 같은 시간이에요' }
  const abs = Math.abs(diffH)
  const h = Number.isInteger(abs) ? `${abs}시간` : `${Math.floor(abs)}시간 ${Math.round((abs % 1) * 60)}분`
  return { value: diffH > 0 ? `+${h}` : `−${h}`, note: diffH > 0 ? `한국보다 ${h} 빨라요` : `한국보다 ${h} 느려요` }
}

function speak(text: string, lang: string) {
  try {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    u.rate = 0.85
    speechSynthesis.cancel()
    speechSynthesis.speak(u)
  } catch {
    /* 음성 읽기를 지원하지 않는 브라우저 */
  }
}

export function TipsSection({ country, place }: { country: Country; place: Place }) {
  const tip = TIPS[country.code]
  const facts = FACTS[country.code] ?? {}
  const w = useAsync(() => getWeather(place.lat, place.lng), [place.lat, place.lng])
  const td = timeDiff(w.status === 'success' ? w.data.data.utcOffsetSec : undefined)
  const plug = plugAdvice(facts)
  const volt = voltageAdvice(facts.voltage)
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

  const cards: { label: string; value: string; note?: string; warn?: boolean }[] = [
    { label: '시차', value: td?.value ?? (w.status === 'loading' ? '…' : '정보 없음'), note: td ? `${td.note} (${place.name} 기준)` : undefined },
    { label: '콘센트', ...plug },
    { label: '전압', ...volt },
    { label: '운전 방향', value: facts.driving === 'left' ? '좌측통행' : facts.driving === 'right' ? '우측통행' : '정보 없음', note: facts.driving === 'left' ? '한국과 반대예요. 길 건널 때 오른쪽부터 보세요' : undefined, warn: facts.driving === 'left' },
    { label: '긴급 전화', value: tip?.emergency ?? facts.emergency?.join(' · ') ?? '정보 없음' },
    { label: '국가 번호', value: facts.calling ?? '정보 없음', note: facts.calling ? `한국에서 걸 때: 001 + ${facts.calling.replace('+', '')} + 앞의 0을 뺀 번호` : undefined },
    { label: '언어', value: tip?.language ?? facts.languages?.join(' · ') ?? '정보 없음' },
    { label: '통화', value: `${country.currencyNameKo ?? country.currency} (${country.currency})` },
  ]

  return (
    <div className="space-y-8">
      {/* 기본 정보 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-stone-200 bg-white p-4">
            <p className="text-xs text-stone-500">{c.label}</p>
            <p className={`mt-1.5 font-semibold leading-snug ${c.warn ? 'text-amber-700' : ''}`}>{c.value}</p>
            {c.note && <p className="mt-1 text-[11px] leading-snug text-stone-500">{c.note}</p>}
          </div>
        ))}
      </div>

      {tip ? (
        <>
          {tip.entry && (
            <p className="border-l-2 border-amber-700 pl-4 text-sm text-stone-700">
              <span className="mb-0.5 block text-xs text-stone-500">입국 전 준비</span>
              {tip.entry}
            </p>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            {(
              [
                ['팁 문화', tip.tipping],
                ['수돗물', tip.water],
                ['결제', tip.payment],
                ['교통', tip.transport],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="rounded-2xl border border-stone-200 p-4">
                <p className="text-xs text-stone-500">{k}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-stone-800">{v}</p>
              </div>
            ))}
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">알아두면 좋아요</h3>
            <ul className="space-y-2.5">
              {tip.tips.map((t) => (
                <li key={t} className="flex gap-3 text-sm leading-relaxed text-stone-800">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-teal-700" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">기본 표현</h3>
            <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200">
              {tip.phrases.map((p) => (
                <li key={p.ko} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-stone-500">{p.ko}</p>
                    <p className="mt-0.5 font-semibold">{p.say}</p>
                    <p className="truncate text-sm text-stone-500">{p.local}</p>
                  </div>
                  {canSpeak && (
                    <button
                      type="button"
                      onClick={() => speak(p.local.split(' / ')[0], tip.lang)}
                      aria-label={`${p.ko} 발음 듣기`}
                      className="shrink-0 rounded-full border border-stone-300 px-3 py-1.5 text-xs text-stone-700 active:bg-stone-100"
                    >
                      듣기
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {canSpeak && <p className="mt-2 text-[11px] text-stone-400">'듣기'는 기기에 설치된 음성으로 읽어요. 해당 언어 음성이 없으면 소리가 나지 않을 수 있어요.</p>}
          </div>
        </>
      ) : (
        <p className="text-sm text-stone-500">이 나라는 자세한 여행 팁을 아직 정리하지 않았어요. 위 기본 정보와 외교부 안내를 참고하세요.</p>
      )}

      <p className="text-[11px] leading-relaxed text-stone-400">
        입국 조건·안전 정보는 수시로 바뀌어요. 출발 전{' '}
        <a href="https://www.0404.go.kr/" target="_blank" rel="noreferrer" className="text-stone-500 underline underline-offset-2">
          외교부 해외안전여행
        </a>
        에서 꼭 확인하세요. 콘센트·전압·운전 방향·국가 번호: Wikidata, 시차: Open-Meteo, 팁·표현: 직접 정리(2026-11).
      </p>
    </div>
  )
}
