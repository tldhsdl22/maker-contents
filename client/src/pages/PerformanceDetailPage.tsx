import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { manuscriptService } from '../services/manuscript.js'
import { ApiError } from '../services/api.js'
import type { PerformanceDataPoint, PerformanceSummary } from '../types/performance.js'

export default function PerformanceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<PerformanceSummary | null>(null)
  const [data, setData] = useState<PerformanceDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError('')
    Promise.all([
      manuscriptService.getPerformanceSummary(Number(id)),
      manuscriptService.getPerformance(Number(id)),
    ])
      .then(([summaryRes, dataRes]) => {
        setSummary(summaryRes.summary)
        setData(dataRes.data)
      })
      .catch(err => {
        setError(err instanceof ApiError ? err.message : '성과 데이터를 불러오지 못했습니다.')
      })
      .finally(() => setLoading(false))
  }, [id])

  const progress = useMemo(() => {
    if (!summary?.tracking_start || !summary.tracking_end) return 0
    const start = new Date(summary.tracking_start).getTime()
    const end = new Date(summary.tracking_end).getTime()
    if (!start || !end || end <= start) return 0
    const ratio = (Date.now() - start) / (end - start)
    return Math.max(0, Math.min(1, ratio))
  }, [summary])

  const latestRank = summary?.latest_rank ?? null

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (!summary) {
    return (
    <div className="page-shell p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error || '성과 정보를 찾을 수 없습니다.'}
        </div>
      <button onClick={() => navigate('/manuscripts')} className="btn-link mt-4 text-sm">
          목록으로 돌아가기
        </button>
      </div>
    )
  }

  return (
    <div className="page-shell p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">성과 상세</h1>
          <p className="mt-1 text-sm text-gray-500">{summary.manuscript_title}</p>
        </div>
        <button
          onClick={() => navigate(`/manuscripts/${summary.manuscript_id}`)}
          className="btn-base btn-secondary btn-md"
        >
          원고로 돌아가기
        </button>
      </div>

      <div className="grid gap-4">
        <SummaryCard
          title="현재 순위"
          value={latestRank ? `${latestRank}위` : '순위권 외'}
          subtitle={summary.keyword ? `키워드: ${summary.keyword}` : '키워드 없음'}
        />
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">추적 기간</h3>
            <p className="mt-1 text-sm text-gray-500">
              {summary.tracking_start ? new Date(summary.tracking_start).toLocaleDateString('ko-KR') : '—'}
              {' ~ '}
              {summary.tracking_end ? new Date(summary.tracking_end).toLocaleDateString('ko-KR') : '—'}
            </p>
          </div>
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
            summary.tracking_status === 'completed'
              ? 'bg-gray-100 text-gray-500'
              : 'bg-blue-50 text-blue-700'
          }`}>
            {summary.tracking_status === 'completed' ? '추적 완료' : '추적 중'}
          </span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <p className="mt-2 text-xs text-gray-400">진행률 {Math.round(progress * 100)}%</p>
      </div>

      <div className="mt-6 grid gap-6">
        <TrendCard title="키워드 순위 추이" unit="위" data={data.map(d => d.keyword_rank)} />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-6 py-3 font-medium text-gray-500">수집 시각</th>
              <th className="px-6 py-3 font-medium text-gray-500">순위</th>
              <th className="px-6 py-3 font-medium text-gray-500">접근</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-10 text-center text-sm text-gray-400">
                  아직 수집된 데이터가 없습니다.
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr key={`${row.collected_at}-${idx}`} className="transition hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-600">
                    {new Date(row.collected_at).toLocaleString('ko-KR')}
                  </td>
                  <td className="px-6 py-3 text-gray-600">{row.keyword_rank ? `${row.keyword_rank}위` : '순위권 외'}</td>
                  <td className="px-6 py-3 text-gray-600">{row.is_accessible ? '접근 가능' : '접근 불가'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SummaryCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium text-gray-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
      <p className="mt-2 text-xs text-gray-400">{subtitle}</p>
    </div>
  )
}

function TrendCard({ title, unit, data }: { title: string; unit: string; data: Array<number | null> }) {
  const cleaned = data.filter((v): v is number => typeof v === 'number')
  const latest = cleaned.length ? cleaned[cleaned.length - 1] : null
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">
        {latest !== null ? `${latest.toLocaleString()}${unit}` : '집계중'}
      </p>
      <div className="mt-3 h-20">
        <MiniLineChart values={cleaned} />
      </div>
      <p className="mt-2 text-xs text-gray-400">최근 {cleaned.length}회 수집</p>
    </div>
  )
}

function MiniLineChart({ values }: { values: number[] }) {
  if (!values.length) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-gray-200 text-xs text-gray-400">
        데이터 없음
      </div>
    )
  }

  const width = 240
  const height = 80
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1

  const points = values.map((v, idx) => {
    const x = (idx / (values.length - 1 || 1)) * width
    const y = height - ((v - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
      <polyline
        fill="none"
        stroke="#3B82F6"
        strokeWidth="2"
        points={points}
      />
    </svg>
  )
}
