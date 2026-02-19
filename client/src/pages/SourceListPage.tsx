import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { sourceService } from '../services/source.js'
import { ApiError } from '../services/api.js'
import type { Source, Pagination } from '../types/source.js'

export default function SourceListPage() {
  const navigate = useNavigate()
  const [sources, setSources] = useState<Source[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)

  const fetchSources = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await sourceService.getAll({
        page,
        limit: 20,
        category: category || undefined,
        search: search || undefined,
      })
      setSources(data.sources)
      setPagination(data.pagination)
      setCategories(data.categories)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '소스 기사를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [page, category, search])

  useEffect(() => { fetchSources() }, [fetchSources])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  function handleCategoryChange(cat: string) {
    setCategory(cat)
    setPage(1)
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('ko-KR', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    })
  }

  function formatRelativeTime(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const hours = Math.floor(diff / 3_600_000)
    if (hours < 1) return '방금 전'
    if (hours < 24) return `${hours}시간 전`
    const days = Math.floor(hours / 24)
    return `${days}일 전`
  }

  return (
    <div className="page-shell p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">소스 기사</h1>
        <p className="mt-1 text-sm text-gray-500">
          자동 수집된 뉴스 기사입니다. 기사를 선택하여 원고를 생성할 수 있습니다.
        </p>
      </div>

      {/* 검색 + 필터 */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="기사 제목 검색..."
              className="h-9 rounded-lg border border-gray-200 bg-white/80 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <button
            type="submit"
            className="btn-base btn-primary btn-md h-9"
          >
            검색
          </button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}
              className="btn-base btn-secondary btn-md h-9"
            >
              초기화
            </button>
          )}
        </form>

        <div className="flex flex-wrap gap-1.5">
          <CategoryChip label="전체" active={category === ''} onClick={() => handleCategoryChange('')} />
          {categories.map(cat => (
            <CategoryChip key={cat} label={cat} active={category === cat} onClick={() => handleCategoryChange(cat)} />
          ))}
        </div>
      </div>

      {/* 상태 표시 */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {search && !loading && (
        <p className="mb-4 text-sm text-gray-500">
          &ldquo;{search}&rdquo; 검색 결과: {pagination.total}건
        </p>
      )}

      {/* 로딩 */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : sources.length === 0 ? (
        <EmptyState search={search} category={category} />
      ) : (
        <>
          {/* 기사 카드 목록 */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sources.map(source => (
              <SourceCard
                key={source.id}
                source={source}
                formatDate={formatDate}
                formatRelativeTime={formatRelativeTime}
                onGenerate={() => navigate(`/manuscripts/generate?sourceId=${source.id}`)}
              />
            ))}
          </div>

          {/* 페이지네이션 */}
          {pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white"
              >
                이전
              </button>
              <div className="flex items-center gap-1">
                {generatePageNumbers(page, pagination.totalPages).map((p, i) =>
                  p === -1 ? (
                    <span key={`dots-${i}`} className="px-1 text-gray-400">...</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`h-8 min-w-8 rounded-lg px-2 text-sm font-medium transition ${
                        p === page
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SourceCard({ source, formatDate, formatRelativeTime, onGenerate }: {
  source: Source
  formatDate: (d: string) => string
  formatRelativeTime: (d: string) => string
  onGenerate: () => void
}) {
  return (
    <div className="surface-card hover-lift group flex flex-col overflow-hidden">
      {/* Thumbnail */}
      <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
        {source.thumbnail_url ? (
          <img
            src={source.thumbnail_local_path ? `/${source.thumbnail_local_path}` : source.thumbnail_url}
            alt=""
            className="h-full w-full object-cover transition group-hover:scale-105"
            loading="lazy"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <PlaceholderIcon className="h-10 w-10 text-gray-300" />
          </div>
        )}

        {source.category && (
          <span className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
            {source.category}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900">
          {source.title}
        </h3>

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="font-medium text-gray-500">{source.source_site}</span>
            <span>·</span>
            <span title={formatDate(source.crawled_at)}>{formatRelativeTime(source.crawled_at)}</span>
          </div>

          {source.workers.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              <WorkerIcon className="h-3 w-3" />
              {source.workers.map(w => w.user_name).join(', ')}
            </span>
          )}
        </div>

        {source.creators.length > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            <span className="font-medium text-gray-600">원고 생성자</span>
            <span className="mx-1 text-gray-400">·</span>
            {source.creators.map(c => c.user_name).join(', ')}
          </div>
        )}

        <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
          <button
            onClick={onGenerate}
            className="btn-base btn-primary btn-sm flex-1"
          >
            원고 생성
          </button>
          <a
            href={source.original_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="btn-base btn-secondary btn-sm text-gray-500"
            title="원본 기사 보기"
          >
            <ExternalIcon className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  )
}

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
        active
          ? 'bg-indigo-600 text-white shadow-sm'
          : 'bg-white/70 text-gray-600 ring-1 ring-gray-200 hover:bg-white'
      }`}
    >
      {label}
    </button>
  )
}

function EmptyState({ search, category }: { search: string; category: string }) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <div className="mb-4 rounded-full bg-gray-100 p-4">
        <PlaceholderIcon className="h-8 w-8 text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-900">
        {search || category ? '조건에 맞는 기사가 없습니다.' : '수집된 기사가 없습니다.'}
      </p>
      <p className="mt-1 text-xs text-gray-500">
        {search || category
          ? '다른 검색어나 카테고리를 시도해 보세요.'
          : '크롤러가 곧 새 기사를 수집합니다.'}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pagination helper
// ---------------------------------------------------------------------------

function generatePageNumbers(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: number[] = [1]
  if (current > 3) pages.push(-1)

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)

  if (current < total - 2) pages.push(-1)
  pages.push(total)
  return pages
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  )
}

function PlaceholderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
    </svg>
  )
}

function WorkerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
    </svg>
  )
}

function ExternalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  )
}
