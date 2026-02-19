import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import pool from '../connection.js'

export interface ImageTemplateRow extends RowDataPacket {
  id: number
  name: string
  description: string | null
  original_image_prompt: string
  new_image_prompt: string | null
  remove_watermark: number
  is_active: number
  created_by: number
  created_at: Date
  updated_at: Date
  creator_name?: string
}

export async function findAll(opts: { activeOnly?: boolean } = {}) {
  const where = opts.activeOnly ? 'WHERE t.is_active = 1' : ''

  const [rows] = await pool.query<ImageTemplateRow[]>(
    `SELECT t.*, u.name AS creator_name
     FROM image_templates t
     JOIN users u ON u.id = t.created_by
     ${where}
     ORDER BY t.updated_at DESC`
  )
  return rows
}

export async function findById(id: number) {
  const [rows] = await pool.query<ImageTemplateRow[]>(
    `SELECT t.*, u.name AS creator_name
     FROM image_templates t
     JOIN users u ON u.id = t.created_by
     WHERE t.id = ?`,
    [id]
  )
  return rows[0] ?? null
}

export async function create(data: {
  name: string
  description?: string | null
  original_image_prompt: string
  new_image_prompt?: string | null
  remove_watermark: boolean
  created_by: number
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO image_templates
       (name, description, original_image_prompt, new_image_prompt, remove_watermark, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.description ?? null,
      data.original_image_prompt,
      data.new_image_prompt ?? null,
      data.remove_watermark ? 1 : 0,
      data.created_by,
    ]
  )
  return result.insertId
}

export async function update(id: number, data: {
  name: string
  description?: string | null
  original_image_prompt: string
  new_image_prompt?: string | null
  remove_watermark: boolean
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE image_templates
     SET name = ?, description = ?, original_image_prompt = ?,
         new_image_prompt = ?, remove_watermark = ?
     WHERE id = ?`,
    [
      data.name,
      data.description ?? null,
      data.original_image_prompt,
      data.new_image_prompt ?? null,
      data.remove_watermark ? 1 : 0,
      id,
    ]
  )
  return result.affectedRows > 0
}

export async function toggleActive(id: number) {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE image_templates SET is_active = NOT is_active WHERE id = ?`,
    [id]
  )
  return result.affectedRows > 0
}

export async function remove(id: number) {
  await pool.query(
    `UPDATE manuscripts SET image_template_snapshot = (
       SELECT JSON_OBJECT(
         'name', name,
         'original_image_prompt', original_image_prompt,
         'new_image_prompt', new_image_prompt,
         'remove_watermark', remove_watermark
       ) FROM image_templates WHERE id = ?
     )
     WHERE image_template_id = ? AND image_template_snapshot IS NULL`,
    [id, id]
  )

  await pool.query(
    `UPDATE manuscripts SET image_template_id = NULL WHERE image_template_id = ?`,
    [id]
  )

  const [result] = await pool.query<ResultSetHeader>(
    `DELETE FROM image_templates WHERE id = ?`,
    [id]
  )
  return result.affectedRows > 0
}
