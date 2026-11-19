/* 작은 MD5 구현 (위키미디어 공용 사진의 실제 주소를 계산하는 데만 사용). RFC 1321 */
function add(x: number, y: number) {
  const l = (x & 0xffff) + (y & 0xffff)
  return (((x >> 16) + (y >> 16) + (l >> 16)) << 16) | (l & 0xffff)
}
const rol = (n: number, c: number) => (n << c) | (n >>> (32 - c))
const cmn = (q: number, a: number, b: number, x: number, s: number, t: number) => add(rol(add(add(a, q), add(x, t)), s), b)
const ff = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => cmn((b & c) | (~b & d), a, b, x, s, t)
const gg = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => cmn((b & d) | (c & ~d), a, b, x, s, t)
const hh = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => cmn(b ^ c ^ d, a, b, x, s, t)
const ii = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => cmn(c ^ (b | ~d), a, b, x, s, t)

export function md5(str: string): string {
  const bytes = new TextEncoder().encode(str)
  const n = ((bytes.length + 8) >> 6) + 1
  const x = new Array<number>(n * 16).fill(0)
  bytes.forEach((b, i) => (x[i >> 2] |= b << ((i % 4) * 8)))
  x[bytes.length >> 2] |= 0x80 << ((bytes.length % 4) * 8)
  x[n * 16 - 2] = bytes.length * 8
  let [a, b, c, d] = [1732584193, -271733879, -1732584194, 271733878]
  const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21]
  const T = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) | 0)
  for (let k = 0; k < x.length; k += 16) {
    const [oa, ob, oc, od] = [a, b, c, d]
    for (let i = 0; i < 64; i++) {
      const r = i >> 4
      const g = r === 0 ? i : r === 1 ? (5 * i + 1) % 16 : r === 2 ? (3 * i + 5) % 16 : (7 * i) % 16
      const s = S[r * 4 + (i % 4)]
      const f = [ff, gg, hh, ii][r]
      const t = f(a, b, c, d, x[k + g], s, T[i])
      ;[a, b, c, d] = [d, t, b, c]
    }
    a = add(a, oa)
    b = add(b, ob)
    c = add(c, oc)
    d = add(d, od)
  }
  return [a, b, c, d].map((v) => Array.from({ length: 4 }, (_, i) => ((v >>> (i * 8)) & 0xff).toString(16).padStart(2, '0')).join('')).join('')
}

/** 위키미디어 공용 파일의 실제 미리보기 주소 (리디렉트 없음 → 캔버스에 그릴 수 있다) */
export function commonsDirectThumb(file: string, width = 500) {
  const name = file.replace(/ /g, '_')
  const h = md5(name)
  const enc = encodeURIComponent(name)
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${h[0]}/${h.slice(0, 2)}/${enc}/${width}px-${enc}`
}
