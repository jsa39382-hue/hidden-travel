/**
 * 여행 경보: 영국 외무부(FCDO) 공개 자료를 브라우저에서 바로 받는다 (키 필요 없음, CORS 허용 확인).
 * 12시간 저장, 못 받으면 사이트에 넣어 둔 사본(npm run build:advisories로 갱신)을 쓴다.
 * 외교부 해외안전여행은 공식 API가 인증키를 요구하고 해외 접속을 막아, 링크로 확인을 안내한다.
 */
import { HOUR, cachedJson, fetchJson } from './cache'
import { FCDO_SLUG } from './advisorySlugs'
import { extractAreas } from './advisoryText'

export interface Advisory {
  status: string[]
  updatedAt: string | null
  areas: string | null
  /** 'live' 방금 받음 · 'snapshot' 사이트에 넣어 둔 사본 */
  from: 'live' | 'snapshot'
}

interface FcdoRes {
  public_updated_at?: string
  details?: { alert_status?: string[]; updated_at?: string; parts?: { slug: string; body: string }[] }
}

export const fcdoPage = (code: string) => (FCDO_SLUG[code] ? `https://www.gov.uk/foreign-travel-advice/${FCDO_SLUG[code]}` : null)
export const MOFA_URL = 'https://www.0404.go.kr/'

// 사본은 실시간으로 못 받았을 때만 불러온다 (첫 화면을 가볍게)
const loadSnapshot = () =>
  import('../data/advisories.json').then((m) => ((m.default ?? m) as unknown as { countries?: Record<string, Omit<Advisory, 'from'>> }).countries ?? {})

/** 나라의 경보 (영국은 대상이 아니라 null) */
export async function getAdvisory(code: string, force = false): Promise<Advisory | null> {
  const slug = FCDO_SLUG[code]
  if (!slug) return null
  try {
    const r = await cachedJson(
      `advisory:v1:${slug}`,
      12 * HOUR,
      async (signal) => {
        const j = await fetchJson<FcdoRes>(`https://www.gov.uk/api/content/foreign-travel-advice/${slug}`, { signal })
        if (!Array.isArray(j.details?.alert_status)) throw new Error('경보 형식이 달라요')
        const body = j.details!.parts?.find((p) => p.slug === 'warnings-and-insurance')?.body ?? ''
        return { status: j.details!.alert_status!, updatedAt: j.details!.updated_at ?? j.public_updated_at ?? null, areas: extractAreas(body) }
      },
      { force },
    )
    return { ...r.data, from: 'live' }
  } catch {
    const s = (await loadSnapshot().catch(() => ({}) as Record<string, Omit<Advisory, 'from'>>))[code]
    if (s) return { ...s, from: 'snapshot' }
    throw new Error('여행 경보를 불러오지 못했어요')
  }
}
