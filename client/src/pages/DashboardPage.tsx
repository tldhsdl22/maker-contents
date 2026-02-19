import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { dashboardService } from '../services/dashboard.js'
import { ApiError } from '../services/api.js'
import type { DashboardRecentPost, DashboardSummary, DashboardUserRank } from '../types/dashboard.js'

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [recentPosts, setRecentPosts] = useState<DashboardRecentPost[]>([])
  const [ranks, setRanks] = useState<DashboardUserRank[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    setLoading(true)
    setError('')

    const requests: Promise<unknown>[] = [
      dashboardService.getSummary().then(data => setSummary(data.summary)),
      dashboardService.getRecentPosts(10).then(data => setRecentPosts(data.posts)),
    ]

    if (user.role === 'admin') {
      requests.push(
        dashboardService.getAdminSummary().then(data => {
          setRanks(data.ranks)
        })
      )
    }

    Promise.all(requests)
      .catch(err => {
        setError(err instanceof ApiError ? err.message : '대시보드 데이터를 불러오지 못했습니다.')
      })
      .finally(() => setLoading(false))
  }, [user])

  const stats = useMemo(() => ({
    todayCreated: summary?.today_created ?? 0,
    todayPosted: summary?.today_posted ?? 0,
    weekCreated: summary?.week_created ?? 0,
    weekPosted: summary?.week_posted ?? 0,
    unposted: summary?.unposted_count ?? 0,
  }), [summary])

  return (
    <div className="page-shell p-6">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">대시보드</h1>
      <p className="mb-8 text-sm text-gray-500">안녕하세요, {user?.name}님. 오늘의 작업 현황입니다.</p>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="오늘 생성한 원고" value={stats.todayCreated} />
            <StatCard label="오늘 포스팅 완료" value={stats.todayPosted} />
            <StatCard label="이번 주 생성" value={stats.weekCreated} />
            <StatCard label="이번 주 포스팅" value={stats.weekPosted} />
            <StatCard label="미포스팅 원고" value={stats.unposted} />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">최근 포스팅 성과</h2>
                <button
                  onClick={() => navigate('/manuscripts')}
                  className="btn-link text-sm"
                >
                  전체 보기
                </button>
              </div>

              <div className="surface-card hover-lift mt-3 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="px-5 py-3 font-medium text-gray-500">원고</th>
                      <th className="px-5 py-3 font-medium text-gray-500">플랫폼</th>
                      <th className="px-5 py-3 font-medium text-gray-500">키워드</th>
                      <th className="px-5 py-3 font-medium text-gray-500">순위</th>
                      <th className="px-5 py-3 font-medium text-gray-500">조회/댓글</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentPosts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">
                          아직 포스팅 성과가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      recentPosts.map(post => (
                        <tr
                          key={post.posting_id}
                          className="cursor-pointer transition hover:bg-gray-50"
                          onClick={() => navigate(`/manuscripts/${post.manuscript_id}/performance`)}
                        >
                          <td className="px-5 py-3">
                            <p className="font-medium text-gray-900 line-clamp-1">{post.manuscript_title}</p>
                            <p className="mt-1 text-xs text-gray-400">
                              {new Date(post.posted_at).toLocaleDateString('ko-KR')}
                            </p>
                          </td>
                          <td className="px-5 py-3 text-gray-500">
                            {post.platform === 'cafe' ? '카페' : '블로그'}
                          </td>
                          <td className="px-5 py-3 text-gray-500">{post.keyword || '—'}</td>
                          <td className="px-5 py-3 text-gray-500">
                            {post.latest_rank ? `${post.latest_rank}위` : '순위권 외'}
                          </td>
                          <td className="px-5 py-3 text-gray-500">
                            {post.latest_views ?? '—'} / {post.latest_comments ?? '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-6">
              <div className="surface-card hover-lift p-5">
                <h3 className="text-sm font-semibold text-gray-900">빠른 접근</h3>
                <div className="mt-4 flex flex-col gap-2">
                  <QuickLink
                    label="새 소스 확인하기"
                    description="최신 수집 기사 확인"
                    onClick={() => navigate('/sources')}
                  />
                  <QuickLink
                    label="내 원고 관리"
                    description="원고 편집 및 포스팅"
                    onClick={() => navigate('/manuscripts')}
                  />
                </div>
              </div>

              {user?.role === 'admin' && (
                <div className="surface-card hover-lift p-5">
                  <h3 className="text-sm font-semibold text-gray-900">사용자별 작업량</h3>
                  <p className="mt-1 text-xs text-gray-400">이번 주 포스팅 기준</p>
                  <ul className="mt-4 space-y-3">
                    {ranks.length === 0 ? (
                      <li className="text-sm text-gray-400">표시할 데이터가 없습니다.</li>
                    ) : (
                      ranks.map((rank, idx) => (
                        <li key={rank.user_id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">
                            {idx + 1}. {rank.user_name}
                          </span>
                          <span className="text-gray-900">
                            {rank.week_posted}건
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface-card hover-lift p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
    </div>
  )
}

function QuickLink({ label, description, onClick }: { label: string; description: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="surface-card hover-lift px-4 py-3 text-left transition"
    >
      <p className="text-sm font-semibold text-gray-900">{label}</p>
      <p className="mt-1 text-xs text-gray-500">{description}</p>
    </button>
  )
}
