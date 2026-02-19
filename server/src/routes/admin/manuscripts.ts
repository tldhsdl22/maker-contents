import { Router } from 'express'
import * as manuscriptQuery from '../../db/queries/manuscripts.js'

const router = Router()

// GET /api/admin/manuscripts — 전체 원고 목록 (관리자)
router.get('/', async (req, res) => {
  try {
    const status = req.query.status as string | undefined
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))

    const result = await manuscriptQuery.findAllFiltered({ status, page, limit })

    res.json({
      manuscripts: result.manuscripts.map(m => ({
        id: m.id,
        title: m.title,
        status: m.status,
        keyword: m.keyword,
        length_option: m.length_option,
        source_title_snapshot: m.source_title_snapshot,
        prompt_snapshot: m.prompt_snapshot,
        user_name: m.user_name,
        created_at: m.created_at,
        updated_at: m.updated_at,
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
    })
  } catch (err) {
    console.error('[admin/manuscripts/list]', err)
    res.status(500).json({ error: '원고 목록을 불러오지 못했습니다.' })
  }
})

export default router
