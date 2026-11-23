import { useState } from 'react'
import type { Country, Place, TripDates } from '../types'
import { useAsync } from '../lib/useAsync'
import { MOFA_URL, fcdoPage, getAdvisory } from '../lib/advisory'
import { getGoodTime } from '../lib/goodTime'
import { safetyOf, travelVerdict, type VerdictLevel } from '../lib/verdict'
import { translateToKo } from '../lib/translate'

const STYLE: Record<VerdictLevel, { dot: string; ring: string; text: string; emoji: string }> = {
  recommend: { dot: 'bg-teal-500', ring: 'border-teal-700/60', text: 'text-teal-700', emoji: '🟢' },
  normal: { dot: 'bg-amber-400', ring: 'border-amber-400/60', text: 'text-amber-700', emoji: '🟡' },
  caution: { dot: 'bg-orange-500', ring: 'border-orange-500/70', text: 'text-orange-600', emoji: '🟠' },
  avoid: { dot: 'bg-rose-600', ring: 'border-rose-500/70', text: 'text-rose-600', emoji: '🔴' },
}

/** 이번 여행 판단: 여행 경보(안전) → 날씨 → 공휴일 혼잡 순서로 추천·비추천 */
export function VerdictCard({ country, place, dates }: { country: Country; place: Place; dates: TripDates }) {
  const adv = useAsync((force) => getAdvisory(country.code, force), [country.code])
  const gt = useAsync(() => getGoodTime(country, place, dates), [country.code, place.lat, place.lng, dates.start, dates.end])
  const [showAreas, setShowAreas] = useState(false)
  const [ko, setKo] = useState<string | null>(null)
  const [translating, setTranslating] = useState(false)

  if (adv.status === 'loading' || adv.status === 'idle') return <div className="h-32 animate-pulse rounded-3xl border border-stone-200 bg-white" aria-label="여행 판단 불러오는 중" />

  const a = adv.status === 'success' ? adv.data : undefined
  const hasSource = !!fcdoPage(country.code)
  const safety = safetyOf(a === undefined ? null : (a?.status ?? null), hasSource)
  const g = gt.status === 'success' ? gt.data : null
  const v = travelVerdict({
    safety,
    allTravel: a?.status.some((s) => s === 'avoid_all_travel_to_whole_country'),
    weatherScore: g?.weather.score ?? null,
    weatherNote: g?.weather.note,
    holidayScore: g?.holiday.score ?? null,
    holidayNote: g?.holiday.note,
  })
  const st = STYLE[v.level]
  const fcdo = fcdoPage(country.code)

  const translate = async () => {
    if (!a?.areas) return
    setTranslating(true)
    try {
      setKo(await translateToKo(a.areas, 'en'))
    } catch {
      setKo('번역하지 못했어요. 원문을 확인해 주세요.')
    } finally {
      setTranslating(false)
    }
  }

  return (
    <section aria-label="이번 여행 판단" className={`rounded-3xl border-2 bg-white p-5 ${st.ring}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">이번 여행 판단</p>
          <p className={`mt-1 flex items-center gap-2 text-3xl font-extrabold ${st.text}`}>
            <span className={`size-3.5 rounded-full ${st.dot}`} aria-hidden />
            {v.title}
          </p>
        </div>
        <p className="text-right text-[11px] leading-relaxed text-stone-500">
          {country.nameKo} · {place.name}
          {a?.updatedAt && (
            <>
              <br />
              경보 {a.updatedAt.slice(0, 10)} 갱신{a.from === 'snapshot' ? ' (저장본)' : ''}
            </>
          )}
        </p>
      </div>
      <ul className="mt-3 space-y-1.5 text-sm text-stone-700">
        {v.reasons.map((r) => (
          <li key={r} className="flex gap-2">
            <span aria-hidden>·</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>

      {safety === 'parts' && a?.areas && (
        <div className="mt-3">
          <button type="button" aria-expanded={showAreas} onClick={() => setShowAreas((x) => !x)} className="text-xs font-medium text-orange-600 underline underline-offset-2">
            {showAreas ? '경보 지역 닫기' : '어느 지역인지 보기'}
          </button>
          {showAreas && (
            <div className="mt-2 rounded-xl bg-stone-100 p-3 text-xs leading-relaxed text-stone-700">
              <p className="whitespace-pre-line" lang="en">
                {a.areas}
              </p>
              {ko ? (
                <p className="mt-2 whitespace-pre-line border-t border-stone-300 pt-2" lang="ko">
                  {ko}
                </p>
              ) : (
                <button type="button" onClick={translate} disabled={translating} className="mt-2 rounded-full border border-stone-300 px-3 py-1 text-xs">
                  {translating ? '번역 중…' : '한국어로 번역'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {adv.status === 'error' && (
        <button type="button" onClick={adv.retry} className="mt-2 text-xs text-teal-700 underline underline-offset-2">
          경보 다시 불러오기
        </button>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-stone-500">
        안전은 영국 외무부(FCDO) 여행 경보, 날씨·혼잡은 좋은 시기 지수로 판단한 참고용이에요. 한국 여행자는{' '}
        <a href={MOFA_URL} target="_blank" rel="noreferrer" className="font-medium text-stone-700 underline underline-offset-2">
          외교부 해외안전여행
        </a>
        에서 여행경보 단계를 꼭 확인하세요.
        {fcdo && (
          <>
            {' '}
            <a href={fcdo} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              영국 외무부 원문
            </a>
          </>
        )}
      </p>
    </section>
  )
}
