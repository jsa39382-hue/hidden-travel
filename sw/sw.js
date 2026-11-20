/* 숨은여행 서비스 워커 — 한 번 열어 본 화면과 데이터를 인터넷 없이도 볼 수 있게 한다.
 * 빌드 때 vite.config.ts의 플러그인이 버전과 미리 받을 파일 목록을 채워 dist/sw.js로 내보낸다. */
const VERSION = '__VERSION__'
const PRECACHE = __PRECACHE__
const SHELL = `shell-${VERSION}`
const RUNTIME = { tiles: 'tiles-v1', images: 'images-v1' }
const LIMIT = { [RUNTIME.tiles]: 400, [RUNTIME.images]: 250 }
const scope = new URL(self.registration.scope)
const INDEX = new URL('index.html', scope).href

self.addEventListener('install', (e) => {
  // 앱 화면(HTML·JS·CSS·아이콘)을 미리 받아 둔다
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE.map((p) => new URL(p, scope).href))))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const keep = new Set([SHELL, ...Object.values(RUNTIME)])
      for (const k of await caches.keys()) if (!keep.has(k)) await caches.delete(k)
      await self.clients.claim()
    })(),
  )
})

// 새 버전을 사용자가 '새로고침'을 눌렀을 때만 적용
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting()
})

async function trim(name) {
  const c = await caches.open(name)
  const keys = await c.keys()
  for (let i = 0; i < keys.length - LIMIT[name]; i++) await c.delete(keys[i])
}

// 먼저 저장본, 없으면 받아서 저장 (지도 타일·사진)
async function cacheFirst(req, name) {
  const c = await caches.open(name)
  const hit = await c.match(req)
  if (hit) return hit
  const res = await fetch(req)
  if (res.ok || res.type === 'opaque') {
    await c.put(req, res.clone())
    trim(name)
  }
  return res
}

// 페이지: 인터넷이 되면 최신, 안 되거나 4초 넘게 걸리면 저장본
async function page(req) {
  const c = await caches.open(SHELL)
  try {
    const res = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))])
    if (res.ok) c.put(INDEX, res.clone())
    return res
  } catch {
    return (await c.match(INDEX)) ?? new Response('오프라인이에요. 인터넷에 연결한 뒤 다시 열어 주세요.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (req.mode === 'navigate' && url.href.startsWith(scope.href)) return e.respondWith(page(req))
  if (url.origin === scope.origin && url.pathname.startsWith(scope.pathname)) {
    // 이름에 해시가 붙은 빌드 파일은 바뀌지 않으므로 저장본 우선
    return e.respondWith(caches.match(req).then((hit) => hit ?? fetch(req)))
  }
  // 지도 타일: OSM 정책대로 한 번 받은 타일을 다시 쓰고, 개수를 제한한다 (대량 미리 받기는 하지 않음)
  if (url.hostname === 'tile.openstreetmap.org') return e.respondWith(cacheFirst(req, RUNTIME.tiles))
  // 사진·국기
  if (/(^|\.)wikimedia\.org$/.test(url.hostname) || url.hostname === 'flagcdn.com') return e.respondWith(cacheFirst(req, RUNTIME.images).catch(() => fetch(req)))
  // 그 밖의 API는 앱의 localStorage 캐시가 맡는다
})
