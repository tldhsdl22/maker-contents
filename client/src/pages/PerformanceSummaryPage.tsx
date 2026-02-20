import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { manuscriptService } from '../services/manuscript.js'
import { ApiError } from '../services/api.js'
import type { Manuscript } from '../types/manuscript.js'

type SortKey = 'recent' | 'rank'

export default function PerformanceSummaryPage() {
  const navigate = useNavigate()
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [sortKey, setSortKey] = useState<SortKey>('rank')

  useEffect(() => {
    setLoading(true)
    setError('')
    manuscriptService.getAll({ status: 'posted', page, limit: 20 })
      .then(res => {
        setManuscripts(res.manuscripts)
        setTotal(res.total)
      })
      .catch(err => {
        setError(err instanceof ApiError ? err.message : '성과 요약을 불러오지 못했습니다.')
      })
      .finally(() => setLoading(false))
  }, [page])

  const sorted = useMemo(() => {
    const copy = [...manuscripts]
    if (sortKey === 'recent') {
      return copy.sort((a, b) => (new Date(b.posted_at ?? 0).getTime() - new Date(a.posted_at ?? 0).getTime()))
    }
    return copy.sort((a, b) => {
      const ar = a.latest_rank ?? 99999
      const br = b.latest_rank ?? 99999
      return ar - br
    })
  }, [manuscripts, sortKey])

  const stats = useMemo(() => {
    const withRank = manuscripts.filter(m => typeof m.latest_rank === 'number')
    const bestRank = withRank.length ? Math.min(...withRank.map(m => m.latest_rank as number)) : null
    const avgRank = withRank.length
      ? Math.round(withRank.reduce((sum, m) => sum + (m.latest_rank as number), 0) / withRank.length)
      : null
    const tracking = manuscripts.filter(m => m.tracking_status === 'tracking').length
    return {
      total,
      tracking,
      bestRank,
      avgRank,
    }
  }, [manuscripts, total])

  return (
    <div className="page-shell p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">성과 집계</h1>
          <p className="mt-1 text-sm text-gray-500">네이버 검색 순위 변동을 추적합니다.</p>
        </div>
        <div className="surface-card hover-lift flex items-center gap-2 px-3 py-2">
          <label className="text-xs font-medium text-gray-500">정렬</label>
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
          >
            <option value="rank">순위 좋은 순</option>
            <option value="recent">최근 포스팅 순</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="surface-card hover-lift p-5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">요약 지표</h2>
            <p className="mt-1 text-xs text-gray-400">포스팅 완료 기준</p>
          </div>
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600">Summary</span>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard title="포스팅 수" value={`${stats.total}건`} subtitle="전체 포스팅 완료 기준" />
          <SummaryCard title="추적 중" value={`${stats.tracking}건`} subtitle="현재 성과 수집 진행" />
          <SummaryCard title="최고 순위" value={stats.bestRank ? `${stats.bestRank}위` : '—'} subtitle="순위권 데이터 기준" />
          <SummaryCard title="평균 순위" value={stats.avgRank ? `${stats.avgRank}위` : '—'} subtitle="순위권 데이터 기준" />
        </div>
      </div>

      <div className="surface-card hover-lift mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">포스팅 성과 목록</h2>
            <p className="mt-1 text-xs text-gray-400">성과 상세 페이지로 이동할 수 있습니다.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">List</span>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/80">
            <tr>
              <th className="px-6 py-3 font-medium text-gray-500">원고</th>
              <th className="px-6 py-3 font-medium text-gray-500">플랫폼</th>
              <th className="px-6 py-3 font-medium text-gray-500">키워드</th>
              <th className="px-6 py-3 font-medium text-gray-500">순위</th>
              <th className="px-6 py-3 font-medium text-gray-500">추적</th>
              <th className="px-6 py-3 font-medium text-gray-500">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">
                  불러오는 중...
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">
                  포스팅된 원고가 없습니다.
                </td>
              </tr>
            ) : (
              sorted.map(item => (
                <tr key={item.id} className="transition hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <p className="line-clamp-1 font-medium text-gray-900">{item.title}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {item.posted_at ? new Date(item.posted_at).toLocaleDateString('ko-KR') : '—'}
                    </p>
                  </td>
                  <td className="px-6 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {item.posting_platform === 'cafe' ? '카페' : item.posting_platform === 'blog' ? '블로그' : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-500">{item.posting_keyword || item.keyword || '—'}</td>
                  <td className="px-6 py-3">
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
                      {item.latest_rank ? `${item.latest_rank}위` : '순위권 외'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      item.tracking_status === 'completed'
                        ? 'bg-gray-100 text-gray-500'
                        : item.tracking_status === 'tracking'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                    }`}>
                      {item.tracking_status === 'completed'
                        ? '완료'
                        : item.tracking_status === 'tracking'
                          ? '추적 중'
                          : '대기'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/manuscripts/${item.id}/performance`)}
                        className="btn-base btn-secondary btn-sm"
                      >
                        상세
                      </button>
                      {item.posting_url && (
                        <a
                          href={item.posting_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-base btn-ghost btn-sm"
                        >
                          원문
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > 20 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-base btn-secondary btn-sm disabled:opacity-50"
          >
            이전
          </button>
          <span className="text-sm text-gray-500">{page} / {Math.ceil(total / 20)}</span>
          <button
            onClick={() => setPage(p => Math.min(Math.ceil(total / 20), p + 1))}
            disabled={page >= Math.ceil(total / 20)}
            className="btn-base btn-secondary btn-sm disabled:opacity-50"
          >
            다음
          </button>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <div className="surface-card hover-lift p-5">
      <p className="text-xs font-medium text-gray-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
      <p className="mt-2 text-xs text-gray-400">{subtitle}</p>
    </div>
  )
}
