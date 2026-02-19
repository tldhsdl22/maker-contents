import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import pool from '../connection.js'

export interface JobRow extends RowDataPacket {
  id: number
  type: string
  payload: Record<string, unknown>
  status: 'pending' | 'processing' | 'completed' | 'failed'
  attempts: number
  max_attempts: number
  error_message: string | null
  created_at: Date
  started_at: Date | null
  completed_at: Date | null
}

export async function create(data: {
  type: string
  payload: Record<string, unknown>
  max_attempts?: number
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO job_queue (type, payload, max_attempts)
     VALUES (?, ?, ?)`,
    [data.type, JSON.stringify(data.payload), data.max_attempts ?? 3]
  )
  return result.insertId
}

export async function claimNextPending(type: string): Promise<JobRow | null> {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const [rows] = await conn.query<JobRow[]>(
      `SELECT * FROM job_queue
       WHERE type = ? AND status = 'pending' AND attempts < max_attempts
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`,
      [type]
    )

    if (rows.length === 0) {
      await conn.rollback()
      return null
    }

    const job = rows[0]
    await conn.query(
      `UPDATE job_queue
       SET status = 'processing', attempts = attempts + 1, started_at = NOW()
       WHERE id = ?`,
      [job.id]
    )

    await conn.commit()

    job.status = 'processing'
    job.attempts += 1
    return job
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

export async function markCompleted(id: number) {
  await pool.query(
    `UPDATE job_queue SET status = 'completed', completed_at = NOW() WHERE id = ?`,
    [id]
  )
}

export async function markFailed(id: number, errorMessage: string) {
  await pool.query(
    `UPDATE job_queue SET status = 'failed', error_message = ?, completed_at = NOW() WHERE id = ?`,
    [errorMessage, id]
  )
}

export async function requeueFailed(id: number) {
  await pool.query(
    `UPDATE job_queue SET status = 'pending', error_message = NULL, started_at = NULL, completed_at = NULL WHERE id = ?`,
    [id]
  )
}

export async function findById(id: number) {
  const [rows] = await pool.query<JobRow[]>(
    'SELECT * FROM job_queue WHERE id = ?',
    [id]
  )
  return rows[0] ?? null
}
