import { useEffect, useMemo, useState } from 'react'

export type PublishPlatform = 'blog' | 'cafe'

export interface PublishModalSubmit {
  url: string
  platform: PublishPlatform
  keyword?: string | null
}

export default function PublishModal({
  open,
  onClose,
  onSubmit,
  initialKeyword,
  initialUrl,
  initialPlatform,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: PublishModalSubmit) => Promise<void>
  initialKeyword?: string | null
  initialUrl?: string | null
  initialPlatform?: PublishPlatform | null
}) {
  const [url, setUrl] = useState(initialUrl || '')
  const [platform, setPlatform] = useState<PublishPlatform>(initialPlatform || 'blog')
  const [keyword, setKeyword] = useState(initialKeyword || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function normalizeUrl(raw: string) {
    const trimmed = raw.trim()
    if (!trimmed) return { normalized: '', error: '포스팅 URL을 입력해 주세요.' }
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    try {
      const parsed = new URL(withProtocol)
      if (!/^https?:$/.test(parsed.protocol)) {
        return { normalized: '', error: '올바른 URL을 입력해 주세요.' }
      }
      return { normalized: parsed.toString(), error: '' }
    } catch {
      return { normalized: '', error: '올바른 URL을 입력해 주세요.' }
    }
  }

  useEffect(() => {
    if (!open) return
    setUrl(initialUrl || '')
    setPlatform(initialPlatform || 'blog')
    setKeyword(initialKeyword || '')
    setError('')
    setLoading(false)
  }, [open, initialKeyword, initialPlatform, initialUrl])

  const detectedPlatform = useMemo(() => {
    try {
      const candidate = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`
      const parsed = new URL(candidate)
      const host = parsed.hostname
      if (host.includes('blog.naver.com') || host.includes('m.blog.naver.com')) return 'blog'
      if (host.includes('cafe.naver.com') || host.includes('m.cafe.naver.com')) return 'cafe'
    } catch {
      return null
    }
    return null
  }, [url])

  useEffect(() => {
    if (detectedPlatform) setPlatform(detectedPlatform)
  }, [detectedPlatform])

  async function handleSubmit() {
    const { normalized, error: urlError } = normalizeUrl(url)
    if (urlError) {
      setError(urlError)
      return
    }
    setError('')
    setLoading(true)
    try {
      await onSubmit({
        url: normalized,
        platform,
        keyword: keyword.trim() || null,
      })
      setUrl(normalized)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '포스팅 완료 처리에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">포스팅 완료 처리</h2>
          <p className="mt-1 text-sm text-gray-500">등록한 URL과 플랫폼 정보를 입력해 주세요.</p>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="text-sm font-medium text-gray-700">포스팅 URL</label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://blog.naver.com/..."
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">플랫폼</label>
            <div className="mt-2 flex gap-2">
              {(['blog', 'cafe'] as PublishPlatform[]).map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPlatform(item)}
                  className={`btn-base btn-sm flex-1 ${
                    platform === item ? 'btn-primary' : 'btn-secondary'
                  }`}
                >
                  {item === 'blog' ? '블로그' : '카페'}
                </button>
              ))}
            </div>
            {detectedPlatform && (
              <p className="mt-1 text-xs text-gray-400">URL 기반으로 플랫폼을 자동 선택했습니다.</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">성과 추적 키워드</label>
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="키워드를 입력하세요"
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-400">원고 생성 시 사용한 키워드를 기본값으로 사용합니다.</p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="btn-base btn-secondary btn-md"
            disabled={loading}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="btn-base btn-primary btn-md disabled:opacity-60"
          >
            {loading ? '처리 중...' : '완료'}
          </button>
        </div>
      </div>
    </div>
  )
}
