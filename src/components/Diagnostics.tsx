import { useState } from 'react'
import { bboxOf, describeFailure } from '../lib/osm'
import { HttpError } from '../lib/cache'

/** ?diag=1 로 열면 보이는 진단 화면: 이 브라우저에서 각 서버가 응답하는지 직접 재 본다 */
const SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]
const KYOTO: [number, number] = [35.0116, 135.7681]
const TESTS = [
  { name: '아주 작은 검색', q: `[out:json][timeout:15];node(around:300,${KYOTO[0]},${KYOTO[1]})[tourism];out 3;` },
  {
    name: '교토 숙소·식당 (실제 쿼리)',
    q: `[out:json][timeout:20];
nwr[tourism~"^(hotel|hostel|guest_house|motel|apartment|chalet|alpine_hut)$"][name]${bboxOf(KYOTO[0], KYOTO[1], 1.5)};out tags center 120;
nwr[amenity~"^(restaurant|cafe|fast_food|food_court|bar|pub)$"][name]${bboxOf(KYOTO[0], KYOTO[1], 1.05)};out tags center 300;`,
  },
]

interface Row {
  server: string
  test: string
  result: string
}

async function probe(server: string, q: string): Promise<string> {
  const t0 = performance.now()
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 30000)
  try {
    const res = await fetch(server, { method: 'POST', body: new URLSearchParams({ data: q }), signal: ctrl.signal })
    const ms = Math.round(performance.now() - t0)
    if (!res.ok) throw new HttpError(res.status, server)
    const j = (await res.json()) as { elements?: unknown[]; remark?: string }
    return `✅ ${ms}ms · ${j.elements?.length ?? '?'}개${j.remark ? ` · 서버 메모: ${j.remark.slice(0, 60)}` : ''}`
  } catch (e) {
    return `❌ ${Math.round(performance.now() - t0)}ms · ${describeFailure(e)}`
  } finally {
    clearTimeout(timer)
  }
}

export function Diagnostics() {
  const [rows, setRows] = useState<Row[]>([])
  const [running, setRunning] = useState(false)
  const run = async () => {
    setRunning(true)
    setRows([])
    for (const t of TESTS)
      for (const s of SERVERS) {
        const result = await probe(s, t.q)
        setRows((r) => [...r, { server: new URL(s).host, test: t.name, result }])
        await new Promise((r) => setTimeout(r, 1200))
      }
    setRunning(false)
  }
  return (
    <div className="relative rounded-2xl bg-white p-4 text-sm shadow ring-1 ring-amber-300">
      <p className="font-bold">🔧 서버 연결 진단</p>
      <p className="mt-1 text-xs text-stone-500">이 브라우저에서 OpenStreetMap(Overpass) 서버 3곳에 직접 요청해 응답 시간을 잽니다. 1~2분 걸려요. 끝나면 화면을 캡처해 주세요.</p>
      <button type="button" onClick={run} disabled={running} className="mt-3 rounded-lg bg-amber-600 px-3 py-2 font-medium text-white disabled:opacity-50">
        {running ? '진단 중…' : '진단 시작'}
      </button>
      <ul className="mt-3 space-y-1 text-xs">
        {rows.map((r, i) => (
          <li key={i}>
            <b>{r.test}</b> · {r.server} → {r.result}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-stone-400">{navigator.userAgent}</p>
    </div>
  )
}
