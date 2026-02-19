import { api } from './api.js'
import type { PromptListResponse, PromptDetailResponse } from '../types/prompt.js'

export const promptService = {
  getAll() {
    return api.get<PromptListResponse>('/prompts')
  },

  getById(id: number) {
    return api.get<PromptDetailResponse>(`/prompts/${id}`)
  },

  create(data: { name: string; content: string; description?: string; model_provider: string; model_name: string }) {
    return api.post<PromptDetailResponse>('/admin/prompts', data)
  },

  update(id: number, data: { name: string; content: string; description?: string; model_provider: string; model_name: string }) {
    return api.put<PromptDetailResponse>(`/admin/prompts/${id}`, data)
  },

  toggle(id: number) {
    return api.patch<PromptDetailResponse>(`/admin/prompts/${id}/toggle`)
  },

  delete(id: number) {
    return api.delete<{ message: string }>(`/admin/prompts/${id}`)
  },
}
