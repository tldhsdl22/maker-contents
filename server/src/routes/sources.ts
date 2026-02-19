import { Router } from 'express'
import * as sourceQuery from '../db/queries/sources.js'

const router = Router()

// GET /api/sources — 소스 기사 목록 (페이지네이션, 필터, 검색)
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
    const category = (req.query.category as string) || undefined
    const search = (req.query.search as string) || undefined

    const { rows, total } = await sourceQuery.findAll({ page, limit, category, search })

    const sourceIds = rows.map(r => r.id)
    const workers = await sourceQuery.findWorkersBySourceIds(sourceIds)
    const creators = await sourceQuery.findCreatorsBySourceIds(sourceIds)

    const workerMap = new Map<number, { user_id: number; user_name: string }[]>()
    for (const w of workers) {
      const list = workerMap.get(w.source_id) || []
      list.push({ user_id: w.user_id, user_name: w.user_name })
      workerMap.set(w.source_id, list)
    }

    const creatorMap = new Map<number, { user_id: number; user_name: string }[]>()
    for (const c of creators) {
      const list = creatorMap.get(c.source_id) || []
      list.push({ user_id: c.user_id, user_name: c.user_name })
      creatorMap.set(c.source_id, list)
    }

    const sources = rows.map(row => ({
      id: row.id,
      title: row.title,
      thumbnail_url: row.thumbnail_url,
      thumbnail_local_path: row.thumbnail_local_path,
      original_url: row.original_url,
      category: row.category,
      source_site: row.source_site,
      crawled_at: row.crawled_at,
      expires_at: row.expires_at,
      workers: workerMap.get(row.id) || [],
      creators: creatorMap.get(row.id) || [],
    }))

    const categories = await sourceQuery.getCategories()

    res.json({
      sources,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      categories,
    })
  } catch (err) {
    console.error('[sources/list]', err)
    res.status(500).json({ error: '소스 기사 목록을 불러오지 못했습니다.' })
  }
})

// GET /api/sources/:id — 소스 기사 상세 (원문 HTML 포함)
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) {
      res.status(400).json({ error: '유효하지 않은 ID입니다.' })
      return
    }

    const source = await sourceQuery.findById(id)
    if (!source) {
      res.status(404).json({ error: '소스 기사를 찾을 수 없습니다.' })
      return
    }

    const images = await sourceQuery.findImagesBySourceId(id)
    const workers = await sourceQuery.findWorkersBySourceId(id)
    const creators = await sourceQuery.findCreatorsBySourceId(id)

    res.json({
      source: {
        ...source,
        images: images.map(img => ({
          id: img.id,
          original_url: img.original_url,
          local_path: img.local_path,
        })),
        workers: workers.map(w => ({
          user_id: w.user_id,
          user_name: w.user_name,
        })),
        creators: creators.map(c => ({
          user_id: c.user_id,
          user_name: c.user_name,
        })),
      },
    })
  } catch (err) {
    console.error('[sources/detail]', err)
    res.status(500).json({ error: '소스 기사 상세 정보를 불러오지 못했습니다.' })
  }
})

export default router
