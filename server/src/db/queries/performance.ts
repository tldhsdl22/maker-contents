import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import pool from '../connection.js'

export interface TrackingRow extends RowDataPacket {
  id: number
  posting_id: number
  tracking_start: Date
  tracking_end: Date
  status: 'tracking' | 'completed'
}

export interface PerformanceDataRow extends RowDataPacket {
  id: number
  tracking_id: number
  keyword_rank: number | null
  view_count: number | null
  comment_count: number | null
  is_accessible: number
  collected_at: Date
}

export async function createTracking(postingId: number) {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO performance_tracking (posting_id, tracking_start, tracking_end, status)
     VALUES (?, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), 'tracking')`,
    [postingId]
  )
  return result.insertId
}

export async function findTrackingByPostingId(postingId: number) {
  const [rows] = await pool.query<TrackingRow[]>(
    `SELECT * FROM performance_tracking WHERE posting_id = ?`,
    [postingId]
  )
  return rows[0] ?? null
}

export async function findTrackingById(id: number) {
  const [rows] = await pool.query<TrackingRow[]>(
    `SELECT * FROM performance_tracking WHERE id = ?`,
    [id]
  )
  return rows[0] ?? null
}

export async function getActiveTrackings() {
  const [rows] = await pool.query<(TrackingRow & { url: string; keyword: string | null; platform: 'blog' | 'cafe' })[]>(
    `SELECT pt.*, p.url, p.keyword, p.platform
     FROM performance_tracking pt
     JOIN postings p ON p.id = pt.posting_id
     WHERE pt.status = 'tracking'`
  )
  return rows
}

export async function completeExpiredTrackings() {
  await pool.query(
    `UPDATE performance_tracking SET status = 'completed'
     WHERE status = 'tracking' AND tracking_end <= NOW()`
  )
}

export async function insertData(data: {
  tracking_id: number
  keyword_rank: number | null
  view_count: number | null
  comment_count: number | null
  is_accessible: boolean
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO performance_data (tracking_id, keyword_rank, view_count, comment_count, is_accessible)
     VALUES (?, ?, ?, ?, ?)`,
    [
      data.tracking_id,
      data.keyword_rank,
      data.view_count,
      data.comment_count,
      data.is_accessible ? 1 : 0,
    ]
  )
  return result.insertId
}

export async function findDataByTrackingId(trackingId: number) {
  const [rows] = await pool.query<PerformanceDataRow[]>(
    `SELECT * FROM performance_data
     WHERE tracking_id = ?
     ORDER BY collected_at ASC`,
    [trackingId]
  )
  return rows
}

export async function getLatestData(trackingId: number) {
  const [rows] = await pool.query<PerformanceDataRow[]>(
    `SELECT * FROM performance_data
     WHERE tracking_id = ?
     ORDER BY collected_at DESC
     LIMIT 1`,
    [trackingId]
  )
  return rows[0] ?? null
}

export interface PerformanceSummaryRow extends RowDataPacket {
  posting_id: number
  manuscript_id: number
  manuscript_title: string
  url: string
  platform: 'blog' | 'cafe'
  keyword: string | null
  posted_at: Date
  tracking_status: 'tracking' | 'completed'
  tracking_start: Date
  tracking_end: Date
  latest_rank: number | null
  latest_views: number | null
  latest_comments: number | null
}

export async function getSummaryByManuscriptId(manuscriptId: number) {
  const [rows] = await pool.query<PerformanceSummaryRow[]>(
    `SELECT
       p.id AS posting_id,
       p.manuscript_id,
       m.title AS manuscript_title,
       p.url,
       p.platform,
       p.keyword,
       p.posted_at,
       pt.status AS tracking_status,
       pt.tracking_start,
       pt.tracking_end,
       pd.keyword_rank AS latest_rank,
       pd.view_count AS latest_views,
       pd.comment_count AS latest_comments
     FROM postings p
     JOIN manuscripts m ON m.id = p.manuscript_id
     LEFT JOIN performance_tracking pt ON pt.posting_id = p.id
     LEFT JOIN performance_data pd ON pd.tracking_id = pt.id
       AND pd.collected_at = (
         SELECT MAX(pd2.collected_at)
         FROM performance_data pd2
         WHERE pd2.tracking_id = pt.id
       )
     WHERE p.manuscript_id = ?`,
    [manuscriptId]
  )
  return rows[0] ?? null
}

export async function getRecentPerformanceByUser(userId: number, limit = 20) {
  const [rows] = await pool.query<PerformanceSummaryRow[]>(
    `SELECT
       p.id AS posting_id,
       p.manuscript_id,
       m.title AS manuscript_title,
       p.url,
       p.platform,
       p.keyword,
       p.posted_at,
       pt.status AS tracking_status,
       pt.tracking_start,
       pt.tracking_end,
       pd.keyword_rank AS latest_rank,
       pd.view_count AS latest_views,
       pd.comment_count AS latest_comments
     FROM postings p
     JOIN manuscripts m ON m.id = p.manuscript_id
     LEFT JOIN performance_tracking pt ON pt.posting_id = p.id
     LEFT JOIN performance_data pd ON pd.tracking_id = pt.id
       AND pd.collected_at = (
         SELECT MAX(pd2.collected_at)
         FROM performance_data pd2
         WHERE pd2.tracking_id = pt.id
       )
     WHERE m.user_id = ?
     ORDER BY p.posted_at DESC
     LIMIT ?`,
    [userId, limit]
  )
  return rows
}

export async function getRecentPerformanceAll(limit = 20) {
  const [rows] = await pool.query<(PerformanceSummaryRow & { user_name: string })[]>(
    `SELECT
       p.id AS posting_id,
       p.manuscript_id,
       m.title AS manuscript_title,
       p.url,
       p.platform,
       p.keyword,
       p.posted_at,
       pt.status AS tracking_status,
       pt.tracking_start,
       pt.tracking_end,
       pd.keyword_rank AS latest_rank,
       pd.view_count AS latest_views,
       pd.comment_count AS latest_comments,
       u.name AS user_name
     FROM postings p
     JOIN manuscripts m ON m.id = p.manuscript_id
     JOIN users u ON u.id = m.user_id
     LEFT JOIN performance_tracking pt ON pt.posting_id = p.id
     LEFT JOIN performance_data pd ON pd.tracking_id = pt.id
       AND pd.collected_at = (
         SELECT MAX(pd2.collected_at)
         FROM performance_data pd2
         WHERE pd2.tracking_id = pt.id
       )
     ORDER BY p.posted_at DESC
     LIMIT ?`,
    [limit]
  )
  return rows
}
