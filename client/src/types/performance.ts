export interface PerformanceTracking {
  id: number
  status: 'tracking' | 'completed'
  tracking_start: string
  tracking_end: string
}

export interface PerformanceDataPoint {
  keyword_rank: number | null
  view_count: number | null
  comment_count: number | null
  is_accessible: boolean
  collected_at: string
}

export interface PerformanceResponse {
  tracking: PerformanceTracking | null
  data: PerformanceDataPoint[]
}

export interface PerformanceSummary {
  posting_id: number
  manuscript_id: number
  manuscript_title: string
  url: string
  platform: 'blog' | 'cafe'
  keyword: string | null
  posted_at: string
  tracking_status: 'tracking' | 'completed' | null
  tracking_start: string | null
  tracking_end: string | null
  latest_rank: number | null
  latest_views: number | null
  latest_comments: number | null
}

export interface PerformanceSummaryResponse {
  summary: PerformanceSummary | null
}
