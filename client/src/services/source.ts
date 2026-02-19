import { api } from './api.js'
import type { SourceListResponse, SourceDetailResponse } from '../types/source.js'

export interface SourceListParams {
  page?: number
  limit?: number
  category?: string
  search?: string
}

export const sourceService = {
  getAll(params: SourceListParams = {}) {
    const query = new URLSearchParams()
    if (params.page) query.set('page', String(params.page))
    if (params.limit) query.set('limit', String(params.limit))
    if (params.category) query.set('category', params.category)
    if (params.search) query.set('search', params.search)

    const qs = query.toString()
    return api.get<SourceListResponse>(`/sources${qs ? `?${qs}` : ''}`)
  },

  getById(id: number) {
    return api.get<SourceDetailResponse>(`/sources/${id}`)
  },
}
