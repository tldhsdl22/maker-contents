/**
 * 이미지 AI 추상화 레이어 (나노바나나 등)
 *
 * 실제 이미지 AI API가 연동되면 processImage()와 generateImage() 내부만 교체하면 됩니다.
 * 현재는 mock 구현으로, 원본 이미지를 복사하거나 플레이스홀더를 생성합니다.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

export interface ProcessImageRequest {
  sourcePath: string
  prompt: string
  removeWatermark: boolean
}

export interface ProcessImageResult {
  outputPath: string
  success: boolean
  error?: string
}

export interface GenerateImageRequest {
  prompt: string
  context: string
}

export interface GenerateImageResult {
  outputPath: string
  success: boolean
  error?: string
}

export async function processImage(
  request: ProcessImageRequest,
  outputDir: string,
  filename: string
): Promise<ProcessImageResult> {
  // Gemini 이미지 편집 API 호출
  try {
    await fs.mkdir(outputDir, { recursive: true })
    const outputPath = path.join(outputDir, filename)
    const sourceFull = path.resolve(request.sourcePath)

    await fs.access(sourceFull)

    const prompt = buildTransformPrompt(request.prompt, request.removeWatermark)
    try {
      const result = await callGeminiImage({
        prompt,
        inputImagePath: sourceFull,
      })

      const finalPath = ensureImageExtension(outputPath, result.mimeType)
      await fs.writeFile(finalPath, result.buffer)

      return { outputPath: finalPath, success: true }
    } catch (err) {
      console.warn('[imageAi/process] Gemini 변환 실패, 원본 사용', err)
      const finalPath = ensureImageExtension(outputPath, mimeTypeFromPath(sourceFull))
      await fs.copyFile(sourceFull, finalPath)
      return {
        outputPath: finalPath,
        success: true,
        error: err instanceof Error ? err.message : '이미지 변환 실패로 원본을 사용했습니다.',
      }
    }
  } catch (err) {
    return {
      outputPath: '',
      success: false,
      error: err instanceof Error ? err.message : '이미지 처리 실패',
    }
  }
}

export async function generateImage(
  request: GenerateImageRequest,
  outputDir: string,
  filename: string
): Promise<GenerateImageResult> {
  // Gemini 이미지 생성 API 호출
  try {
    await fs.mkdir(outputDir, { recursive: true })
    const outputPath = path.join(outputDir, filename)
    const prompt = buildGenerationPrompt(request.prompt, request.context)
    const result = await callGeminiImage({ prompt })

    const finalPath = ensureImageExtension(outputPath, result.mimeType)
    await fs.writeFile(finalPath, result.buffer)

    return { outputPath: finalPath, success: true }
  } catch (err) {
    console.error('[imageAi/generate] Gemini 생성 실패', err)
    return {
      outputPath: '',
      success: false,
      error: err instanceof Error ? err.message : '이미지 생성 실패',
    }
  }
}

async function callGeminiImage(input: {
  prompt: string
  inputImagePath?: string
}) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY가 설정되어 있지 않습니다.')
  }

  const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image'
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`

  const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = []
  if (input.inputImagePath) {
    const mimeType = mimeTypeFromPath(input.inputImagePath)
    const imageBuffer = await fs.readFile(input.inputImagePath)
    parts.push({
      inline_data: {
        mime_type: mimeType,
        data: imageBuffer.toString('base64'),
      },
    })
  }
  parts.push({ text: input.prompt })

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: 0.7, responseModalities: ['TEXT', 'IMAGE'] },
    }),
  })

  const data = await res.json() as any
  if (!res.ok) {
    const message = data?.error?.message || 'Gemini 이미지 생성에 실패했습니다.'
    console.error('[imageAi/gemini] 요청 실패', {
      status: res.status,
      message,
      response: data,
    })
    throw new Error(message)
  }

  const content = data?.candidates?.[0]?.content
  const partsOut = content?.parts ?? []
  const imagePart = partsOut.find((p: {
    inline_data?: { data?: string; mime_type?: string; mimeType?: string }
    inlineData?: { data?: string; mimeType?: string }
  }) => p.inline_data?.data || p.inlineData?.data)

  const inlineData = imagePart?.inline_data || imagePart?.inlineData
  if (!inlineData?.data) {
    console.error('[imageAi/gemini] 이미지 응답 없음', {
      response: data,
      content,
      parts: partsOut.map((p: any) => Object.keys(p)),
    })
    throw new Error('Gemini 이미지 응답이 비어 있습니다.')
  }

  const mimeType = inlineData.mime_type || inlineData.mimeType || 'image/png'
  return {
    buffer: Buffer.from(inlineData.data, 'base64'),
    mimeType,
  }
}

function buildTransformPrompt(prompt: string, removeWatermark: boolean) {
  const instructions = [
    prompt?.trim(),
    removeWatermark ? '워터마크는 제거해주세요.' : null,
  ].filter(Boolean)
  return instructions.join('\n')
}

function buildGenerationPrompt(prompt: string, context: string) {
  const base = prompt?.trim() || ''
  const ctx = context?.trim() || ''
  if (!ctx) return base
  return `${base}\n\n[참고 컨텍스트]\n${ctx}`
}

function mimeTypeFromPath(filePath: string) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.png') return 'image/png'
  return 'image/png'
}

function ensureImageExtension(filePath: string, mimeType: string) {
  const ext = mimeType === 'image/jpeg' ? '.jpg' : mimeType === 'image/webp' ? '.webp' : '.png'
  return filePath.endsWith(ext) ? filePath : filePath.replace(/\.[^.]+$/, ext)
}
