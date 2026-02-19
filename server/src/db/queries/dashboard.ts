import type { RowDataPacket } from 'mysql2'
import pool from '../connection.js'

export interface DashboardSummaryRow extends RowDataPacket {
  today_created: number
  today_posted: number
  week_created: number
  week_posted: number
  unposted_count: number
}

export async function getUserSummary(userId: number) {
  const [[row]] = await pool.query<DashboardSummaryRow[]>(
    `SELECT
       SUM(CASE WHEN m.created_at >= CURDATE() THEN 1 ELSE 0 END) AS today_created,
       SUM(CASE WHEN p.posted_at >= CURDATE() THEN 1 ELSE 0 END) AS today_posted,
       SUM(CASE WHEN m.created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) THEN 1 ELSE 0 END) AS week_created,
       SUM(CASE WHEN p.posted_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) THEN 1 ELSE 0 END) AS week_posted,
       SUM(CASE WHEN m.status = 'generated' THEN 1 ELSE 0 END) AS unposted_count
     FROM manuscripts m
     LEFT JOIN postings p ON p.manuscript_id = m.id
     WHERE m.user_id = ?`,
    [userId]
  )

  return row
}

export interface DashboardUserRankRow extends RowDataPacket {
  user_id: number
  user_name: string
  week_created: number
  week_posted: number
}

export async function getAdminSummary() {
  const [[summary]] = await pool.query<DashboardSummaryRow[]>(
    `SELECT
       SUM(CASE WHEN m.created_at >= CURDATE() THEN 1 ELSE 0 END) AS today_created,
       SUM(CASE WHEN p.posted_at >= CURDATE() THEN 1 ELSE 0 END) AS today_posted,
       SUM(CASE WHEN m.created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) THEN 1 ELSE 0 END) AS week_created,
       SUM(CASE WHEN p.posted_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) THEN 1 ELSE 0 END) AS week_posted,
       SUM(CASE WHEN m.status = 'generated' THEN 1 ELSE 0 END) AS unposted_count
     FROM manuscripts m
     LEFT JOIN postings p ON p.manuscript_id = m.id`
  )

  const [rankRows] = await pool.query<DashboardUserRankRow[]>(
    `SELECT
       u.id AS user_id,
       u.name AS user_name,
       SUM(CASE WHEN m.created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) THEN 1 ELSE 0 END) AS week_created,
       SUM(CASE WHEN p.posted_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) THEN 1 ELSE 0 END) AS week_posted
     FROM users u
     LEFT JOIN manuscripts m ON m.user_id = u.id
     LEFT JOIN postings p ON p.manuscript_id = m.id
     GROUP BY u.id
     ORDER BY week_posted DESC, week_created DESC
     LIMIT 5`
  )

  return { summary, ranks: rankRows }
}
