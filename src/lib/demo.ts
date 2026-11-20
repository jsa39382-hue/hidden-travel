/**
 * 시연 모드: 대회장처럼 여러 사람이 같은 와이파이를 쓰면 무료 API가 막힐 수 있다.
 * 미리 받아 둔 도쿄·파리 데이터(src/data/demo-cache.json)를 저장소에 채워 넣어, 인터넷이 막혀도 화면이 나오게 한다.
 */
const PREFIX = 'hidden-travel:v1:'

export const DEMO_TRIPS = {
  JP: 'c=JP&from=2026-12-10&to=2026-12-14&place=%EB%8F%84%EC%BF%84&lat=35.6812&lng=139.7671&f=1.15',
  FR: 'c=FR&from=2026-12-10&to=2026-12-14&place=%ED%8C%8C%EB%A6%AC&lat=48.8566&lng=2.3522&f=1.2',
} as const
export type DemoCountry = keyof typeof DEMO_TRIPS

/** 시연 데이터를 넣고 그 여행 화면으로 이동 */
export async function startDemo(country: DemoCountry = 'JP') {
  const m = await import('../data/demo-cache.json')
  const file = (m.default ?? m) as unknown as { entries?: Record<string, unknown> }
  const now = Date.now()
  for (const [k, data] of Object.entries(file.entries ?? {})) {
    try {
      localStorage.setItem(PREFIX + k, JSON.stringify({ savedAt: now, data }))
    } catch {
      /* 저장 공간이 모자라면 넣을 수 있는 만큼만 */
    }
  }
  location.replace(`${import.meta.env.BASE_URL}?${DEMO_TRIPS[country]}#home`)
}
