import { useMemo, useState } from 'react'
import type { Country, Place } from '../types'
import { useAsync } from '../lib/useAsync'
import { MOFA_URL, fcdoPage, getAdvisory, worldAdvisories, type Advisory } from '../lib/advisory'
import { RISK_FLAGS, RISK_LABEL } from '../lib/advisoryText'
import { COUNTRIES } from '../lib/countries'
import { translateToKo } from '../lib/translate'
import { Flag } from './Flag'
import { Loading } from './Status'
import { josa } from 'es-hangul'
import { KnownRisks } from './KnownRisks'
import { QuakeCard } from './QuakeCard'

const LEVEL_STYLE = [
  'border-stone-300 text-stone-600',
  'border-amber-400 text-amber-700',
  'border-orange-500 text-orange-600',
  'border-rose-500 text-rose-600',
  'border-rose-600 bg-rose-50 text-rose-700',
] as const
const flagLabel = (id: string) => RISK_FLAGS.find((f) => f.id === id)?.label ?? id

function LevelPill({ level }: { level: number }) {
  return <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${LEVEL_STYLE[level]}`}>{RISK_LABEL[level]}</span>
}

function Flags({ flags, max = 8 }: { flags: string[]; max?: number }) {
  if (!flags.length) return null
  return (
    <span className="flex flex-wrap gap-1">
      {flags.slice(0, max).map((f) => (
        <span key={f} className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-700">
          {flagLabel(f)}
        </span>
      ))}
    </span>
  )
}

/** 안전: 지금 고른 나라의 위험도와 세계 위험 국가 목록 (근거: 영국 외무부 여행 경보 원문) */
export function SafetySection({ country, place, onPickCountry }: { country: Country; place: Place; onPickCountry: (code: string) => void }) {
  const here = useAsync((force) => getAdvisory(country.code, force), [country.code])
  const world = useAsync(() => worldAdvisories(), [])
  const [filter, setFilter] = useState<'risk' | 'high' | 'all'>('risk')
  const [q, setQ] = useState('')
  // 처음엔 위험도 높은 순 10개만 (검색 중이면 전부)
  const [expanded, setExpanded] = useState(false)
  const FIRST = 10

  const rows = useMemo(() => {
    if (world.status !== 'success') return []
    const name = new Map(COUNTRIES.map((c) => [c.code, c.nameKo]))
    return Object.entries(world.data.countries)
      .map(([code, a]) => ({ code, name: name.get(code) ?? code, a }))
      .filter((r) => (filter === 'all' ? true : filter === 'high' ? r.a.level >= 3 : r.a.level >= 1))
      .filter((r) => !q.trim() || r.name.includes(q.trim()))
      .sort((x, y) => y.a.level - x.a.level || x.name.localeCompare(y.name, 'ko'))
  }, [world, filter, q])

  return (
    <div className="max-w-3xl space-y-10">
      <section aria-label={`${country.nameKo} 위험도`}>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">{country.nameKo} 위험도</h3>
        {here.status === 'loading' || here.status === 'idle' ? (
          <Loading label="여행 경보 확인 중…" />
        ) : (
          <HereCard country={country} a={here.status === 'success' ? here.data : undefined} failed={here.status === 'error'} onRetry={here.retry} />
        )}
      </section>

      <section aria-label={`${place.name} 주변 최근 지진`}>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">{place.name} 주변 최근 지진</h3>
        <QuakeCard place={place} />
      </section>

      <section aria-label="세계 위험 국가">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500">세계 위험 국가</h3>
          {world.status === 'success' && world.data.fetchedAt && <span className="text-[11px] text-stone-500">{world.data.fetchedAt.slice(0, 10)} 기준 저장본</span>}
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {(
            [
              ['risk', '위험 있는 나라'],
              ['high', '여행 금지·출국 권고급'],
              ['all', '전체'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={filter === id}
              onClick={() => (setFilter(id), setExpanded(false))}
              className={`rounded-full px-3 py-1.5 text-xs ${filter === id ? 'bg-stone-900 font-semibold text-stone-50' : 'border border-stone-300 text-stone-600'}`}
            >
              {label}
            </button>
          ))}
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="나라 이름 찾기" aria-label="나라 이름 찾기" className="h-9 min-w-0 flex-1 rounded-full border border-stone-300 bg-white px-3 text-sm sm:max-w-48" />
        </div>
        {world.status !== 'success' ? (
          <Loading label="세계 경보 불러오는 중…" />
        ) : rows.length === 0 ? (
          <p className="py-4 text-sm text-stone-500">조건에 맞는 나라가 없어요.</p>
        ) : (
          <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200">
            {(expanded || q.trim() ? rows : rows.slice(0, FIRST)).map(({ code, name, a }) => (
              <li key={code} className="flex items-start gap-3 px-4 py-3">
                <span className="pt-0.5">
                  <Flag code={code} size="sm" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{name}</span>
                    <LevelPill level={a.level} />
                  </div>
                  <div className="mt-1">
                    <Flags flags={a.flags} max={4} />
                  </div>
                </div>
                {code !== country.code && COUNTRIES.some((c) => c.code === code) && (
                  <button type="button" onClick={() => onPickCountry(code)} className="shrink-0 text-xs text-teal-700 underline underline-offset-2" aria-label={`${josa(name, '으로/로')} 바꿔 보기`}>
                    보기
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {world.status === 'success' && !q.trim() && rows.length > FIRST && (
          <button type="button" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)} className="mt-3 w-full rounded-xl border border-stone-200 py-3 text-sm text-stone-600 active:bg-stone-100">
            {expanded ? '접기' : `${rows.length - FIRST}개 나라 더 보기 (모두 ${rows.length}개)`}
          </button>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-stone-500">
          위험도는 영국 외무부(FCDO) 여행 경보 단계로 정했고, 위험 요인은 경보 원문에 실제로 적힌 표현만 표시해요. '잘 알려진 주의사항'은 여행자에게 널리 알려진 내용을 직접 정리한 참고용이에요. 한국 외교부의 여행경보·특별여행주의보는 단계와 지역이 다를 수 있으니{' '}
          <a href={MOFA_URL} target="_blank" rel="noreferrer" className="font-medium text-stone-700 underline underline-offset-2">
            외교부 해외안전여행
          </a>
          에서 꼭 확인하세요.
        </p>
      </section>
    </div>
  )
}

function HereCard({ country, a, failed, onRetry }: { country: Country; a?: Advisory | null; failed: boolean; onRetry: () => void }) {
  const [ko, setKo] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const tr = async (key: string, text: string) => {
    setBusy(key)
    try {
      const t = await translateToKo(text, 'en')
      setKo((m) => ({ ...m, [key]: t }))
    } catch {
      setKo((m) => ({ ...m, [key]: '번역하지 못했어요. 원문을 확인해 주세요.' }))
    } finally {
      setBusy(null)
    }
  }
  const fcdo = fcdoPage(country.code)

  if (a === null)
    return (
      <p className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-600">
        {josa(country.nameKo, '은/는')} 영국 외무부 경보 대상이 아니에요. 외교부 해외안전여행에서 확인해 주세요.
      </p>
    )
  if (!a)
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm">
        <p className="text-stone-600">{failed ? '여행 경보를 불러오지 못했어요.' : '여행 경보 정보가 없어요.'}</p>
        <button type="button" onClick={onRetry} className="mt-2 text-xs text-teal-700 underline underline-offset-2">
          다시 시도
        </button>
      </div>
    )
  return (
    <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Flag code={country.code} />
          <span className="font-semibold">{country.nameKo}</span>
          <LevelPill level={a.level} />
        </div>
        <span className="text-[11px] text-stone-500">
          {a.updatedAt ? `${a.updatedAt.slice(0, 10)} 갱신` : ''}
          {a.from === 'snapshot' ? ' (저장본)' : ''}
        </span>
      </div>
      {/* 0~4 막대 */}
      <div className="flex gap-1" role="img" aria-label={`위험도 ${a.level} / 4`}>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={`h-2 flex-1 rounded-full ${i <= a.level ? (a.level >= 3 ? 'bg-rose-500' : a.level === 2 ? 'bg-orange-500' : 'bg-amber-400') : 'bg-stone-200'}`} />
        ))}
      </div>
      <KnownRisks code={country.code} />
      {a.flags.length > 0 ? (
        <div>
          <p className="mb-1 text-xs text-stone-500">영국 외무부 경보 원문에 적힌 위험 요인</p>
          <Flags flags={a.flags} />
        </div>
      ) : (
        <p className="text-sm text-stone-600">영국 외무부 경보 원문에서 전쟁·납치·취업 사기 같은 큰 위험 요인은 찾지 못했어요.</p>
      )}
      {a.flags.includes('conflict') && (
        <p className="rounded-xl border border-rose-500/60 bg-rose-50 px-3 py-2 text-xs leading-relaxed text-rose-700">
          ⚠ 전쟁·무력 충돌이 적힌 나라예요. 한국 외교부는 이런 나라를 영국보다 높은 단계(전 지역 여행금지 등)로 정하기도 해요. 출발 전 외교부 해외안전여행에서 꼭 확인하세요.
        </p>
      )}
      {a.areas && (
        <details className="rounded-xl bg-stone-100 p-3 text-xs leading-relaxed">
          <summary className="cursor-pointer font-medium text-stone-700">여행 자제 지역 원문 보기</summary>
          <p className="mt-2 whitespace-pre-line text-stone-700" lang="en">
            {a.areas}
          </p>
          {ko.areas ? (
            <p className="mt-2 whitespace-pre-line border-t border-stone-300 pt-2 text-stone-700">{ko.areas}</p>
          ) : (
            <button type="button" onClick={() => tr('areas', a.areas!)} disabled={busy !== null} className="mt-2 rounded-full border border-stone-300 px-3 py-1">
              {busy === 'areas' ? '번역 중…' : '한국어로 번역'}
            </button>
          )}
        </details>
      )}
      {a.change && (
        <div className="text-xs leading-relaxed text-stone-600">
          <span className="text-stone-500">최근 바뀐 내용: </span>
          <span lang="en">{a.change}</span>
          {ko.change ? (
            <span className="mt-1 block text-stone-700">→ {ko.change}</span>
          ) : (
            <button type="button" onClick={() => tr('change', a.change!)} disabled={busy !== null} className="ml-1 text-teal-700 underline underline-offset-2">
              {busy === 'change' ? '번역 중…' : '번역'}
            </button>
          )}
        </div>
      )}
      <p className="text-[11px] text-stone-500">
        <a href={MOFA_URL} target="_blank" rel="noreferrer" className="font-medium text-stone-700 underline underline-offset-2">
          외교부 해외안전여행
        </a>
        {fcdo && (
          <>
            {' · '}
            <a href={fcdo} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              영국 외무부 원문
            </a>
          </>
        )}
      </p>
    </div>
  )
}
