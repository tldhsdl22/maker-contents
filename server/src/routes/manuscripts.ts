import { Router } from 'express'
import * as manuscriptQuery from '../db/queries/manuscripts.js'
import * as sourceQuery from '../db/queries/sources.js'
import * as promptQuery from '../db/queries/prompts.js'
import * as imageTemplateQuery from '../db/queries/imageTemplates.js'
import * as jobQueue from '../db/queries/jobQueue.js'
import * as postingQuery from '../db/queries/postings.js'
import * as performanceQuery from '../db/queries/performance.js'
import type { GeneratePayload } from '../services/manuscriptGenerator.js'

const router = Router()

// POST /api/manuscripts/generate — 원고 생성 요청
router.post('/generate', async (req, res) => {
  try {
    const userId = req.user!.id
    const {
      source_id, prompt_id, image_template_id,
      keyword, length_option, new_image_count,
    } = req.body

    if (!source_id || !prompt_id || !image_template_id) {
      res.status(400).json({ error: '소스, 프롬프트, 이미지 템플릿을 모두 선택해주세요.' })
      return
    }

    const lengthOpt = ['short', 'medium', 'long'].includes(length_option) ? length_option : 'medium'
    const imgCount = Math.min(10, Math.max(0, Number(new_image_count) || 0))

    const source = await sourceQuery.findById(source_id)
    if (!source) {
      res.status(404).json({ error: '소스 기사를 찾을 수 없습니다.' })
      return
    }

    const prompt = await promptQuery.findById(prompt_id)
    if (!prompt || !prompt.is_active) {
      res.status(404).json({ error: '유효한 프롬프트를 찾을 수 없습니다.' })
      return
    }

    const template = await imageTemplateQuery.findById(image_template_id)
    if (!template || !template.is_active) {
      res.status(404).json({ error: '유효한 이미지 템플릿을 찾을 수 없습니다.' })
      return
    }

    const manuscriptId = await manuscriptQuery.create({
      user_id: userId,
      source_id: source.id,
      prompt_id: prompt.id,
      image_template_id: template.id,
      title: source.title,
      keyword: keyword || null,
      length_option: lengthOpt,
      new_image_count: imgCount,
      prompt_snapshot: prompt.content,
      image_template_snapshot: JSON.stringify({
        name: template.name,
        original_image_prompt: template.original_image_prompt,
        new_image_prompt: template.new_image_prompt,
        remove_watermark: template.remove_watermark,
      }),
      source_title_snapshot: source.title,
      source_url_snapshot: source.original_url,
    })

    await sourceQuery.addWorker(source.id, userId)

    const jobPayload: GeneratePayload = {
      manuscriptId,
      userId,
      sourceId: source.id,
      promptContent: prompt.content,
      modelProvider: prompt.model_provider,
      modelName: prompt.model_name,
      imageTemplate: {
        original_image_prompt: template.original_image_prompt,
        new_image_prompt: template.new_image_prompt,
        remove_watermark: !!template.remove_watermark,
      },
      keyword: keyword || null,
      lengthOption: lengthOpt,
      newImageCount: imgCount,
    }

    const jobId = await jobQueue.create({
      type: 'manuscript_generation',
      payload: jobPayload as unknown as Record<string, unknown>,
    })

    res.status(201).json({
      manuscript_id: manuscriptId,
      job_id: jobId,
      status: 'generating',
    })
  } catch (err) {
    console.error('[manuscripts/generate]', err)
    res.status(500).json({ error: '원고 생성 요청에 실패했습니다.' })
  }
})

// GET /api/manuscripts/:id/status — 원고 생성 상태 조회
router.get('/:id/status', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) {
      res.status(400).json({ error: '유효하지 않은 ID입니다.' })
      return
    }

    const manuscript = await manuscriptQuery.findById(id)
    if (!manuscript) {
      res.status(404).json({ error: '원고를 찾을 수 없습니다.' })
      return
    }

    if (manuscript.user_id !== req.user!.id) {
      res.status(403).json({ error: '본인이 생성한 원고만 조회할 수 있습니다.' })
      return
    }

    res.json({
      id: manuscript.id,
      status: manuscript.status,
      title: manuscript.title,
      created_at: manuscript.created_at,
    })
  } catch (err) {
    console.error('[manuscripts/status]', err)
    res.status(500).json({ error: '원고 상태를 조회하지 못했습니다.' })
  }
})

