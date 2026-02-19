import { Router } from 'express'
import * as dashboardQuery from '../../db/queries/dashboard.js'

const router = Router()

// GET /api/admin/dashboard/summary — 전체 작업량 요약 (관리자)
router.get('/summary', async (_req, res) => {
  try {
    const result = await dashboardQuery.getAdminSummary()
    res.json(result)
  } catch (err) {
    console.error('[admin/dashboard/summary]', err)
    res.status(500).json({ error: '대시보드 요약 정보를 불러오지 못했습니다.' })
  }
})

export default router
