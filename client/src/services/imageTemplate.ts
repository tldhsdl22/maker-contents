import { api } from './api.js'
import type { ImageTemplateListResponse, ImageTemplateDetailResponse } from '../types/imageTemplate.js'

export interface ImageTemplatePayload {
  name: string
  description?: string
  original_image_prompt: string
  new_image_prompt?: string
  remove_watermark: boolean
}

export const imageTemplateService = {
  getAll() {
    return api.get<ImageTemplateListResponse>('/image-templates')
  },

  getById(id: number) {
    return api.get<ImageTemplateDetailResponse>(`/image-templates/${id}`)
  },

  create(data: ImageTemplatePayload) {
    return api.post<ImageTemplateDetailResponse>('/admin/image-templates', data)
  },

  update(id: number, data: ImageTemplatePayload) {
    return api.put<ImageTemplateDetailResponse>(`/admin/image-templates/${id}`, data)
  },

  toggle(id: number) {
    return api.patch<ImageTemplateDetailResponse>(`/admin/image-templates/${id}/toggle`)
  },

  delete(id: number) {
    return api.delete<{ message: string }>(`/admin/image-templates/${id}`)
  },
}
