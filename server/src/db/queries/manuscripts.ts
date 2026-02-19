import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import pool from '../connection.js'

export interface ManuscriptRow extends RowDataPacket {
  id: number
  user_id: number
  source_id: number | null
  prompt_id: number | null
  image_template_id: number | null
  title: string
  content_html: string | null
  keyword: string | null
  length_option: 'short' | 'medium' | 'long'
  new_image_count: number
  status: 'generating' | 'generated' | 'posted' | 'failed'
  prompt_snapshot: string | null
  image_template_snapshot: string | null
  source_title_snapshot: string | null
  source_url_snapshot: string | null
  created_at: Date
  updated_at: Date
  user_name?: string
  posting_url?: string | null
  posting_platform?: 'blog' | 'cafe' | null
  posting_keyword?: string | null
  posted_at?: Date | null
  tracking_status?: 'tracking' | 'completed' | null
  tracking_start?: Date | null
  tracking_end?: Date | null
  latest_rank?: number | null
  latest_views?: number | null
  latest_comments?: number | null
}

export interface ManuscriptImageRow extends RowDataPacket {
  id: number
  manuscript_id: number
  image_type: 'original_processed' | 'generated'
  original_source_image_id: number | null
  file_path: string
  file_url: string
  sort_order: number
  created_at: Date
}

export async function create(data: {
  user_id: number
  source_id: number
  prompt_id: number
  image_template_id: number
  title: string
  keyword?: string | null
  length_option: 'short' | 'medium' | 'long'
  new_image_count: number
  prompt_snapshot: string
  image_template_snapshot: string
  source_title_snapshot: string
  source_url_snapshot: string
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO manuscripts
       (user_id, source_id, prompt_id, image_template_id, title, keyword,
        length_option, new_image_count, status,
        prompt_snapshot, image_template_snapshot,
        source_title_snapshot, source_url_snapshot)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'generating', ?, ?, ?, ?)`,
    [
      data.user_id,
      data.source_id,
      data.prompt_id,
      data.image_template_id,
      data.title,
      data.keyword ?? null,
      data.length_option,
      data.new_image_count,
      data.prompt_snapshot,
      data.image_template_snapshot,
      data.source_title_snapshot,
      data.source_url_snapshot,
    ]
  )
  return result.insertId
}

export async function findById(id: number) {
  const [rows] = await pool.query<ManuscriptRow[]>(
    `SELECT m.*, u.name AS user_name
     FROM manuscripts m
     JOIN users u ON u.id = m.user_id
     WHERE m.id = ?`,
    [id]
  )
  return rows[0] ?? null
}

export async function findByUser(userId: number) {
  const [rows] = await pool.query<ManuscriptRow[]>(
    `SELECT m.*, u.name AS user_name
     FROM manuscripts m
     JOIN users u ON u.id = m.user_id
     WHERE m.user_id = ?
     ORDER BY m.created_at DESC`,
    [userId]
  )
  return rows
}

export async function updateContent(id: number, contentHtml: string, title: string) {
  await pool.query(
    `UPDATE manuscripts SET title = ?, content_html = ?, status = 'generated' WHERE id = ?`,
    [title, contentHtml, id]
  )
}

export async function updateStatus(id: number, status: 'generating' | 'generated' | 'posted' | 'failed') {
  await pool.query(
    `UPDATE manuscripts SET status = ? WHERE id = ?`,
    [status, id]
  )
}

export async function createImage(data: {
  manuscript_id: number
  image_type: 'original_processed' | 'generated'
  original_source_image_id?: number | null
  file_path: string
  file_url: string
  sort_order: number
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO manuscript_images
       (manuscript_id, image_type, original_source_image_id, file_path, file_url, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.manuscript_id,
      data.image_type,
      data.original_source_image_id ?? null,
      data.file_path,
      data.file_url,
      data.sort_order,
    ]
  )
  return result.insertId
}

export async function findImagesByManuscriptId(manuscriptId: number) {
  const [rows] = await pool.query<ManuscriptImageRow[]>(
    `SELECT * FROM manuscript_images WHERE manuscript_id = ? ORDER BY sort_order`,
    [manuscriptId]
  )
  return rows
}

export async function update(id: number, data: { title: string; content_html: string }) {
  await pool.query(
    `UPDATE manuscripts SET title = ?, content_html = ? WHERE id = ?`,
    [data.title, data.content_html, id]
  )
}

export async function deleteById(id: number) {
  const images = await findImagesByManuscriptId(id)
  await pool.query(`DELETE FROM manuscripts WHERE id = ?`, [id])
  return images
}

export async function findByUserFiltered(
  userId: number,
  filters: { status?: string; page?: number; limit?: number }
) {
  const { status, page = 1, limit = 20 } = filters
  const offset = (page - 1) * limit
  const conditions: string[] = ['m.user_id = ?']
  const params: unknown[] = [userId]

  if (status && ['generated', 'posted', 'failed'].includes(status)) {
    conditions.push('m.status = ?')
    params.push(status)
  }

  const where = conditions.join(' AND ')

  const [[countRow]] = await pool.query<(RowDataPacket & { cnt: number })[]>(
    `SELECT COUNT(*) AS cnt FROM manuscripts m WHERE ${where}`,
    params
  )

  const [rows] = await pool.query<ManuscriptRow[]>(
    `SELECT m.*, u.name AS user_name,
       p.url AS posting_url,
       p.platform AS posting_platform,
       p.keyword AS posting_keyword,
       p.posted_at AS posted_at,
       pt.status AS tracking_status,
       pt.tracking_start,
       pt.tracking_end,
       pd.keyword_rank AS latest_rank,
       pd.view_count AS latest_views,
       pd.comment_count AS latest_comments
     FROM manuscripts m
     JOIN users u ON u.id = m.user_id
     LEFT JOIN postings p ON p.manuscript_id = m.id
     LEFT JOIN performance_tracking pt ON pt.posting_id = p.id
     LEFT JOIN performance_data pd ON pd.tracking_id = pt.id
       AND pd.collected_at = (
         SELECT MAX(pd2.collected_at)
         FROM performance_data pd2
         WHERE pd2.tracking_id = pt.id
       )
     WHERE ${where}
     ORDER BY m.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )

  return { manuscripts: rows, total: countRow.cnt, page, limit }
}

