import type { Place } from '../types'
import { useAsync } from '../lib/useAsync'
import { errorReasonKo } from '../lib/cache'
import { QUAKE_DAYS, QUAKE_MIN_MAG, QUAKE_RADIUS_KM, getQuakes, magKo } from '../lib/quakes'
import { ErrorBox, Loading } from './Status'

const fmtDate = (t: number) => new Date(t).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })

/** 여행지 주변 최근 지진 (USGS) */
export function QuakeCard({ place }: { place: Place }) {
  const q = useAsync((force) => getQuakes(place.lat, place.lng, force), [place.lat, place.lng])
  if (q.status === 'error') return <ErrorBox message="지진 정보를 불러오지 못했어요." detail={errorReasonKo(q.error)} onRetry={q.retry} />
  if (q.status !== 'success') return <Loading label="주변 지진 기록 확인 중…" />
  const { data, stale, savedAt } = q.data
  const strongest = data.reduce<number | null>((m, x) => (m == null || x.mag > m ? x.mag : m), null)
  return (
    <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5">
      {data.length === 0 ? (
        <p className="text-sm text-stone-700">
          최근 {QUAKE_DAYS}일 동안 {place.name} 반경 {QUAKE_RADIUS_KM}km 안에서 규모 {QUAKE_MIN_MAG} 이상 지진은 없었어요.
        </p>
      ) : (
        <>
          <p className="text-sm text-stone-700">
            최근 {QUAKE_DAYS}일 동안 {place.name} 반경 {QUAKE_RADIUS_KM}km 안에서 규모 {QUAKE_MIN_MAG} 이상 지진이 <b>{data.length}번</b> 있었어요. 가장 큰 건 규모{' '}
            <b>{strongest?.toFixed(1)}</b>이에요.
          </p>
          <ul className="divide-y divide-stone-100 text-sm">
            {data.slice(0, 5).map((x) => (
              <li key={x.id} className="flex items-start gap-3 py-2">
                <span className={`w-12 shrink-0 rounded-lg py-1 text-center text-sm font-bold tabular-nums ${x.mag >= 6 ? 'bg-rose-50 text-rose-700' : x.mag >= 5 ? 'bg-orange-50 text-orange-700' : 'bg-stone-100 text-stone-700'}`}>
                  {x.mag.toFixed(1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-stone-500">
                    {fmtDate(x.time)} · {magKo(x.mag)} · 여기서 {Math.round(x.distKm)}km{x.depthKm != null ? ` · 깊이 ${Math.round(x.depthKm)}km` : ''}
                    {x.tsunami && <span className="ml-1 font-semibold text-rose-700">· 쓰나미 정보 있음</span>}
                  </p>
                  <p className="truncate" lang="en">
                    {x.url ? (
                      <a href={x.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                        {x.place || '위치 정보 없음'}
                      </a>
                    ) : (
                      x.place || '위치 정보 없음'
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {data.length > 5 && <p className="text-xs text-stone-500">최근 5건만 보여 드려요.</p>}
        </>
      )}
      <p className="text-[11px] leading-relaxed text-stone-500">
        지진은 예측할 수 없어요. 이 기록은 지금 위험하다는 뜻이 아니라 지진이 잦은 지역인지 보는 참고예요. 숙소의 대피 경로를 확인해 두세요. 데이터: 미국 지질조사국(USGS) · {new Date(savedAt).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 확인
        {stale ? ' (저장본)' : ''}{' '}
        <button type="button" onClick={q.retry} className="font-medium text-teal-700 underline underline-offset-2">
          새로고침
        </button>
      </p>
    </div>
  )
}
