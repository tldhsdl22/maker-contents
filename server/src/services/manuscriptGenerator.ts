import path from 'node:path'
import { load } from 'cheerio'
import * as manuscriptQuery from '../db/queries/manuscripts.js'
import * as sourceQuery from '../db/queries/sources.js'
import * as llm from './llm.js'
import * as imageAi from './imageAi.js'
import { uploadLocalFile, cleanupLocalFile } from './imageStorage.js'

export interface GeneratePayload {
  manuscriptId: number
  userId: number
  sourceId: number
  promptContent: string
  modelProvider?: 'openai' | 'anthropic' | 'gemini'
  modelName?: string
  imageTemplate: {
    original_image_prompt: string
    new_image_prompt: string | null
    remove_watermark: boolean
  }
  keyword: string | null
  lengthOption: 'short' | 'medium' | 'long'
  newImageCount: number
}

const LENGTH_GUIDE: Record<string, string> = {
  short: '500자 내외의 짧은 글',
  medium: '1000자 내외의 보통 길이 글',
  long: '2000자 내외의 긴 글',
}

export async function generate(payload: GeneratePayload): Promise<void> {
  const {
    manuscriptId, userId, sourceId, promptContent,
    imageTemplate, keyword, lengthOption, newImageCount,
  } = payload

  const source = await sourceQuery.findById(sourceId)
  if (!source) throw new Error('소스 기사를 찾을 수 없습니다.')

  const sourceImages = await sourceQuery.findImagesBySourceId(sourceId)
  const sourceText = stripHtmlToText(source.content_html)
  const imageContext = buildImageContext({
    title: source.title,
    keyword,
    content: sourceText,
  })

  try {
    // 1. 프롬프트 조립: {원문} / {키워드} 변수 치환
    let prompt = promptContent
    prompt = prompt.replace(/\{원문\}/g, source.content_html)
    if (keyword) {
      prompt = prompt.replace(/\{키워드\}/g, keyword)
    } else {
      prompt = prompt.replace(/\{키워드\}/g, '')
    }
    prompt += `\n\n글 길이: ${LENGTH_GUIDE[lengthOption] ?? LENGTH_GUIDE.medium}`

    // 2. LLM 호출 → 원고 텍스트 생성
    const llmResult = await llm.generate({
      prompt,
      provider: payload.modelProvider,
      model: payload.modelName,
    })
    if (!llmResult.text || !llmResult.text.trim()) {
      throw new Error('LLM 응답이 비어 있습니다.')
    }
    let contentHtml = llmResult.text.trim()

    // 3. 원본 이미지 처리
    const imageDir = path.join('uploads', 'manuscripts', String(manuscriptId))
    const processedImages: { path: string; url: string; sourceImageId: number }[] = []

    for (let i = 0; i < sourceImages.length; i++) {
      const srcImg = sourceImages[i]
      const filename = `original_${i + 1}.png`

      const result = await imageAi.processImage(
        {
          sourcePath: srcImg.local_path,
          prompt: imageTemplate.original_image_prompt,
          removeWatermark: imageTemplate.remove_watermark,
        },
        imageDir,
        filename
      )

      if (result.success) {
        const storageKey = `manuscripts/${manuscriptId}/${filename}`
        const stored = await storeGeneratedImage(result.outputPath, storageKey)
        processedImages.push({
          path: stored.path,
          url: stored.url,
          sourceImageId: srcImg.id,
        })
      }
    }

    // 4. 새 이미지 생성
    const generatedImages: { path: string; url: string }[] = []
    if (newImageCount > 0 && imageTemplate.new_image_prompt) {
      for (let i = 0; i < newImageCount; i++) {
        const filename = `generated_${i + 1}.png`
        const result = await imageAi.generateImage(
          {
            prompt: imageTemplate.new_image_prompt,
            context: imageContext,
          },
          imageDir,
          filename
        )

        if (result.success) {
          const storageKey = `manuscripts/${manuscriptId}/${filename}`
          const stored = await storeGeneratedImage(result.outputPath, storageKey)
          generatedImages.push({
            path: stored.path,
            url: stored.url,
          })
        }
      }
    }

    // 5. 이미지를 원고 HTML에 배치
    const allImages = [
      ...processedImages.map(img => img.url),
      ...generatedImages.map(img => img.url),
    ]

    if (allImages.length > 0) {
      contentHtml = insertImagesIntoHtml(contentHtml, allImages)
    }

    // 6. DB 저장: 원고 본문 업데이트
    await manuscriptQuery.updateContent(manuscriptId, contentHtml)

    // 7. DB 저장: 이미지 레코드
    let sortOrder = 0
    for (const img of processedImages) {
      await manuscriptQuery.createImage({
        manuscript_id: manuscriptId,
        image_type: 'original_processed',
        original_source_image_id: img.sourceImageId,
        file_path: img.path,
        file_url: img.url,
        sort_order: sortOrder++,
      })
    }
    for (const img of generatedImages) {
      await manuscriptQuery.createImage({
        manuscript_id: manuscriptId,
        image_type: 'generated',
        file_path: img.path,
        file_url: img.url,
        sort_order: sortOrder++,
      })
    }

  } finally {
    // 소스 작업자 해제 (성공/실패 모두)
    await sourceQuery.removeWorker(sourceId, userId).catch(() => {})
  }
}

async function storeGeneratedImage(localPath: string, storageKey: string) {
  const uploaded = await uploadLocalFile(localPath, storageKey)
  await cleanupLocalFile(localPath)
  return { path: uploaded.key, url: uploaded.url }
}

function insertImagesIntoHtml(html: string, imageUrls: string[]): string {
  if (imageUrls.length === 0) return html

  const blocks = extractBlocks(html)
  if (blocks.length === 0) return html

  const paragraphIndexes = blocks
    .map((block, idx) => (isParagraphBlock(block) ? idx : -1))
    .filter(idx => idx >= 0)

  const shouldInsertAfter = (idx: number) => {
    if (paragraphIndexes.length === 0) return true
    return paragraphIndexes.includes(idx)
  }

  let imgIdx = 0
  const result: string[] = []

  for (let i = 0; i < blocks.length; i++) {
    result.push(blocks[i])
    if (imgIdx < imageUrls.length && shouldInsertAfter(i)) {
      result.push(renderImageTag(imageUrls[imgIdx]))
      imgIdx++
    }
  }

  while (imgIdx < imageUrls.length) {
    result.push(renderImageTag(imageUrls[imgIdx]))
    imgIdx++
  }

  return result.join('\n')
}

function extractBlocks(html: string): string[] {
  const $ = load(html)
  const blockEls = $('p, h2, h3, h4, ul, ol, blockquote')

  if (blockEls.length > 0) {
    return blockEls.map((_, el) => $.html(el)).get()
  }

  const text = $.root().text().trim()
  if (!text) return []

  return text
    .split(/\n{2,}/)
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => `<p>${escapeHtml(part)}</p>`)
}

function isParagraphBlock(block: string) {
  return /^<p[ >]/i.test(block.trim())
}

function renderImageTag(url: string) {
  return `<figure><img src="${url}" alt="" style="max-width:100%;height:auto;" /></figure>`
}

function stripHtmlToText(html: string) {
  const $ = load(html)
  return $.root().text().replace(/\s+/g, ' ').trim()
}

function buildImageContext(input: { title: string; keyword: string | null; content: string }) {
  const parts = [
    `제목: ${input.title}`,
    input.keyword ? `키워드: ${input.keyword}` : null,
    input.content,
  ].filter(Boolean)
  return parts.join('\n').slice(0, 1200)
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