export async function findAllFiltered(
  filters: { status?: string; page?: number; limit?: number }
) {
  const { status, page = 1, limit = 20 } = filters
  const offset = (page - 1) * limit
  const conditions: string[] = []
  const params: unknown[] = []

  if (status && ['generating', 'generated', 'posted', 'failed'].includes(status)) {
    conditions.push('m.status = ?')
    params.push(status)
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''

  const [[countRow]] = await pool.query<(RowDataPacket & { cnt: number })[]>(
    `SELECT COUNT(*) AS cnt FROM manuscripts m ${where}`,
    params
  )

  const [rows] = await pool.query<ManuscriptRow[]>(
    `SELECT m.*, u.name AS user_name,
       p.url AS posting_url,
       p.platform AS posting_platform,
       p.keyword AS posting_keyword,
       p.posted_at AS posted_at,
       pt.status AS tracking_status,
       pt.tracking_start,
       pt.tracking_end,
       pd.keyword_rank AS latest_rank,
       pd.view_count AS latest_views,
       pd.comment_count AS latest_comments
     FROM manuscripts m
     JOIN users u ON u.id = m.user_id
     LEFT JOIN postings p ON p.manuscript_id = m.id
     LEFT JOIN performance_tracking pt ON pt.posting_id = p.id
     LEFT JOIN performance_data pd ON pd.tracking_id = pt.id
       AND pd.collected_at = (
         SELECT MAX(pd2.collected_at)
         FROM performance_data pd2
         WHERE pd2.tracking_id = pt.id
       )
     ${where}
     ORDER BY m.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )

  return { manuscripts: rows, total: countRow.cnt, page, limit }
}
