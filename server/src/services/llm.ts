/**
 * LLM 추상화 레이어
 *
 * 실제 LLM API가 연동되면 generate() 내부만 교체하면 됩니다.
 * 현재는 mock 구현으로, 소스 기사를 기반으로 변환된 형태의 텍스트를 생성합니다.
 */

export interface LlmRequest {
  prompt: string
  maxTokens?: number
  provider?: 'openai' | 'anthropic' | 'gemini'
  model?: string
}

export interface LlmResponse {
  text: string
  tokensUsed: number
}

export async function generate(request: LlmRequest): Promise<LlmResponse> {
  const provider = request.provider ?? 'openai'
  const model = request.model ?? defaultModel(provider)

  if (provider === 'openai') {
    return generateWithOpenAI(request.prompt, model, request.maxTokens)
  }
  if (provider === 'anthropic') {
    return generateWithAnthropic(request.prompt, model, request.maxTokens)
  }
  if (provider === 'gemini') {
    return generateWithGemini(request.prompt, model, request.maxTokens)
  }

  const text = generateMockArticle(request.prompt)
  return { text, tokensUsed: text.length }
}

function defaultModel(provider: 'openai' | 'anthropic' | 'gemini') {
  if (provider === 'anthropic') return 'claude-3-5-sonnet-20241022'
  if (provider === 'gemini') return 'gemini-1.5-flash'
  return 'gpt-4o-mini'
}

async function generateWithOpenAI(prompt: string, model: string, maxTokens = 1200): Promise<LlmResponse> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY가 설정되어 있지 않습니다.')
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  })

  const data = (await res.json()) as {
    error?: { message?: string }
    choices?: Array<{ message?: { content?: string } }>
    usage?: { total_tokens?: number }
  }
  if (!res.ok) {
    throw new Error(data?.error?.message || 'OpenAI 호출에 실패했습니다.')
  }

  const text = data.choices?.[0]?.message?.content?.trim() || ''
  return { text, tokensUsed: data.usage?.total_tokens ?? text.length }
}

async function generateWithAnthropic(prompt: string, model: string, maxTokens = 1200): Promise<LlmResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY가 설정되어 있지 않습니다.')
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = (await res.json()) as {
    error?: { message?: string }
    content?: Array<{ text?: string }>
    usage?: { output_tokens?: number }
  }
  if (!res.ok) {
    throw new Error(data?.error?.message || 'Claude 호출에 실패했습니다.')
  }

  const text = data.content?.[0]?.text?.trim() || ''
  return { text, tokensUsed: data.usage?.output_tokens ?? text.length }
}

async function generateWithGemini(prompt: string, model: string, maxTokens = 1200): Promise<LlmResponse> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY가 설정되어 있지 않습니다.')
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
      }),
    }
  )

  const data = (await res.json()) as {
    error?: { message?: string }
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  if (!res.ok) {
    throw new Error(data?.error?.message || 'Gemini 호출에 실패했습니다.')
  }

  const parts = data.candidates?.[0]?.content?.parts ?? []
  const text = parts.map((p: { text?: string }) => p.text || '').join('').trim()
  return { text, tokensUsed: text.length }
}

function generateMockArticle(prompt: string): string {
  const titleMatch = prompt.match(/제목[:\s]*([^\n]+)/i)
  const title = titleMatch ? titleMatch[1].trim() : '생성된 원고'

  const contentLines = prompt.split('\n').filter(line => line.trim().length > 20)
  const sampleSentences = contentLines.slice(0, 5).map(l => l.trim().slice(0, 100))

  const paragraphs = [
    `<h2>${title}</h2>`,
    `<p>${sampleSentences[0] || '이 원고는 AI에 의해 자동 생성되었습니다.'} 관련 내용을 깊이 있게 살펴보겠습니다.</p>`,
    `<h3>주요 내용</h3>`,
    `<p>${sampleSentences[1] || '최근 이 분야에서 주목할 만한 변화가 있었습니다.'} 전문가들은 이러한 변화가 앞으로도 계속될 것으로 전망하고 있습니다.</p>`,
    `<p>${sampleSentences[2] || '특히 기술의 발전과 함께 새로운 가능성이 열리고 있습니다.'} 이는 업계 전반에 걸쳐 큰 영향을 미칠 것으로 예상됩니다.</p>`,
    `<h3>전문가 분석</h3>`,
    `<p>${sampleSentences[3] || '업계 관계자는 "이번 변화는 매우 의미 있는 발전"이라고 평가했습니다.'} 향후 관련 정책과 시장 동향을 주시할 필요가 있습니다.</p>`,
    `<p>${sampleSentences[4] || '앞으로의 전망에 대해 많은 관심이 쏠리고 있습니다.'} 지속적인 관찰과 분석이 필요한 시점입니다.</p>`,
    `<h3>마무리</h3>`,
    `<p>이상으로 관련 내용을 정리해 보았습니다. 앞으로도 관련 소식을 계속 전해드리겠습니다.</p>`,
  ]

  return paragraphs.join('\n')
}
