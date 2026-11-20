import { useState } from 'react'
import { plugAdvice, timeDiff, voltageAdvice } from '../lib/survival'
import { FACTS, TIPS } from '../lib/survivalData'
import type { Country, Place } from '../types'
import { useAsync } from '../lib/useAsync'
import { getWeather } from '../lib/weather'
import { photoUrl } from '../lib/spots'
import { wikiUrl } from '../lib/festivals'
import { Tilt } from './ui/Tilt'

interface Food {
  id: string
  name: string
  nameEn?: string
  image: string
  desc?: string
  wiki?: string
}
let foodsCache: Promise<Record<string, Food[]>> | null = null
const loadFoods = () => (foodsCache ??= import('../data/foods.json').then((m) => m.default as unknown as Record<string, Food[]>))

const KOREA_AREA = 100_410
function formatPopulation(n: number) {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1).replace(/\.0$/, '')}억 명`
  if (n >= 10_000) return `${Math.round(n / 10_000).toLocaleString('ko-KR')}만 명`
  return `${n.toLocaleString('ko-KR')}명`
}
function areaNote(km2: number) {
  const r = km2 / KOREA_AREA
  return r >= 1.2 ? `한국의 약 ${r >= 10 ? Math.round(r) : r.toFixed(1)}배` : r <= 0.8 ? `한국의 약 ${Math.round(r * 100)}%` : '한국과 비슷해요'
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
  const foods = useAsync(() => loadFoods().then((m) => m[country.code] ?? []), [country.code])
  const overview: { label: string; value: string; note?: string }[] = [
    { label: '수도', value: country.capitalKo ?? '정보 없음' },
    { label: '인구', value: facts.population ? formatPopulation(facts.population) : '정보 없음' },
    { label: '면적', value: facts.areaKm2 ? `${facts.areaKm2.toLocaleString('ko-KR')}km²` : '정보 없음', note: facts.areaKm2 ? areaNote(facts.areaKm2) : undefined },
    { label: '대륙', value: facts.continents?.join(' · ') ?? '정보 없음' },
    { label: '국가 도메인', value: facts.tld ?? '정보 없음' },
  ]

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
      {/* 대표 음식 사진 */}
      {foods.status === 'success' && foods.data.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">대표 음식</h3>
          <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 xl:grid-cols-4">
            {foods.data.map((f) => (
              <FoodCard key={f.id} food={f} />
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-stone-400">원산지가 {country.nameKo}로 등록된 음식 중 널리 알려진 순서예요. 사진·정보: Wikidata·위키미디어 공용</p>
        </div>
      )}

      {/* 나라 개요 (REST Countries가 주던 정보를 Wikidata에서) */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">나라 개요</h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-2xl border border-stone-200 p-4 sm:grid-cols-3 md:grid-cols-5">
          {overview.map((o) => (
            <div key={o.label}>
              <dt className="text-xs text-stone-500">{o.label}</dt>
              <dd className="mt-1 font-semibold">{o.value}</dd>
              {o.note && <dd className="text-[11px] text-stone-500">{o.note}</dd>}
            </div>
          ))}
        </dl>
      </div>

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
        에서 꼭 확인하세요. 나라 개요·콘센트·전압·운전 방향·국가 번호: Wikidata, 시차: Open-Meteo, 팁·표현: 직접 정리(2026-11).
      </p>
    </div>
  )
}

function FoodCard({ food }: { food: Food }) {
  const [failed, setFailed] = useState(false)
  const url = wikiUrl(food.wiki)
  const body = (
    <>
      <div className="aspect-[4/3] overflow-hidden bg-stone-100">
        {!failed && <img src={photoUrl(food.image, 480)} alt={food.name} loading="lazy" onError={() => setFailed(true)} className="size-full object-cover" />}
      </div>
      <div className="p-3">
        <p className="font-semibold leading-snug">{food.name}</p>
        {food.nameEn && <p className="truncate text-xs text-stone-400">{food.nameEn}</p>}
        {food.desc && <p className="mt-1 line-clamp-2 text-xs text-stone-500">{food.desc}</p>}
      </div>
    </>
  )
  return (
    <li className="w-56 shrink-0 snap-start md:w-auto">
      <Tilt className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="block">
            {body}
          </a>
        ) : (
          body
        )}
      </Tilt>
    </li>
  )
}
