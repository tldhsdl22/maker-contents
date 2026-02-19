import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { promptService } from '../../services/prompt.js'
import { ApiError } from '../../services/api.js'

const VARIABLES = [
  { name: '{원문}', desc: '소스 기사의 원문 텍스트 (필수)', required: true },
  { name: '{키워드}', desc: '사용자가 입력한 키워드 (선택)', required: false },
]

const PROVIDER_LABEL: Record<'openai' | 'anthropic' | 'gemini', string> = {
  openai: 'OpenAI',
  anthropic: 'Claude',
  gemini: 'Google Gemini',
}

const MODEL_OPTIONS: Record<'openai' | 'anthropic' | 'gemini', string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'o1-mini'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
  gemini: ['gemini-1.5-flash', 'gemini-1.5-pro'],
}

export default function PromptEditPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [description, setDescription] = useState('')
  const [modelProvider, setModelProvider] = useState<'openai' | 'anthropic' | 'gemini'>('openai')
  const [modelName, setModelName] = useState('gpt-4o-mini')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    setFetching(true)
    promptService.getById(Number(id))
      .then(data => {
        setName(data.prompt.name)
        setContent(data.prompt.content)
        setDescription(data.prompt.description || '')
        setModelProvider(data.prompt.model_provider || 'openai')
        setModelName(data.prompt.model_name || 'gpt-4o-mini')
      })
      .catch(err => {
        setError(err instanceof ApiError ? err.message : '프롬프트를 불러오지 못했습니다.')
      })
      .finally(() => setFetching(false))
  }, [id])

  useEffect(() => {
    if (!MODEL_OPTIONS[modelProvider].includes(modelName)) {
      setModelName(MODEL_OPTIONS[modelProvider][0])
    }
  }, [modelProvider, modelName])

  function insertVariable(variable: string) {
    setContent(prev => prev + variable)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('프롬프트명을 입력해주세요.')
      return
    }
    if (!content.trim()) {
      setError('프롬프트 내용을 입력해주세요.')
      return
    }
    if (!content.includes('{원문}')) {
      setError('프롬프트 내용에 {원문} 변수가 반드시 포함되어야 합니다.')
      return
    }

    setLoading(true)
    try {
      if (isEdit) {
        await promptService.update(Number(id), {
          name: name.trim(),
          content: content.trim(),
          description: description.trim() || undefined,
          model_provider: modelProvider,
          model_name: modelName,
        })
      } else {
        await promptService.create({
          name: name.trim(),
          content: content.trim(),
          description: description.trim() || undefined,
          model_provider: modelProvider,
          model_name: modelName,
        })
      }
      navigate('/admin/prompts')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/prompts')}
          className="inline-flex items-center gap-1 text-sm text-gray-500 transition hover:text-gray-900"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          프롬프트 목록
        </button>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          {isEdit ? '프롬프트 수정' : '새 프롬프트'}
        </h1>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              프롬프트명 <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="예: 커뮤니티_남자, 블로그_리뷰_여성"
              className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm shadow-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              설명
            </label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="이 프롬프트가 어떤 스타일의 원고를 생성하는지 간략히 설명해주세요."
              className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm shadow-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="modelProvider" className="block text-sm font-medium text-gray-700">
                모델 제공사
              </label>
              <select
                id="modelProvider"
                value={modelProvider}
                onChange={e => setModelProvider(e.target.value as 'openai' | 'anthropic' | 'gemini')}
                className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm shadow-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              >
                {Object.entries(PROVIDER_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="modelName" className="block text-sm font-medium text-gray-700">
                모델명
              </label>
              <select
                id="modelName"
                value={modelName}
                onChange={e => setModelName(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm shadow-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              >
                {MODEL_OPTIONS[modelProvider].map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                프롬프트 내용 <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-gray-400">{content.length}자</span>
            </div>
            <textarea
              id="content"
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={14}
              placeholder="AI에게 전달할 프롬프트를 작성하세요. {원문} 변수는 반드시 포함해야 합니다."
              className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 font-mono text-sm shadow-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="mb-2 text-xs font-medium text-gray-500">사용 가능한 변수</p>
            <div className="flex flex-wrap gap-2">
              {VARIABLES.map(v => (
                <button
                  key={v.name}
                  type="button"
                  onClick={() => insertVariable(v.name)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    v.required
                      ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                  title={`클릭하여 삽입: ${v.name}`}
                >
                  <code>{v.name}</code>
                  <span className="text-gray-400">—</span>
                  <span>{v.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/prompts')}
            className="btn-base btn-secondary btn-md"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-base btn-primary btn-md inline-flex items-center gap-2 disabled:opacity-50"
          >
            {loading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {isEdit ? '저장' : '생성'}
          </button>
        </div>
      </form>
    </div>
  )
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  )
}
