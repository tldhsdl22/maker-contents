import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import pool from '../connection.js'

export interface PostingRow extends RowDataPacket {
  id: number
  manuscript_id: number
  url: string
  platform: 'blog' | 'cafe'
  keyword: string | null
  posted_at: Date
}

export async function create(data: {
  manuscript_id: number
  url: string
  platform: 'blog' | 'cafe'
  keyword?: string | null
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO postings (manuscript_id, url, platform, keyword)
     VALUES (?, ?, ?, ?)`,
    [data.manuscript_id, data.url, data.platform, data.keyword ?? null]
  )
  return result.insertId
}

export async function findByManuscriptId(manuscriptId: number) {
  const [rows] = await pool.query<PostingRow[]>(
    `SELECT * FROM postings WHERE manuscript_id = ?`,
    [manuscriptId]
  )
  return rows[0] ?? null
}

export async function findById(id: number) {
  const [rows] = await pool.query<PostingRow[]>(
    `SELECT * FROM postings WHERE id = ?`,
    [id]
  )
  return rows[0] ?? null
}

export interface PostingWithManuscriptRow extends RowDataPacket {
  id: number
  manuscript_id: number
  url: string
  platform: 'blog' | 'cafe'
  keyword: string | null
  posted_at: Date
  manuscript_title: string
  user_id: number
  user_name: string
}

export async function findRecentByUser(userId: number, limit = 20) {
  const [rows] = await pool.query<PostingWithManuscriptRow[]>(
    `SELECT p.*, m.title AS manuscript_title, m.user_id, u.name AS user_name
     FROM postings p
     JOIN manuscripts m ON m.id = p.manuscript_id
     JOIN users u ON u.id = m.user_id
     WHERE m.user_id = ?
     ORDER BY p.posted_at DESC
     LIMIT ?`,
    [userId, limit]
  )
  return rows
}

export async function findRecentAll(limit = 20) {
  const [rows] = await pool.query<PostingWithManuscriptRow[]>(
    `SELECT p.*, m.title AS manuscript_title, m.user_id, u.name AS user_name
     FROM postings p
     JOIN manuscripts m ON m.id = p.manuscript_id
     JOIN users u ON u.id = m.user_id
     ORDER BY p.posted_at DESC
     LIMIT ?`,
    [limit]
  )
  return rows
}