// GET /api/manuscripts — 내 원고 목록
router.get('/', async (req, res) => {
  try {
    const userId = req.user!.id
    const status = req.query.status as string | undefined
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))

    const result = await manuscriptQuery.findByUserFiltered(userId, { status, page, limit })

    res.json({
      manuscripts: result.manuscripts.map(m => ({
        id: m.id,
        title: m.title,
        status: m.status,
        keyword: m.keyword,
        length_option: m.length_option,
        source_title_snapshot: m.source_title_snapshot,
        prompt_snapshot: m.prompt_snapshot,
        posting_url: m.posting_url ?? null,
        posting_platform: m.posting_platform ?? null,
        posting_keyword: m.posting_keyword ?? null,
        posted_at: m.posted_at ?? null,
        tracking_status: m.tracking_status ?? null,
        tracking_start: m.tracking_start ?? null,
        tracking_end: m.tracking_end ?? null,
        latest_rank: m.latest_rank ?? null,
        latest_views: m.latest_views ?? null,
        latest_comments: m.latest_comments ?? null,
        created_at: m.created_at,
        updated_at: m.updated_at,
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
    })
  } catch (err) {
    console.error('[manuscripts/list]', err)
    res.status(500).json({ error: '원고 목록을 불러오지 못했습니다.' })
  }
})

// GET /api/manuscripts/:id — 원고 상세
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) {
      res.status(400).json({ error: '유효하지 않은 ID입니다.' })
      return
    }

    const manuscript = await manuscriptQuery.findById(id)
    if (!manuscript) {
      res.status(404).json({ error: '원고를 찾을 수 없습니다.' })
      return
    }

    if (manuscript.user_id !== req.user!.id) {
      res.status(403).json({ error: '본인이 생성한 원고만 조회할 수 있습니다.' })
      return
    }

    const images = await manuscriptQuery.findImagesByManuscriptId(id)

    res.json({
      manuscript: {
        ...manuscript,
        images: images.map(img => ({
          id: img.id,
          image_type: img.image_type,
          file_url: img.file_url,
          sort_order: img.sort_order,
        })),
      },
    })
  } catch (err) {
    console.error('[manuscripts/detail]', err)
    res.status(500).json({ error: '원고 상세 정보를 불러오지 못했습니다.' })
  }
})

// PUT /api/manuscripts/:id — 원고 수정
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) {
      res.status(400).json({ error: '유효하지 않은 ID입니다.' })
      return
    }

    const manuscript = await manuscriptQuery.findById(id)
    if (!manuscript) {
      res.status(404).json({ error: '원고를 찾을 수 없습니다.' })
      return
    }

    if (manuscript.user_id !== req.user!.id) {
      res.status(403).json({ error: '본인이 생성한 원고만 수정할 수 있습니다.' })
      return
    }

    const { title, content_html } = req.body
    if (!title || typeof title !== 'string') {
      res.status(400).json({ error: '제목을 입력해주세요.' })
      return
    }

    await manuscriptQuery.update(id, {
      title: title.trim(),
      content_html: content_html ?? manuscript.content_html ?? '',
    })

    const updated = await manuscriptQuery.findById(id)
    const images = await manuscriptQuery.findImagesByManuscriptId(id)

    res.json({
      manuscript: {
        ...updated,
        images: images.map(img => ({
          id: img.id,
          image_type: img.image_type,
          file_url: img.file_url,
          sort_order: img.sort_order,
        })),
      },
    })
  } catch (err) {
    console.error('[manuscripts/update]', err)
    res.status(500).json({ error: '원고 수정에 실패했습니다.' })
  }
})

// DELETE /api/manuscripts/:id — 원고 삭제
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) {
      res.status(400).json({ error: '유효하지 않은 ID입니다.' })
      return
    }

    const manuscript = await manuscriptQuery.findById(id)
    if (!manuscript) {
      res.status(404).json({ error: '원고를 찾을 수 없습니다.' })
      return
    }

    if (manuscript.user_id !== req.user!.id) {
      res.status(403).json({ error: '본인이 생성한 원고만 삭제할 수 있습니다.' })
      return
    }

    const images = await manuscriptQuery.deleteById(id)

    // 이미지 파일 정리 (S3 또는 로컬)
    const { deleteStoredFile } = await import('../services/imageStorage.js')
    for (const img of images) {
      try {
        await deleteStoredFile(img.file_path)
      } catch {
        // 파일이 이미 없거나 삭제 실패 시 무시
      }
    }

    res.json({ message: '원고가 삭제되었습니다.' })
  } catch (err) {
    console.error('[manuscripts/delete]', err)
    res.status(500).json({ error: '원고 삭제에 실패했습니다.' })
  }
})

