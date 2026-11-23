/**
 * 여행 링크 공유: 지금 주소(나라·날짜·도시)에 관심 목록을 짧게 담아 보낸다 (서버 없이 링크만으로).
 * z = lz-string 압축(JSON [[id, 이름, 종류, 위도, 경도, 숨은 정도], ...]) 최대 12곳 — 예전 base64 방식(w)보다 약 1/3 짧아 QR도 단순해진다
 * w = 예전 링크(base64url)도 그대로 읽는다
 */
// lz-string은 CommonJS 패키지라 기본 내보내기로 가져온다 (Vite·Node 둘 다 동작)
import LZString from 'lz-string'
import type { Wish } from './wishlist'

type Liked = Wish['liked'][number]
const MAX = 12

const toB64url = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromB64url = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)))

const rowsOf = (liked: Liked[]) => liked.slice(0, MAX).map((x) => [x.id, x.name, x.kind, +x.lat.toFixed(5), +x.lng.toFixed(5), x.hiddenScore ?? null])

/** 예전 방식 (base64url) */
export function encodeLiked(liked: Liked[]): string {
  return toB64url(JSON.stringify(rowsOf(liked)))
}
/** 지금 방식 (lz-string 압축) */
export function encodeLikedZ(liked: Liked[]): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(rowsOf(liked)))
}

/** 받은 링크의 관심 목록 읽기: z(압축) 또는 w(예전). 형식이 틀리면 빈 목록 */
export function decodeLiked(value: string, kind: 'z' | 'w' = 'w'): Liked[] {
  try {
    const text = kind === 'z' ? LZString.decompressFromEncodedURIComponent(value) : fromB64url(value)
    if (!text) return []
    const rows = JSON.parse(text) as unknown
    if (!Array.isArray(rows)) return []
    return rows
      .slice(0, MAX)
      .filter((r): r is [string, string, string, number, number, number | null] => Array.isArray(r) && typeof r[0] === 'string' && typeof r[1] === 'string' && Number.isFinite(r[3]) && Number.isFinite(r[4]))
      .map(([id, name, kind, lat, lng, hs]) => ({ id: id.slice(0, 80), name: name.slice(0, 120), kind: String(kind ?? '명소').slice(0, 40), lat, lng, ...(typeof hs === 'number' ? { hiddenScore: hs } : {}) }))
  } catch {
    return []
  }
}

/** 공유할 주소: 지금 주소 + 관심 목록 (화면 위치 #… 는 그대로) */
export function shareUrl(liked: Liked[]) {
  const u = new URL(location.href)
  u.searchParams.delete('demo')
  u.searchParams.delete('w')
  if (liked.length) u.searchParams.set('z', encodeLikedZ(liked))
  else u.searchParams.delete('z')
  return u.toString()
}

/** 휴대폰은 공유 시트, 안 되면 주소 복사. 결과를 한국어로 돌려준다 */
export async function shareTrip(title: string, liked: Liked[], onlyCopy = false): Promise<string> {
  const url = shareUrl(liked)
  if (onlyCopy) {
    try {
      await navigator.clipboard.writeText(url)
      return '링크를 복사했어요.'
    } catch {
      window.prompt('이 주소를 복사해 보내세요', url)
      return ''
    }
  }
  const text = liked.length ? `${title} · 관심 장소 ${Math.min(liked.length, MAX)}곳` : title
  try {
    if (navigator.share) {
      await navigator.share({ title: `숨은여행 · ${title}`, text, url })
      return '공유했어요'
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return ''
  }
  try {
    await navigator.clipboard.writeText(url)
    return '링크를 복사했어요. 메신저에 붙여 넣으세요.'
  } catch {
    window.prompt('이 주소를 복사해 보내세요', url)
    return ''
  }
}
