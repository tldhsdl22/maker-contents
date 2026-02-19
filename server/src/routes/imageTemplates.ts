import { Router } from 'express'
import * as imageTemplateQuery from '../db/queries/imageTemplates.js'

const router = Router()

// GET /api/image-templates — 목록 (일반 사용자: 활성만, 관리자: 전체)
router.get('/', async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin'
    const templates = await imageTemplateQuery.findAll({ activeOnly: !isAdmin })

    res.json({ templates })
  } catch (err) {
    console.error('[image-templates/list]', err)
    res.status(500).json({ error: '이미지 템플릿 목록을 불러오지 못했습니다.' })
  }
})

// GET /api/image-templates/:id — 상세
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) {
      res.status(400).json({ error: '유효하지 않은 ID입니다.' })
      return
    }

    const template = await imageTemplateQuery.findById(id)
    if (!template) {
      res.status(404).json({ error: '이미지 템플릿을 찾을 수 없습니다.' })
      return
    }

    const isAdmin = req.user?.role === 'admin'
    if (!isAdmin && !template.is_active) {
      res.status(404).json({ error: '이미지 템플릿을 찾을 수 없습니다.' })
      return
    }

    res.json({ template })
  } catch (err) {
    console.error('[image-templates/detail]', err)
    res.status(500).json({ error: '이미지 템플릿 정보를 불러오지 못했습니다.' })
  }
})

export default router
