import { api } from './api.js'
import type {
  DashboardSummaryResponse,
  DashboardRecentPostsResponse,
  AdminDashboardSummaryResponse,
} from '../types/dashboard.js'

export const dashboardService = {
  getSummary() {
    return api.get<DashboardSummaryResponse>('/dashboard/summary')
  },

  getRecentPosts(limit = 10) {
    const qs = new URLSearchParams()
    qs.set('limit', String(limit))
    return api.get<DashboardRecentPostsResponse>(`/dashboard/recent-posts?${qs.toString()}`)
  },

  getAdminSummary() {
    return api.get<AdminDashboardSummaryResponse>('/admin/dashboard/summary')
  },
}
