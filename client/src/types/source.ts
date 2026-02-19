export interface SourceWorker {
  user_id: number
  user_name: string
}

export interface SourceCreator {
  user_id: number
  user_name: string
}

export interface Source {
  id: number
  title: string
  thumbnail_url: string | null
  thumbnail_local_path: string | null
  original_url: string
  category: string | null
  source_site: string
  crawled_at: string
  expires_at: string
  workers: SourceWorker[]
  creators: SourceCreator[]
}

export interface SourceImage {
  id: number
  original_url: string
  local_path: string
}

export interface SourceDetail extends Source {
  url_hash: string
  content_html: string
  images: SourceImage[]
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface SourceListResponse {
  sources: Source[]
  pagination: Pagination
  categories: string[]
}

export interface SourceDetailResponse {
  source: SourceDetail
}
