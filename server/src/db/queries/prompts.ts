import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import pool from '../connection.js'

export interface PromptRow extends RowDataPacket {
  id: number
  name: string
  content: string
  description: string | null
  model_provider: 'openai' | 'anthropic' | 'gemini'
  model_name: string
  is_active: number
  created_by: number
  created_at: Date
  updated_at: Date
  creator_name?: string
}

interface CountRow extends RowDataPacket {
  total: number
}

export async function findAll(opts: { activeOnly?: boolean } = {}) {
  const where = opts.activeOnly ? 'WHERE p.is_active = 1' : ''

  const [rows] = await pool.query<PromptRow[]>(
    `SELECT p.*, u.name AS creator_name
     FROM prompts p
     JOIN users u ON u.id = p.created_by
     ${where}
     ORDER BY p.updated_at DESC`
  )
  return rows
}

export async function findById(id: number) {
  const [rows] = await pool.query<PromptRow[]>(
    `SELECT p.*, u.name AS creator_name
     FROM prompts p
     JOIN users u ON u.id = p.created_by
     WHERE p.id = ?`,
    [id]
  )
  return rows[0] ?? null
}

export async function create(data: {
  name: string
  content: string
  description?: string | null
  model_provider: 'openai' | 'anthropic' | 'gemini'
  model_name: string
  created_by: number
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO prompts (name, content, description, model_provider, model_name, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.content,
      data.description ?? null,
      data.model_provider,
      data.model_name,
      data.created_by,
    ]
  )
  return result.insertId
}

export async function update(id: number, data: {
  name: string
  content: string
  description?: string | null
  model_provider: 'openai' | 'anthropic' | 'gemini'
  model_name: string
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE prompts SET name = ?, content = ?, description = ?, model_provider = ?, model_name = ? WHERE id = ?`,
    [data.name, data.content, data.description ?? null, data.model_provider, data.model_name, id]
  )
  return result.affectedRows > 0
}

export async function toggleActive(id: number) {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE prompts SET is_active = NOT is_active WHERE id = ?`,
    [id]
  )
  return result.affectedRows > 0
}

export async function remove(id: number) {
  await pool.query(
    `UPDATE manuscripts SET prompt_snapshot = (
       SELECT content FROM prompts WHERE id = ?
     )
     WHERE prompt_id = ? AND prompt_snapshot IS NULL`,
    [id, id]
  )

  await pool.query(
    `UPDATE manuscripts SET prompt_id = NULL WHERE prompt_id = ?`,
    [id]
  )

  const [result] = await pool.query<ResultSetHeader>(
    `DELETE FROM prompts WHERE id = ?`,
    [id]
  )
  return result.affectedRows > 0
}

export async function count() {
  const [rows] = await pool.query<CountRow[]>(
    'SELECT COUNT(*) AS total FROM prompts'
  )
  return rows[0].total
}
