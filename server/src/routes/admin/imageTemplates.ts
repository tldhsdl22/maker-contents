import { Router } from 'express'
import * as imageTemplateQuery from '../../db/queries/imageTemplates.js'

const router = Router()

// POST /api/admin/image-templates — 생성
router.post('/', async (req, res) => {
  try {
    const { name, description, original_image_prompt, new_image_prompt, remove_watermark } = req.body

    if (!name?.trim()) {
      res.status(400).json({ error: '템플릿명을 입력해주세요.' })
      return
    }
    if (!original_image_prompt?.trim()) {
      res.status(400).json({ error: '원본 이미지 처리 프롬프트를 입력해주세요.' })
      return
    }

    const id = await imageTemplateQuery.create({
      name: name.trim(),
      description: description?.trim() || null,
      original_image_prompt: original_image_prompt.trim(),
      new_image_prompt: new_image_prompt?.trim() || null,
      remove_watermark: Boolean(remove_watermark),
      created_by: req.user!.id,
    })

    const template = await imageTemplateQuery.findById(id)
    res.status(201).json({ template })
  } catch (err) {
    console.error('[admin/image-templates/create]', err)
    res.status(500).json({ error: '이미지 템플릿을 생성하지 못했습니다.' })
  }
})

// PUT /api/admin/image-templates/:id — 수정
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) {
      res.status(400).json({ error: '유효하지 않은 ID입니다.' })
      return
    }

    const existing = await imageTemplateQuery.findById(id)
    if (!existing) {
      res.status(404).json({ error: '이미지 템플릿을 찾을 수 없습니다.' })
      return
    }

    const { name, description, original_image_prompt, new_image_prompt, remove_watermark } = req.body

    if (!name?.trim()) {
      res.status(400).json({ error: '템플릿명을 입력해주세요.' })
      return
    }
    if (!original_image_prompt?.trim()) {
      res.status(400).json({ error: '원본 이미지 처리 프롬프트를 입력해주세요.' })
      return
    }

    await imageTemplateQuery.update(id, {
      name: name.trim(),
      description: description?.trim() || null,
      original_image_prompt: original_image_prompt.trim(),
      new_image_prompt: new_image_prompt?.trim() || null,
      remove_watermark: Boolean(remove_watermark),
    })

    const template = await imageTemplateQuery.findById(id)
    res.json({ template })
  } catch (err) {
    console.error('[admin/image-templates/update]', err)
    res.status(500).json({ error: '이미지 템플릿을 수정하지 못했습니다.' })
  }
})

// PATCH /api/admin/image-templates/:id/toggle — 활성화/비활성화
router.patch('/:id/toggle', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) {
      res.status(400).json({ error: '유효하지 않은 ID입니다.' })
      return
    }

    const existing = await imageTemplateQuery.findById(id)
    if (!existing) {
      res.status(404).json({ error: '이미지 템플릿을 찾을 수 없습니다.' })
      return
    }

    await imageTemplateQuery.toggleActive(id)
    const template = await imageTemplateQuery.findById(id)
    res.json({ template })
  } catch (err) {
    console.error('[admin/image-templates/toggle]', err)
    res.status(500).json({ error: '이미지 템플릿 상태를 변경하지 못했습니다.' })
  }
})

// DELETE /api/admin/image-templates/:id — 삭제
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) {
      res.status(400).json({ error: '유효하지 않은 ID입니다.' })
      return
    }

    const existing = await imageTemplateQuery.findById(id)
    if (!existing) {
      res.status(404).json({ error: '이미지 템플릿을 찾을 수 없습니다.' })
      return
    }

    await imageTemplateQuery.remove(id)
    res.json({ message: '이미지 템플릿이 삭제되었습니다.' })
  } catch (err) {
    console.error('[admin/image-templates/delete]', err)
    res.status(500).json({ error: '이미지 템플릿을 삭제하지 못했습니다.' })
  }
})

export default router
