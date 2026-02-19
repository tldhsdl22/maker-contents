import { api } from './api.js'
import type {
  GenerateRequest,
  GenerateResponse,
  ManuscriptStatusResponse,
  ManuscriptListResponse,
  ManuscriptDetailResponse,
  ManuscriptUpdateRequest,
  PublishRequest,
  PublishResponse,
  PublishInfoResponse,
} from '../types/manuscript.js'
import type { PerformanceResponse, PerformanceSummaryResponse } from '../types/performance.js'

export const manuscriptService = {
  generate(data: GenerateRequest) {
    return api.post<GenerateResponse>('/manuscripts/generate', data)
  },

  getStatus(id: number) {
    return api.get<ManuscriptStatusResponse>(`/manuscripts/${id}/status`)
  },

  getAll(params?: { status?: string; page?: number; limit?: number }) {
    const qs = new URLSearchParams()
    if (params?.status) qs.set('status', params.status)
    if (params?.page) qs.set('page', String(params.page))
    if (params?.limit) qs.set('limit', String(params.limit))
    const query = qs.toString()
    return api.get<ManuscriptListResponse>(`/manuscripts${query ? `?${query}` : ''}`)
  },

  getById(id: number) {
    return api.get<ManuscriptDetailResponse>(`/manuscripts/${id}`)
  },

  update(id: number, data: ManuscriptUpdateRequest) {
    return api.put<ManuscriptDetailResponse>(`/manuscripts/${id}`, data)
  },

  delete(id: number) {
    return api.delete<{ message: string }>(`/manuscripts/${id}`)
  },

  publish(id: number, data: PublishRequest) {
    return api.post<PublishResponse>(`/manuscripts/${id}/publish`, data)
  },

  getPublishInfo(id: number) {
    return api.get<PublishInfoResponse>(`/manuscripts/${id}/publish-info`)
  },

  getPerformance(id: number) {
    return api.get<PerformanceResponse>(`/manuscripts/${id}/performance`)
  },

  getPerformanceSummary(id: number) {
    return api.get<PerformanceSummaryResponse>(`/manuscripts/${id}/performance/summary`)
  },
}
