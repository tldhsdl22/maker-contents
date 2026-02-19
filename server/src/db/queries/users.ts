import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import pool from '../connection.js'

export interface UserRow extends RowDataPacket {
  id: number
  username: string
  name: string
  password: string
  role: 'admin' | 'user'
  status: 'pending' | 'approved' | 'rejected'
  created_at: Date
  approved_at: Date | null
  last_login_at: Date | null
}

export async function findByUsername(username: string) {
  const [rows] = await pool.query<UserRow[]>(
    'SELECT * FROM users WHERE username = ?',
    [username]
  )
  return rows[0] ?? null
}

export async function findById(id: number) {
  const [rows] = await pool.query<UserRow[]>(
    'SELECT * FROM users WHERE id = ?',
    [id]
  )
  return rows[0] ?? null
}

export async function countAll() {
  const [rows] = await pool.query<(RowDataPacket & { cnt: number })[]>(
    'SELECT COUNT(*) AS cnt FROM users'
  )
  return rows[0].cnt
}

export async function countAdmins() {
  const [rows] = await pool.query<(RowDataPacket & { cnt: number })[]>(
    "SELECT COUNT(*) AS cnt FROM users WHERE role = 'admin' AND status = 'approved'"
  )
  return rows[0].cnt
}

export async function create(data: {
  username: string
  name: string
  password: string
  role?: 'admin' | 'user'
  status?: 'pending' | 'approved'
}) {
  const role = data.role ?? 'user'
  const status = data.status ?? 'pending'
  const approvedAt = status === 'approved' ? new Date() : null

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO users (username, name, password, role, status, approved_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.username, data.name, data.password, role, status, approvedAt]
  )
  return result.insertId
}

export async function updateLastLogin(id: number) {
  await pool.query(
    'UPDATE users SET last_login_at = NOW() WHERE id = ?',
    [id]
  )
}

export async function findPending() {
  const [rows] = await pool.query<UserRow[]>(
    "SELECT id, username, name, role, status, created_at FROM users WHERE status = 'pending' ORDER BY created_at ASC"
  )
  return rows
}

export async function findAllExceptPassword() {
  const [rows] = await pool.query<UserRow[]>(
    'SELECT id, username, name, role, status, created_at, approved_at, last_login_at FROM users ORDER BY created_at DESC'
  )
  return rows
}

export async function approve(id: number, role: 'admin' | 'user' = 'user') {
  await pool.query(
    "UPDATE users SET status = 'approved', role = ?, approved_at = NOW() WHERE id = ? AND status = 'pending'",
    [role, id]
  )
}

export async function reject(id: number) {
  await pool.query(
    "UPDATE users SET status = 'rejected' WHERE id = ? AND status = 'pending'",
    [id]
  )
}

export async function updateRole(id: number, role: 'admin' | 'user') {
  await pool.query(
    'UPDATE users SET role = ? WHERE id = ?',
    [role, id]
  )
}

export async function deactivate(id: number) {
  await pool.query(
    "UPDATE users SET status = 'rejected' WHERE id = ?",
    [id]
  )
}
