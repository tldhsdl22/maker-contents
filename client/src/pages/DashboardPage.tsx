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
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-sm text-gray-500">안녕하세요, {user?.name}님. 오늘의 작업 현황입니다.</p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="surface-card hover-lift p-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">요약</h2>
                <p className="mt-1 text-xs text-gray-400">오늘과 이번 주 작업량</p>
              </div>
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600">
                Live
              </span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard label="오늘 생성한 원고" value={stats.todayCreated} tone="indigo" />
              <StatCard label="오늘 포스팅 완료" value={stats.todayPosted} tone="emerald" />
              <StatCard label="이번 주 생성" value={stats.weekCreated} tone="sky" />
              <StatCard label="이번 주 포스팅" value={stats.weekPosted} tone="violet" />
              <StatCard label="미포스팅 원고" value={stats.unposted} tone="amber" />
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="surface-card hover-lift overflow-hidden">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">최근 포스팅 성과</h2>
                    <p className="mt-1 text-xs text-gray-400">클릭하면 성과 상세로 이동</p>
                  </div>
                  <button onClick={() => navigate('/manuscripts')} className="btn-link text-sm">
                    전체 보기
                  </button>
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50/80">
                    <tr>
                      <th className="px-5 py-3 font-medium text-gray-500">원고</th>
                      <th className="px-5 py-3 font-medium text-gray-500">플랫폼</th>
                      <th className="px-5 py-3 font-medium text-gray-500">키워드</th>
                      <th className="px-5 py-3 font-medium text-gray-500">순위</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentPosts.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-400">
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
                          <td className="px-5 py-3">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                              {post.platform === 'cafe' ? '카페' : '블로그'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-500">{post.keyword || '—'}</td>
                          <td className="px-5 py-3">
                            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
                              {post.latest_rank ? `${post.latest_rank}위` : '순위권 외'}
                            </span>
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
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">빠른 접근</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Shortcut</span>
                </div>
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
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">사용자별 작업량</h3>
                      <p className="mt-1 text-xs text-gray-400">이번 주 포스팅 기준</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-600">Admin</span>
                  </div>
                  <ul className="mt-4 space-y-3">
                    {ranks.length === 0 ? (
                      <li className="text-sm text-gray-400">표시할 데이터가 없습니다.</li>
                    ) : (
                      ranks.map((rank, idx) => (
                        <li key={rank.user_id} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-gray-600">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                              {idx + 1}
                            </span>
                            {rank.user_name}
                          </span>
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">
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

function StatCard({ label, value, tone }: { label: string; value: number; tone: 'indigo' | 'emerald' | 'sky' | 'violet' | 'amber' }) {
  const toneStyles = {
    indigo: { bar: 'from-indigo-500 to-indigo-300', meta: 'bg-indigo-50', text: 'text-indigo-600' },
    emerald: { bar: 'from-emerald-500 to-emerald-300', meta: 'bg-emerald-50', text: 'text-emerald-600' },
    sky: { bar: 'from-sky-500 to-sky-300', meta: 'bg-sky-50', text: 'text-sky-600' },
    violet: { bar: 'from-violet-500 to-violet-300', meta: 'bg-violet-50', text: 'text-violet-600' },
    amber: { bar: 'from-amber-500 to-amber-300', meta: 'bg-amber-50', text: 'text-amber-600' },
  }
  const tones = toneStyles[tone]
  return (
    <div className="surface-card hover-lift relative overflow-hidden p-4">
      <div className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${tones.bar}`} />
      <div className="pl-3">
        <p className="text-sm text-gray-500">{label}</p>
        <div className="mt-2 flex items-end justify-between">
          <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tones.meta} ${tones.text}`}>
            Now
          </span>
        </div>
      </div>
    </div>
  )
}

function QuickLink({ label, description, onClick }: { label: string; description: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="surface-card hover-lift group px-4 py-3 text-left transition"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <span className="text-xs text-gray-400 transition group-hover:text-indigo-500">바로가기</span>
      </div>
      <p className="mt-1 text-xs text-gray-500">{description}</p>
    </button>
  )
}
