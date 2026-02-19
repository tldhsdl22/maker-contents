export interface User {
  id: number
  username: string
  name: string
  role: 'admin' | 'user'
}

export interface UserDetail extends User {
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  approved_at: string | null
  last_login_at: string | null
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  name: string
  password: string
}

export interface AuthResponse {
  token: string
  user: User
}