// POST /api/manuscripts/:id/publish — 포스팅 완료 처리
router.post('/:id/publish', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) {
      res.status(400).json({ error: '유효하지 않은 ID입니다.' })
      return
    }

    const manuscript = await manuscriptQuery.findById(id)
    if (!manuscript) {
      res.status(404).json({ error: '원고를 찾을 수 없습니다.' })
      return
    }

    if (manuscript.user_id !== req.user!.id) {
      res.status(403).json({ error: '본인이 생성한 원고만 포스팅 완료 처리할 수 있습니다.' })
      return
    }

    if (manuscript.status === 'posted') {
      res.status(400).json({ error: '이미 포스팅 완료된 원고입니다.' })
      return
    }

    const { url, platform, keyword } = req.body

    if (!url || typeof url !== 'string' || !url.trim()) {
      res.status(400).json({ error: '포스팅 URL을 입력해 주세요.' })
      return
    }

    try {
      new URL(url.trim())
    } catch {
      res.status(400).json({ error: '올바른 URL을 입력해 주세요.' })
      return
    }

    if (!platform || !['blog', 'cafe'].includes(platform)) {
      res.status(400).json({ error: '플랫폼을 선택해 주세요. (blog 또는 cafe)' })
      return
    }

    const postingKeyword = keyword?.trim() || manuscript.keyword || null

    const postingId = await postingQuery.create({
      manuscript_id: id,
      url: url.trim(),
      platform,
      keyword: postingKeyword,
    })

    await manuscriptQuery.updateStatus(id, 'posted')

    // 성과 추적 자동 시작
    await performanceQuery.createTracking(postingId)

    const posting = await postingQuery.findById(postingId)

    res.status(201).json({ posting })
  } catch (err) {
    console.error('[manuscripts/publish]', err)
    res.status(500).json({ error: '포스팅 완료 처리에 실패했습니다.' })
  }
})

// GET /api/manuscripts/:id/publish-info — 포스팅 정보 조회
router.get('/:id/publish-info', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) {
      res.status(400).json({ error: '유효하지 않은 ID입니다.' })
      return
    }

    const manuscript = await manuscriptQuery.findById(id)
    if (!manuscript) {
      res.status(404).json({ error: '원고를 찾을 수 없습니다.' })
      return
    }

    if (manuscript.user_id !== req.user!.id) {
      res.status(403).json({ error: '본인이 생성한 원고만 조회할 수 있습니다.' })
      return
    }

    const posting = await postingQuery.findByManuscriptId(id)
    res.json({ posting: posting || null })
  } catch (err) {
    console.error('[manuscripts/publish-info]', err)
    res.status(500).json({ error: '포스팅 정보를 조회하지 못했습니다.' })
  }
})

// GET /api/manuscripts/:id/performance — 성과 데이터 시간별 추이
router.get('/:id/performance', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) {
      res.status(400).json({ error: '유효하지 않은 ID입니다.' })
      return
    }

    const manuscript = await manuscriptQuery.findById(id)
    if (!manuscript) {
      res.status(404).json({ error: '원고를 찾을 수 없습니다.' })
      return
    }

    if (manuscript.user_id !== req.user!.id) {
      res.status(403).json({ error: '본인이 생성한 원고만 조회할 수 있습니다.' })
      return
    }

    const posting = await postingQuery.findByManuscriptId(id)
    if (!posting) {
      res.json({ tracking: null, data: [] })
      return
    }

    const tracking = await performanceQuery.findTrackingByPostingId(posting.id)
    if (!tracking) {
      res.json({ tracking: null, data: [] })
      return
    }

    const data = await performanceQuery.findDataByTrackingId(tracking.id)

    res.json({
      tracking: {
        id: tracking.id,
        status: tracking.status,
        tracking_start: tracking.tracking_start,
        tracking_end: tracking.tracking_end,
      },
      data: data.map(d => ({
        keyword_rank: d.keyword_rank,
        view_count: d.view_count,
        comment_count: d.comment_count,
        is_accessible: !!d.is_accessible,
        collected_at: d.collected_at,
      })),
    })
  } catch (err) {
    console.error('[manuscripts/performance]', err)
    res.status(500).json({ error: '성과 데이터를 조회하지 못했습니다.' })
  }
})

// GET /api/manuscripts/:id/performance/summary — 성과 요약
router.get('/:id/performance/summary', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) {
      res.status(400).json({ error: '유효하지 않은 ID입니다.' })
      return
    }

    const manuscript = await manuscriptQuery.findById(id)
    if (!manuscript) {
      res.status(404).json({ error: '원고를 찾을 수 없습니다.' })
      return
    }

    if (manuscript.user_id !== req.user!.id) {
      res.status(403).json({ error: '본인이 생성한 원고만 조회할 수 있습니다.' })
      return
    }

    const summary = await performanceQuery.getSummaryByManuscriptId(id)
    res.json({ summary: summary || null })
  } catch (err) {
    console.error('[manuscripts/performance/summary]', err)
    res.status(500).json({ error: '성과 요약을 조회하지 못했습니다.' })
  }
})

export default router
