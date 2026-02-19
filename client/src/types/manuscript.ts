export interface Manuscript {
  id: number
  title: string
  status: 'generating' | 'generated' | 'posted' | 'failed'
  keyword: string | null
  length_option: 'short' | 'medium' | 'long'
  source_title_snapshot: string | null
  prompt_snapshot: string | null
  user_name?: string
  posting_url?: string | null
  posting_platform?: 'blog' | 'cafe' | null
  posting_keyword?: string | null
  posted_at?: string | null
  tracking_status?: 'tracking' | 'completed' | null
  tracking_start?: string | null
  tracking_end?: string | null
  latest_rank?: number | null
  latest_views?: number | null
  latest_comments?: number | null
  created_at: string
  updated_at: string
}

export interface ManuscriptDetail extends Manuscript {
  user_id: number
  source_id: number | null
  prompt_id: number | null
  image_template_id: number | null
  content_html: string | null
  new_image_count: number
  prompt_snapshot: string | null
  image_template_snapshot: string | null
  source_url_snapshot: string | null
  user_name: string
  images: ManuscriptImage[]
}

export interface ManuscriptImage {
  id: number
  image_type: 'original_processed' | 'generated'
  file_url: string
  sort_order: number
}

export interface GenerateRequest {
  source_id: number
  prompt_id: number
  image_template_id: number
  keyword?: string
  length_option: 'short' | 'medium' | 'long'
  new_image_count: number
}

export interface GenerateResponse {
  manuscript_id: number
  job_id: number
  status: string
}

export interface ManuscriptStatusResponse {
  id: number
  status: 'generating' | 'generated' | 'posted' | 'failed'
  title: string
  created_at: string
}

export interface ManuscriptUpdateRequest {
  title: string
  content_html: string
}

export interface ManuscriptListResponse {
  manuscripts: Manuscript[]
  total: number
  page: number
  limit: number
}

export interface ManuscriptDetailResponse {
  manuscript: ManuscriptDetail
}

export interface Posting {
  id: number
  manuscript_id: number
  url: string
  platform: 'blog' | 'cafe'
  keyword: string | null
  posted_at: string
}

export interface PublishRequest {
  url: string
  platform: 'blog' | 'cafe'
  keyword?: string | null
}

export interface PublishResponse {
  posting: Posting
}

export interface PublishInfoResponse {
  posting: Posting | null
}
