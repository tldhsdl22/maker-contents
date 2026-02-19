import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import pool from '../connection.js'

export interface SourceRow extends RowDataPacket {
  id: number
  title: string
  thumbnail_url: string | null
  thumbnail_local_path: string | null
  original_url: string
  url_hash: string
  content_html: string
  category: string | null
  source_site: string
  crawled_at: Date
  expires_at: Date
}

export interface SourceImageRow extends RowDataPacket {
  id: number
  source_id: number
  original_url: string
  local_path: string
  created_at: Date
}

export interface SourceWorkerInfo extends RowDataPacket {
  source_id: number
  user_id: number
  user_name: string
}

export interface SourceCreatorInfo extends RowDataPacket {
  source_id: number
  user_id: number
  user_name: string
}

interface CountRow extends RowDataPacket {
  total: number
}

export interface FindAllParams {
  page: number
  limit: number
  category?: string
  search?: string
}

export async function findAll(params: FindAllParams) {
  const { page, limit, category, search } = params
  const offset = (page - 1) * limit
  const conditions: string[] = []
  const values: unknown[] = []

  if (category) {
    conditions.push('s.category = ?')
    values.push(category)
  }
  if (search) {
    conditions.push('s.title LIKE ?')
    values.push(`%${search}%`)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const [rows] = await pool.query<SourceRow[]>(
    `SELECT s.id, s.title, s.thumbnail_url, s.thumbnail_local_path,
            s.original_url, s.category, s.source_site, s.crawled_at, s.expires_at
     FROM sources s
     ${where}
     ORDER BY s.crawled_at DESC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  )

  const [countResult] = await pool.query<CountRow[]>(
    `SELECT COUNT(*) AS total FROM sources s ${where}`,
    values
  )

  return { rows, total: countResult[0].total }
}

export async function findById(id: number) {
  const [rows] = await pool.query<SourceRow[]>(
    'SELECT * FROM sources WHERE id = ?',
    [id]
  )
  return rows[0] ?? null
}

export async function findByUrlHash(hash: string) {
  const [rows] = await pool.query<SourceRow[]>(
    'SELECT id FROM sources WHERE url_hash = ?',
    [hash]
  )
  return rows[0] ?? null
}

export async function create(data: {
  title: string
  thumbnail_url: string | null
  original_url: string
  url_hash: string
  content_html: string
  category: string | null
  source_site: string
}) {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO sources (title, thumbnail_url, original_url, url_hash, content_html, category, source_site, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.title, data.thumbnail_url, data.original_url, data.url_hash,
     data.content_html, data.category, data.source_site, expiresAt]
  )
  return result.insertId
}

export async function updateThumbnailLocalPath(id: number, localPath: string) {
  await pool.query(
    'UPDATE sources SET thumbnail_local_path = ? WHERE id = ?',
    [localPath, id]
  )
}

export async function createImage(data: {
  source_id: number
  original_url: string
  local_path: string
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO source_images (source_id, original_url, local_path)
     VALUES (?, ?, ?)`,
    [data.source_id, data.original_url, data.local_path]
  )
  return result.insertId
}

export async function findImagesBySourceId(sourceId: number) {
  const [rows] = await pool.query<SourceImageRow[]>(
    'SELECT * FROM source_images WHERE source_id = ? ORDER BY id',
    [sourceId]
  )
  return rows
}

export async function findWorkersBySourceIds(sourceIds: number[]) {
  if (sourceIds.length === 0) return []

  const placeholders = sourceIds.map(() => '?').join(',')
  const [rows] = await pool.query<SourceWorkerInfo[]>(
    `SELECT sw.source_id, sw.user_id, u.name AS user_name
     FROM source_workers sw
     JOIN users u ON u.id = sw.user_id
     WHERE sw.source_id IN (${placeholders})`,
    sourceIds
  )
  return rows
}

export async function findCreatorsBySourceIds(sourceIds: number[]) {
  if (sourceIds.length === 0) return []

  const placeholders = sourceIds.map(() => '?').join(',')
  const [rows] = await pool.query<SourceCreatorInfo[]>(
    `SELECT DISTINCT m.source_id, u.id AS user_id, u.name AS user_name
     FROM manuscripts m
     JOIN users u ON u.id = m.user_id
     WHERE m.source_id IN (${placeholders})`,
    sourceIds
  )
  return rows
}

export async function findWorkersBySourceId(sourceId: number) {
  const [rows] = await pool.query<SourceWorkerInfo[]>(
    `SELECT sw.source_id, sw.user_id, u.name AS user_name
     FROM source_workers sw
     JOIN users u ON u.id = sw.user_id
     WHERE sw.source_id = ?`,
    [sourceId]
  )
  return rows
}

export async function findCreatorsBySourceId(sourceId: number) {
  const [rows] = await pool.query<SourceCreatorInfo[]>(
    `SELECT DISTINCT m.source_id, u.id AS user_id, u.name AS user_name
     FROM manuscripts m
     JOIN users u ON u.id = m.user_id
     WHERE m.source_id = ?`,
    [sourceId]
  )
  return rows
}

export async function deleteExpired() {
  const [result] = await pool.query<ResultSetHeader>(
    `DELETE s FROM sources s
     LEFT JOIN manuscripts m ON m.source_id = s.id
     WHERE s.expires_at <= NOW() AND m.id IS NULL`
  )
  return result.affectedRows
}

export async function snapshotAndExpire() {
  await pool.query(
    `UPDATE manuscripts m
     JOIN sources s ON m.source_id = s.id
     SET m.source_title_snapshot = s.title,
         m.source_url_snapshot = s.original_url,
         m.source_id = NULL
     WHERE s.expires_at <= NOW() AND m.source_id IS NOT NULL`
  )
}

export async function addWorker(sourceId: number, userId: number) {
  await pool.query(
    `INSERT IGNORE INTO source_workers (source_id, user_id) VALUES (?, ?)`,
    [sourceId, userId]
  )
}

export async function removeWorker(sourceId: number, userId: number) {
  await pool.query(
    `DELETE FROM source_workers WHERE source_id = ? AND user_id = ?`,
    [sourceId, userId]
  )
}

export async function getCategories() {
  const [rows] = await pool.query<(RowDataPacket & { category: string })[]>(
    'SELECT DISTINCT category FROM sources WHERE category IS NOT NULL ORDER BY category'
  )
  return rows.map(r => r.category)
}
