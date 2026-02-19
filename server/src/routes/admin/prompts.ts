import { Router } from 'express'
import * as promptQuery from '../../db/queries/prompts.js'

const router = Router()

const ALLOWED_PROVIDERS = ['openai', 'anthropic', 'gemini'] as const
const ALLOWED_MODELS: Record<(typeof ALLOWED_PROVIDERS)[number], string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'o1-mini'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
  gemini: ['gemini-1.5-flash', 'gemini-1.5-pro'],
}
type ModelProvider = typeof ALLOWED_PROVIDERS[number]

function normalizeProvider(value: unknown): ModelProvider {
  if (typeof value !== 'string') return 'openai'
  return (ALLOWED_PROVIDERS.includes(value as ModelProvider) ? value : 'openai') as ModelProvider
}

function normalizeModelName(provider: ModelProvider, value: unknown) {
  if (typeof value === 'string' && value.trim()) return value.trim()
  return ALLOWED_MODELS[provider][0]
}

function ensureModelAllowed(provider: ModelProvider, modelName: string) {
  return ALLOWED_MODELS[provider].includes(modelName)
}

// POST /api/admin/prompts — 프롬프트 생성
router.post('/', async (req, res) => {
  try {
    const { name, content, description, model_provider, model_name } = req.body

    if (!name?.trim()) {
      res.status(400).json({ error: '프롬프트명을 입력해주세요.' })
      return
    }
    if (!content?.trim()) {
      res.status(400).json({ error: '프롬프트 내용을 입력해주세요.' })
      return
    }
    if (!content.includes('{원문}')) {
      res.status(400).json({ error: '프롬프트 내용에 {원문} 변수가 반드시 포함되어야 합니다.' })
      return
    }

    const provider = normalizeProvider(model_provider)
    const modelName = normalizeModelName(provider, model_name)

    if (!ensureModelAllowed(provider, modelName)) {
      res.status(400).json({ error: '지원하지 않는 모델입니다.' })
      return
    }

    const id = await promptQuery.create({
      name: name.trim(),
      content: content.trim(),
      description: description?.trim() || null,
      model_provider: provider,
      model_name: modelName,
      created_by: req.user!.id,
    })

    const prompt = await promptQuery.findById(id)
    res.status(201).json({ prompt })
  } catch (err) {
    console.error('[admin/prompts/create]', err)
    res.status(500).json({ error: '프롬프트를 생성하지 못했습니다.' })
  }
})

// PUT /api/admin/prompts/:id — 프롬프트 수정
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) {
      res.status(400).json({ error: '유효하지 않은 ID입니다.' })
      return
    }

    const existing = await promptQuery.findById(id)
    if (!existing) {
      res.status(404).json({ error: '프롬프트를 찾을 수 없습니다.' })
      return
    }

    const { name, content, description, model_provider, model_name } = req.body

    if (!name?.trim()) {
      res.status(400).json({ error: '프롬프트명을 입력해주세요.' })
      return
    }
    if (!content?.trim()) {
      res.status(400).json({ error: '프롬프트 내용을 입력해주세요.' })
      return
    }
    if (!content.includes('{원문}')) {
      res.status(400).json({ error: '프롬프트 내용에 {원문} 변수가 반드시 포함되어야 합니다.' })
      return
    }

    const provider = normalizeProvider(model_provider ?? existing.model_provider)
    const modelName = normalizeModelName(provider, model_name ?? existing.model_name)

    if (!ensureModelAllowed(provider, modelName)) {
      res.status(400).json({ error: '지원하지 않는 모델입니다.' })
      return
    }

    await promptQuery.update(id, {
      name: name.trim(),
      content: content.trim(),
      description: description?.trim() || null,
      model_provider: provider,
      model_name: modelName,
    })

    const prompt = await promptQuery.findById(id)
    res.json({ prompt })
  } catch (err) {
    console.error('[admin/prompts/update]', err)
    res.status(500).json({ error: '프롬프트를 수정하지 못했습니다.' })
  }
})

// PATCH /api/admin/prompts/:id/toggle — 활성화/비활성화
router.patch('/:id/toggle', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) {
      res.status(400).json({ error: '유효하지 않은 ID입니다.' })
      return
    }

    const existing = await promptQuery.findById(id)
    if (!existing) {
      res.status(404).json({ error: '프롬프트를 찾을 수 없습니다.' })
      return
    }

    await promptQuery.toggleActive(id)
    const prompt = await promptQuery.findById(id)
    res.json({ prompt })
  } catch (err) {
    console.error('[admin/prompts/toggle]', err)
    res.status(500).json({ error: '프롬프트 상태를 변경하지 못했습니다.' })
  }
})

// DELETE /api/admin/prompts/:id — 프롬프트 삭제
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) {
      res.status(400).json({ error: '유효하지 않은 ID입니다.' })
      return
    }

    const existing = await promptQuery.findById(id)
    if (!existing) {
      res.status(404).json({ error: '프롬프트를 찾을 수 없습니다.' })
      return
    }

    await promptQuery.remove(id)
    res.json({ message: '프롬프트가 삭제되었습니다.' })
  } catch (err) {
    console.error('[admin/prompts/delete]', err)
    res.status(500).json({ error: '프롬프트를 삭제하지 못했습니다.' })
  }
})

export default router
