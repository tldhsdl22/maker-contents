export interface DashboardSummary {
  today_created: number
  today_posted: number
  week_created: number
  week_posted: number
  unposted_count: number
}

export interface DashboardSummaryResponse {
  summary: DashboardSummary
}

export interface DashboardRecentPost {
  posting_id: number
  manuscript_id: number
  manuscript_title: string
  url: string
  platform: 'blog' | 'cafe'
  keyword: string | null
  posted_at: string
  tracking_status: 'tracking' | 'completed' | null
  latest_rank: number | null
  latest_views: number | null
  latest_comments: number | null
}

export interface DashboardRecentPostsResponse {
  posts: DashboardRecentPost[]
}

export interface DashboardUserRank {
  user_id: number
  user_name: string
  week_created: number
  week_posted: number
}

export interface AdminDashboardSummaryResponse {
  summary: DashboardSummary
  ranks: DashboardUserRank[]
}
