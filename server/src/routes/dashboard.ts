import { Router } from 'express'
import * as dashboardQuery from '../db/queries/dashboard.js'
import * as performanceQuery from '../db/queries/performance.js'

const router = Router()

// GET /api/dashboard/summary — 작업량 요약 (내 데이터)
router.get('/summary', async (req, res) => {
  try {
    const userId = req.user!.id
    const summary = await dashboardQuery.getUserSummary(userId)
    res.json({ summary })
  } catch (err) {
    console.error('[dashboard/summary]', err)
    res.status(500).json({ error: '대시보드 요약 정보를 불러오지 못했습니다.' })
  }
})

// GET /api/dashboard/recent-posts — 최근 포스팅 성과 목록
router.get('/recent-posts', async (req, res) => {
  try {
    const userId = req.user!.id
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 10))
    const rows = await performanceQuery.getRecentPerformanceByUser(userId, limit)
    res.json({
      posts: rows.map(row => ({
        posting_id: row.posting_id,
        manuscript_id: row.manuscript_id,
        manuscript_title: row.manuscript_title,
        url: row.url,
        platform: row.platform,
        keyword: row.keyword,
        posted_at: row.posted_at,
        tracking_status: row.tracking_status,
        latest_rank: row.latest_rank,
        latest_views: row.latest_views,
        latest_comments: row.latest_comments,
      })),
    })
  } catch (err) {
    console.error('[dashboard/recent-posts]', err)
    res.status(500).json({ error: '최근 포스팅 성과를 불러오지 못했습니다.' })
  }
})

export default router
