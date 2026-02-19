import { api } from './api.js'
import type { AuthResponse, LoginRequest, RegisterRequest, User, UserDetail } from '../types/auth.js'

export const authService = {
  login(data: LoginRequest) {
    return api.post<AuthResponse>('/auth/login', data)
  },

  register(data: RegisterRequest) {
    return api.post<{ message: string; token?: string; user?: User }>('/auth/register', data)
  },

  me() {
    return api.get<{ user: User }>('/auth/me')
  },

  checkUsername(username: string) {
    return api.get<{ available: boolean }>(`/auth/check-username/${username}`)
  },
}

export const adminUserService = {
  getAll() {
    return api.get<{ users: UserDetail[] }>('/admin/users')
  },

  getPending() {
    return api.get<{ users: UserDetail[] }>('/admin/users/pending')
  },

  approve(id: number, role: 'admin' | 'user' = 'user') {
    return api.patch<{ message: string }>(`/admin/users/${id}/approve`, { role })
  },

  reject(id: number) {
    return api.patch<{ message: string }>(`/admin/users/${id}/reject`)
  },

  changeRole(id: number, role: 'admin' | 'user') {
    return api.patch<{ message: string }>(`/admin/users/${id}/role`, { role })
  },

  deactivate(id: number) {
    return api.patch<{ message: string }>(`/admin/users/${id}/deactivate`)
  },
}
