/**
 * 내 사진: IndexedDB('hidden-travel-photos')에 JPEG로 저장.
 * IndexedDB가 막힌 브라우저(일부 사생활 보호 모드 등)에서는 photosAvailable()이 false → 사진 버튼만 숨긴다.
 */
const DB = 'hidden-travel-photos'
const STORE = 'photos'

let dbPromise: Promise<IDBDatabase> | null = null
function open(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
      req.onblocked = () => reject(new Error('blocked'))
    } catch (e) {
      reject(e)
    }
  })
  dbPromise.catch(() => (dbPromise = null))
  return dbPromise
}

let available: Promise<boolean> | null = null
export function photosAvailable(): Promise<boolean> {
  available ??= typeof indexedDB === 'undefined' ? Promise.resolve(false) : open().then(() => true, () => false)
  return available
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const r = fn(t.objectStore(STORE))
        r.onsuccess = () => resolve(r.result)
        r.onerror = () => reject(r.error)
      }),
  )
}

export const getPhoto = (id: string) => tx<Blob | undefined>('readonly', (s) => s.get(id) as IDBRequest<Blob | undefined>)
export const deletePhoto = (id: string) => tx('readwrite', (s) => s.delete(id)).catch(() => undefined)
/** 백업에서 되살릴 때: 원래 아이디 그대로 저장 */
export const putPhoto = (id: string, blob: Blob) => tx('readwrite', (s) => s.put(blob, id))
export async function savePhoto(blob: Blob): Promise<string> {
  const id = `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  await tx('readwrite', (s) => s.put(blob, id))
  return id
}

/** 긴 변 1280px, JPEG 품질 0.8로 줄인다 */
export async function shrinkImage(file: File, maxSide = 1280, quality = 0.8): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = () => rej(new Error('사진을 읽지 못했어요'))
      i.src = url
    })
    const r = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const c = document.createElement('canvas')
    c.width = Math.round(img.naturalWidth * r)
    c.height = Math.round(img.naturalHeight * r)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('사진을 줄이지 못했어요'))), 'image/jpeg', quality))
  } finally {
    URL.revokeObjectURL(url)
  }
}
