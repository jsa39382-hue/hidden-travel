import type { Spot } from './spots'
import { useStored } from './stored'

/** 스와이프로 고른 '가고 싶다 / 별로' (지역별로 저장) */
export interface Wish {
  liked: Pick<Spot, 'id' | 'name' | 'kind' | 'lat' | 'lng' | 'image'>[]
  disliked: string[]
}

const valid = (v: unknown) => !!v && Array.isArray((v as Wish).liked) && Array.isArray((v as Wish).disliked)

export function useWishlist(placeKey: string) {
  const [wish, setWish] = useStored<Wish>(`hidden-travel:wish:${placeKey}`, { liked: [], disliked: [] }, valid)
  return {
    wish,
    like: (s: Spot) =>
      setWish((w) => ({
        liked: [...w.liked.filter((x) => x.id !== s.id), { id: s.id, name: s.name, kind: s.kind, lat: s.lat, lng: s.lng, image: s.image }],
        disliked: w.disliked.filter((x) => x !== s.id),
      })),
    dislike: (s: Spot) => setWish((w) => ({ liked: w.liked.filter((x) => x.id !== s.id), disliked: [...new Set([...w.disliked, s.id])] })),
    remove: (id: string) => setWish((w) => ({ liked: w.liked.filter((x) => x.id !== id), disliked: w.disliked.filter((x) => x !== id) })),
    reset: () => setWish({ liked: [], disliked: [] }),
  }
}

export const placeKeyOf = (p: { lat: number; lng: number }) => `${p.lat.toFixed(2)},${p.lng.toFixed(2)}`
