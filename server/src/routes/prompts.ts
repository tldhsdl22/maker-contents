import { Router } from 'express'
import * as promptQuery from '../db/queries/prompts.js'

const router = Router()

// GET /api/prompts — 프롬프트 목록 (일반 사용자: 활성만, 관리자: 전체)
router.get('/', async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin'
    const prompts = await promptQuery.findAll({ activeOnly: !isAdmin })

    res.json({ prompts })
  } catch (err) {
    console.error('[prompts/list]', err)
    res.status(500).json({ error: '프롬프트 목록을 불러오지 못했습니다.' })
  }
})

// GET /api/prompts/:id — 프롬프트 상세
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) {
      res.status(400).json({ error: '유효하지 않은 ID입니다.' })
      return
    }

    const prompt = await promptQuery.findById(id)
    if (!prompt) {
      res.status(404).json({ error: '프롬프트를 찾을 수 없습니다.' })
      return
    }

    const isAdmin = req.user?.role === 'admin'
    if (!isAdmin && !prompt.is_active) {
      res.status(404).json({ error: '프롬프트를 찾을 수 없습니다.' })
      return
    }

    res.json({ prompt })
  } catch (err) {
    console.error('[prompts/detail]', err)
    res.status(500).json({ error: '프롬프트 정보를 불러오지 못했습니다.' })
  }
})

export default router
