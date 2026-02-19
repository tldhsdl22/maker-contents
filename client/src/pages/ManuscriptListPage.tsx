import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { manuscriptService } from '../services/manuscript.js'
import { ApiError } from '../services/api.js'
import type { Manuscript } from '../types/manuscript.js'
import PublishModal from '../components/PublishModal.js'
import type { PublishModalSubmit } from '../components/PublishModal.js'

const STATUS_TABS = [
  { key: '', label: '전체' },
  { key: 'generated', label: '생성 완료' },
  { key: 'posted', label: '포스팅 완료' },
  { key: 'failed', label: '생성 실패' },
] as const

const STATUS_BADGE: Record<string, { text: string; cls: string }> = {
  generating: { text: '생성 중', cls: 'bg-yellow-50 text-yellow-700' },
  generated: { text: '생성 완료', cls: 'bg-blue-50 text-blue-700' },
  posted: { text: '포스팅 완료', cls: 'bg-green-50 text-green-700' },
  failed: { text: '생성 실패', cls: 'bg-red-50 text-red-700' },
}

export default function ManuscriptListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [publishTarget, setPublishTarget] = useState<Manuscript | null>(null)

  const currentStatus = searchParams.get('status') || ''
  const currentPage = Math.max(1, Number(searchParams.get('page')) || 1)

  const fetchManuscripts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await manuscriptService.getAll({
        status: currentStatus || undefined,
        page: currentPage,
        limit: 20,
      })
      setManuscripts(data.manuscripts)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '원고 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [currentStatus, currentPage])

  useEffect(() => { fetchManuscripts() }, [fetchManuscripts])

  function handleTabChange(status: string) {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    setSearchParams(params)
  }

  function handlePageChange(page: number) {
    const params = new URLSearchParams(searchParams)
    params.set('page', String(page))
    setSearchParams(params)
  }

  async function handleDelete(manuscript: Manuscript) {
    if (!confirm(`"${manuscript.title}" 원고를 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.`)) return
    try {
      await manuscriptService.delete(manuscript.id)
      setManuscripts(prev => prev.filter(m => m.id !== manuscript.id))
      setTotal(prev => prev - 1)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : '삭제에 실패했습니다.')
    }
  }

  async function handlePublish(data: PublishModalSubmit) {
    if (!publishTarget) return
    const response = await manuscriptService.publish(publishTarget.id, data)
    setManuscripts(prev => prev.map(m => m.id === publishTarget.id ? {
      ...m,
      status: 'posted',
      posting_url: response.posting.url,
      posting_platform: response.posting.platform,
      posting_keyword: response.posting.keyword,
      posted_at: response.posting.posted_at,
    } : m))
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="page-shell p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">내 원고</h1>
        <p className="mt-1 text-sm text-gray-500">생성된 원고를 관리하고 편집합니다.</p>
      </div>

      {/* 상태별 필터 탭 */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
              currentStatus === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : manuscripts.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 font-medium text-gray-500">제목</th>
                  <th className="px-6 py-3 font-medium text-gray-500">상태</th>
                  <th className="px-6 py-3 font-medium text-gray-500">원본 기사</th>
                  <th className="px-6 py-3 font-medium text-gray-500">생성일</th>
                  <th className="px-6 py-3 font-medium text-gray-500">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {manuscripts.map(m => (
                  <ManuscriptRow
                    key={m.id}
                    manuscript={m}
                    onEdit={() => navigate(`/manuscripts/${m.id}`)}
                    onDelete={() => handleDelete(m)}
                    onPublish={() => setPublishTarget(m)}
                    onPerformance={() => navigate(`/manuscripts/${m.id}/performance`)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                전체 {total}건 중 {(currentPage - 1) * 20 + 1}~{Math.min(currentPage * 20, total)}건
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="rounded-lg px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-100 disabled:opacity-40"
                >
                  이전
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => Math.abs(p - currentPage) <= 2 || p === 1 || p === totalPages)
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1]
                    const showGap = prev && p - prev > 1
                    return (
                      <span key={p} className="flex items-center">
                        {showGap && <span className="px-1 text-gray-400">…</span>}
                        <button
                          onClick={() => handlePageChange(p)}
                          className={`min-w-[2rem] rounded-lg px-2 py-1.5 text-sm transition ${
                            p === currentPage
                              ? 'bg-blue-600 font-medium text-white'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {p}
                        </button>
                      </span>
                    )
                  })}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="rounded-lg px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-100 disabled:opacity-40"
                >
                  다음
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <PublishModal
        open={!!publishTarget}
        onClose={() => setPublishTarget(null)}
        onSubmit={handlePublish}
        initialKeyword={publishTarget?.keyword}
      />
    </div>
  )
}

function ManuscriptRow({ manuscript, onEdit, onDelete, onPublish, onPerformance }: {
  manuscript: Manuscript
  onEdit: () => void
  onDelete: () => void
  onPublish: () => void
  onPerformance: () => void
}) {
  const badge = STATUS_BADGE[manuscript.status] || STATUS_BADGE.generated
  const createdAt = new Date(manuscript.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  const postedAt = manuscript.posted_at
    ? new Date(manuscript.posted_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
    : null

  return (
    <tr className="transition hover:bg-gray-50">
      <td className="px-6 py-4">
        <button onClick={onEdit} className="btn-link text-left text-sm">
          <span className="line-clamp-1">{manuscript.title}</span>
        </button>
        {manuscript.keyword && (
          <span className="mt-0.5 block text-xs text-gray-400">키워드: {manuscript.keyword}</span>
        )}
        {manuscript.status === 'posted' && (
          <div className="mt-1 space-y-1 text-xs text-gray-400">
            {manuscript.posting_url && (
              <a
                href={manuscript.posting_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-link block text-emerald-600 hover:text-emerald-700"
              >
                {manuscript.posting_platform === 'cafe' ? '카페' : '블로그'} · {postedAt || '포스팅 URL'}
              </a>
            )}
            <div className="flex items-center gap-3 text-gray-500">
              <span>순위: {manuscript.latest_rank ? `${manuscript.latest_rank}위` : '순위권 외'}</span>
              <span>조회: {manuscript.latest_views ?? '—'}</span>
              <span>댓글: {manuscript.latest_comments ?? '—'}</span>
            </div>
          </div>
        )}
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${badge.cls}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${
            manuscript.status === 'posted' ? 'bg-green-500' :
              manuscript.status === 'generated' ? 'bg-blue-500' :
              manuscript.status === 'failed' ? 'bg-red-500' :
              'bg-yellow-500'
          }`} />
          {badge.text}
        </span>
      </td>
      <td className="max-w-[200px] truncate px-6 py-4 text-gray-500">
        {manuscript.source_title_snapshot || '—'}
      </td>
      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{createdAt}</td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-1">
          {manuscript.status === 'posted' && (
            <button
              onClick={onPerformance}
              className="btn-base btn-ghost btn-sm text-gray-400"
              title="성과 보기"
            >
              <ChartIcon className="h-4 w-4" />
            </button>
          )}
          {manuscript.status === 'generated' && (
            <button
              onClick={onPublish}
              className="btn-base btn-ghost btn-sm text-gray-400 hover:bg-emerald-50 hover:text-emerald-600"
              title="포스팅 완료 처리"
            >
              <UploadIcon className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onEdit}
            className="btn-base btn-ghost btn-sm text-gray-400"
            title="편집"
          >
            <EditIcon className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="btn-base btn-ghost btn-sm text-gray-400 hover:bg-red-50 hover:text-red-600"
            title="삭제"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-16">
      <div className="rounded-full bg-gray-100 p-3">
        <DocIcon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="mt-4 text-sm font-medium text-gray-900">원고가 없습니다</h3>
      <p className="mt-1 text-sm text-gray-500">소스 기사에서 원고를 생성해보세요.</p>
    </div>
  )
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  )
}

function DocIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  )
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 15l3-3 4 4 5-6" />
    </svg>
  )
}
