import { useEffect, useRef, useState } from 'react'
import { applyBackup, makeBackup, photoStats, readBackup, type BackupFile, type BackupSummary } from '../lib/backup'

const size = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))}KB` : `${(b / 1024 / 1024).toFixed(b > 10 * 1024 * 1024 ? 0 : 1)}MB`)

/** 내 기록을 파일로 저장하고, 다른 기기에서 그 파일을 불러온다 (서버 없이) */
export default function BackupPanel() {
  const [stats, setStats] = useState<{ count: number; bytes: number } | null>(null)
  const [withPhotos, setWithPhotos] = useState(true)
  const [busy, setBusy] = useState<'save' | 'load' | null>(null)
  const [pending, setPending] = useState<{ data: BackupFile; summary: BackupSummary } | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    photoStats()
      .then(setStats)
      .catch(() => setStats({ count: 0, bytes: 0 }))
  }, [])

  const save = async () => {
    setBusy('save')
    setMsg(null)
    try {
      const blob = await makeBackup(withPhotos)
      const name = `hidden-travel-backup-${new Date().toISOString().slice(0, 10)}.json`
      const file = new File([blob], name, { type: 'application/json' })
      // 휴대폰은 공유 시트(파일 앱·메신저로 보내기), 안 되면 내려받기
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: '숨은여행 백업' }).catch((e: Error) => {
          if (e.name !== 'AbortError') throw e
        })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = name
        document.body.append(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(url), 5000)
      }
      setMsg({ ok: true, text: `백업 파일을 만들었어요 (${size(blob.size)}). 다른 기기에서 '불러오기'로 열면 돼요.` })
    } catch {
      setMsg({ ok: false, text: '백업 파일을 만들지 못했어요. 다시 시도해 주세요.' })
    } finally {
      setBusy(null)
    }
  }

  const pick = async (f: File | undefined) => {
    if (!f) return
    setMsg(null)
    try {
      setPending(await readBackup(f))
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message })
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const apply = async () => {
    if (!pending) return
    setBusy('load')
    try {
      await applyBackup(pending.data)
      setMsg({ ok: true, text: '불러왔어요. 화면을 새로 고칠게요.' })
      setTimeout(() => location.reload(), 900)
    } catch {
      setMsg({ ok: false, text: '불러오는 중 문제가 생겼어요. 저장 공간이 부족한지 확인해 주세요.' })
      setBusy(null)
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-stone-200 bg-white p-4 text-left text-sm text-stone-700">
      <p className="text-xs leading-relaxed text-stone-500">
        여행 설정·추억 앨범·짐 체크·정산·찜 목록은 이 기기에만 저장돼요. 파일로 저장해 두면 다른 휴대폰이나 컴퓨터로 옮길 수 있어요. 서버에는 아무것도 올리지 않아요.
      </p>

      <div className="space-y-2">
        {stats && stats.count > 0 && (
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={withPhotos} onChange={(e) => setWithPhotos(e.target.checked)} className="size-4 accent-teal-700" />
            앨범 사진도 넣기 ({stats.count}장, 약 {size(stats.bytes * 1.37)})
          </label>
        )}
        <button type="button" onClick={save} disabled={busy !== null} className="h-11 w-full rounded-xl bg-stone-900 font-semibold text-stone-50 disabled:opacity-50">
          {busy === 'save' ? '만드는 중…' : '백업 파일 저장'}
        </button>
      </div>

      <div className="space-y-2">
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy !== null} className="h-11 w-full rounded-xl border border-stone-300 font-semibold disabled:opacity-50">
          백업 파일 불러오기
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => pick(e.target.files?.[0])} />
        {pending && (
          <div role="group" aria-label="불러올 백업 확인" className="rounded-xl border border-teal-700/40 bg-teal-50 p-3 text-xs">
            <p className="font-semibold text-stone-900">이 백업을 불러올까요?</p>
            <p className="mt-1 text-stone-600">
              {pending.summary.exportedAt ? `${new Date(pending.summary.exportedAt).toLocaleString('ko-KR')} 저장 · ` : ''}
              여행 기록 {pending.summary.trips}개 · 사진 {pending.summary.photos}장 · 설정 {pending.summary.keys}개
            </p>
            <p className="mt-1 text-stone-500">추억 앨범은 합치고(지금 기기에만 있는 여행은 남아요), 나머지 설정은 백업 내용으로 바뀌어요.</p>
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" onClick={() => setPending(null)} className="px-3 py-1.5 text-stone-500">
                취소
              </button>
              <button type="button" onClick={apply} disabled={busy !== null} className="rounded-full bg-stone-900 px-3 py-1.5 font-semibold text-stone-50 disabled:opacity-50">
                {busy === 'load' ? '불러오는 중…' : '불러오기'}
              </button>
            </div>
          </div>
        )}
      </div>

      {msg && (
        <p role="status" className={`text-xs ${msg.ok ? 'text-teal-700' : 'text-rose-600'}`}>
          {msg.text}
        </p>
      )}
    </div>
  )
}
