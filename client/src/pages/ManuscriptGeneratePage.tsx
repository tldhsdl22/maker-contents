import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { sourceService } from '../services/source.js'
import { promptService } from '../services/prompt.js'
import { imageTemplateService } from '../services/imageTemplate.js'
import { manuscriptService } from '../services/manuscript.js'
import { ApiError } from '../services/api.js'
import type { SourceDetail } from '../types/source.js'
import type { Prompt } from '../types/prompt.js'
import type { ImageTemplate } from '../types/imageTemplate.js'

type Phase = 'settings' | 'generating' | 'done' | 'error'
type LengthOption = 'short' | 'medium' | 'long'

type PersistedSettings = {
  promptId?: number
  templateId?: number
  keyword?: string
  lengthOption?: LengthOption
  newImageCount?: number
}

const LENGTH_OPTIONS: { value: LengthOption; label: string; desc: string }[] = [
  { value: 'short', label: '짧게', desc: '500자 내외' },
  { value: 'medium', label: '보통', desc: '1000자 내외' },
  { value: 'long', label: '길게', desc: '2000자 내외' },
]

const SETTINGS_STORAGE_KEY = 'manuscript_generate_settings'

export default function ManuscriptGeneratePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const sourceId = Number(searchParams.get('sourceId'))

  // Data
  const [source, setSource] = useState<SourceDetail | null>(null)
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [templates, setTemplates] = useState<ImageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Form
  const [promptId, setPromptId] = useState<number>(0)
  const [templateId, setTemplateId] = useState<number>(0)
  const [keyword, setKeyword] = useState('')
  const [lengthOption, setLengthOption] = useState<LengthOption>('medium')
  const [newImageCount, setNewImageCount] = useState(0)

  // Generation state
  const [phase, setPhase] = useState<Phase>('settings')
  const [manuscriptId, setManuscriptId] = useState<number | null>(null)
  const [generationError, setGenerationError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hydratedRef = useRef(false)

  function readStoredSettings(): PersistedSettings | null {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (!raw) return null
      return JSON.parse(raw) as PersistedSettings
    } catch {
      return null
    }
  }

  function persistSettings(next: PersistedSettings) {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ignore storage errors
    }
  }

  // Load source, prompts, templates
  useEffect(() => {
    if (!sourceId) {
      setError('소스 기사 ID가 필요합니다.')
      setLoading(false)
      return
    }

    async function loadData() {
      try {
        const [sourceRes, promptRes, templateRes] = await Promise.all([
          sourceService.getById(sourceId),
          promptService.getAll(),
          imageTemplateService.getAll(),
        ])
        setSource(sourceRes.source)

        const activePrompts = promptRes.prompts.filter(p => p.is_active)
        const activeTemplates = templateRes.templates.filter(t => t.is_active)
        setPrompts(activePrompts)
        setTemplates(activeTemplates)

        const stored = readStoredSettings()
        const promptFromStore = stored?.promptId
        const templateFromStore = stored?.templateId
        const keywordFromStore = stored?.keyword ?? ''
        const lengthFromStore = stored?.lengthOption ?? 'medium'
        const imageCountFromStore = stored?.newImageCount ?? 0

        const initialPromptId =
          promptFromStore && activePrompts.some(p => p.id === promptFromStore)
            ? promptFromStore
            : activePrompts[0]?.id ?? 0
        const initialTemplateId =
          templateFromStore && activeTemplates.some(t => t.id === templateFromStore)
            ? templateFromStore
            : activeTemplates[0]?.id ?? 0

        setPromptId(initialPromptId)
        setTemplateId(initialTemplateId)
        setKeyword(keywordFromStore)
        setLengthOption(lengthFromStore)
        setNewImageCount(Math.min(10, Math.max(0, imageCountFromStore)))
        hydratedRef.current = true
      } catch (err) {
        setError(err instanceof ApiError ? err.message : '데이터를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [sourceId])

  // Poll for generation status
  const pollStatus = useCallback(async (mId: number) => {
    try {
      const res = await manuscriptService.getStatus(mId)
      if (res.status === 'generated' || res.status === 'posted') {
        setPhase('done')
        return
      }
      if (res.status === 'failed') {
        setGenerationError('원고 생성에 실패했습니다. API 키 또는 서버 로그를 확인해주세요.')
        setPhase('error')
        return
      }
      pollRef.current = setTimeout(() => pollStatus(mId), 2000)
    } catch {
      pollRef.current = setTimeout(() => pollStatus(mId), 3000)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current)
    }
  }, [])

  useEffect(() => {
    if (!hydratedRef.current) return
    persistSettings({
      promptId,
      templateId,
      keyword,
      lengthOption,
      newImageCount,
    })
  }, [promptId, templateId, keyword, lengthOption, newImageCount])

  async function handleGenerate() {
    if (!promptId || !templateId) return
    setSubmitting(true)
    setGenerationError('')

    try {
      const res = await manuscriptService.generate({
        source_id: sourceId,
        prompt_id: promptId,
        image_template_id: templateId,
        keyword: keyword || undefined,
        length_option: lengthOption,
        new_image_count: newImageCount,
      })
      setManuscriptId(res.manuscript_id)
      setPhase('generating')
      pollStatus(res.manuscript_id)
    } catch (err) {
      setGenerationError(err instanceof ApiError ? err.message : '원고 생성 요청에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleGoToManuscript() {
    if (manuscriptId) {
      navigate(`/manuscripts/${manuscriptId}`)
    }
  }

  function handleRetry() {
    setPhase('settings')
    setGenerationError('')
    setManuscriptId(null)
  }

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  // Error loading data
  if (error) {
    return (
      <div className="flex flex-col items-center py-20">
        <div className="rounded-lg bg-red-50 px-6 py-4 text-sm text-red-600">{error}</div>
        <button
          onClick={() => navigate('/sources')}
          className="btn-link mt-4 text-sm"
        >
          소스 기사 목록으로 돌아가기
        </button>
      </div>
    )
  }

  // Generating / Done / Error phase
  if (phase === 'generating') {
    return <GeneratingView title={source?.title ?? ''} />
  }

  if (phase === 'done') {
    return (
      <DoneView
        title={source?.title ?? ''}
        onGoToManuscript={handleGoToManuscript}
        onCreateAnother={() => handleRetry()}
      />
    )
  }

  if (phase === 'error') {
    return (
      <ErrorView
        title={source?.title ?? ''}
        message={generationError || '원고 생성에 실패했습니다.'}
        onRetry={() => handleRetry()}
        onBackToSources={() => navigate('/sources')}
      />
    )
  }

  // Settings phase
  const selectedPrompt = prompts.find(p => p.id === promptId)
  const selectedTemplate = templates.find(t => t.id === templateId)

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/sources')}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <BackIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">원고 생성</h1>
            <p className="text-sm text-gray-500">소스 기사를 기반으로 AI 원고를 생성합니다.</p>
          </div>
        </div>
      </div>

      {/* Content: 좌우 분할 */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: 소스 기사 미리보기 */}
        <div className="w-1/2 overflow-y-auto border-r border-gray-200 bg-white p-6">
          <SourcePreview source={source!} />
        </div>

        {/* Right: 설정 패널 */}
        <div className="w-1/2 overflow-y-auto bg-gray-50 p-6">
          <div className="mx-auto max-w-lg space-y-6">
            {/* 프롬프트 선택 */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                프롬프트 <span className="text-red-500">*</span>
              </label>
              <select
                value={promptId}
                onChange={e => setPromptId(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value={0} disabled>프롬프트를 선택하세요</option>
                {prompts.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {selectedPrompt?.description && (
                <p className="mt-1 text-xs text-gray-500">{selectedPrompt.description}</p>
              )}
            </div>

            {/* 이미지 처리 템플릿 */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                이미지 처리 템플릿 <span className="text-red-500">*</span>
              </label>
              <select
                value={templateId}
                onChange={e => setTemplateId(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value={0} disabled>이미지 템플릿을 선택하세요</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {selectedTemplate?.description && (
                <p className="mt-1 text-xs text-gray-500">{selectedTemplate.description}</p>
              )}
            </div>

            {/* 키워드 */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                키워드 <span className="text-xs font-normal text-gray-400">(선택)</span>
              </label>
              <input
                type="text"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="원고에 반영할 키워드를 입력하세요"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* 글 길이 */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">글 길이</label>
              <div className="grid grid-cols-3 gap-2">
                {LENGTH_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLengthOption(opt.value)}
                    className={`rounded-lg border px-3 py-2.5 text-center transition ${
                      lengthOption === opt.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-sm font-medium">{opt.label}</div>
                    <div className="text-xs text-gray-400">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 새 이미지 생성 개수 */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                새 이미지 생성 개수
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={newImageCount}
                  onChange={e => setNewImageCount(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="w-8 text-center text-sm font-medium text-gray-900">{newImageCount}</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                원본 이미지 {source?.images.length ?? 0}개 + 새로 생성 {newImageCount}개 = 총 {(source?.images.length ?? 0) + newImageCount}개
              </p>
            </div>

            {/* 에러 메시지 */}
            {generationError && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                {generationError}
              </div>
            )}

            {/* 생성 버튼 */}
            <button
              onClick={handleGenerate}
              disabled={submitting || !promptId || !templateId}
              className="btn-base btn-primary btn-lg w-full disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  요청 중...
                </span>
              ) : (
                '원고 생성'
              )}
            </button>

            {prompts.length === 0 && (
              <p className="text-center text-sm text-amber-600">
                활성화된 프롬프트가 없습니다. 관리자에게 문의하세요.
              </p>
            )}
            {templates.length === 0 && (
              <p className="text-center text-sm text-amber-600">
                활성화된 이미지 템플릿이 없습니다. 관리자에게 문의하세요.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Source Preview
// ---------------------------------------------------------------------------

function SourcePreview({ source }: { source: SourceDetail }) {
  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {source.category && (
            <span className="rounded-md bg-gray-100 px-2 py-0.5 font-medium text-gray-600">
              {source.category}
            </span>
          )}
          <span>{source.source_site}</span>
          <span>·</span>
          <span>{new Date(source.crawled_at).toLocaleString('ko-KR')}</span>
        </div>
        <h2 className="mt-2 text-xl font-bold text-gray-900">{source.title}</h2>
        <a
          href={source.original_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-xs text-blue-500 hover:underline"
        >
          원본 기사 보기
          <ExternalLinkIcon className="h-3 w-3" />
        </a>
      </div>

      {source.images.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {source.images.map(img => (
            <img
              key={img.id}
              src={`/${img.local_path}`}
              alt=""
              className="h-20 w-20 rounded-lg border border-gray-200 object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ))}
        </div>
      )}

      <div
        className="prose prose-sm max-w-none text-gray-700"
        dangerouslySetInnerHTML={{ __html: source.content_html }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Generating View (S-010)
// ---------------------------------------------------------------------------

function GeneratingView({ title }: { title: string }) {
  const [dots, setDots] = useState('')
  const [step, setStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.')
    }, 500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 2000),
      setTimeout(() => setStep(2), 5000),
      setTimeout(() => setStep(3), 8000),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  const steps = [
    { label: '프롬프트 조립 중', done: step > 0 },
    { label: '원고 텍스트 생성 중', done: step > 1 },
    { label: '이미지 처리 중', done: step > 2 },
    { label: '원고 완성 중', done: false },
  ]

  return (
    <div className="flex h-full flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
            <SpinnerIcon className="h-8 w-8 animate-spin text-blue-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">원고 생성 중{dots}</h2>
          <p className="mt-1 text-sm text-gray-500 line-clamp-1">{title}</p>
        </div>

        <div className="space-y-3">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                s.done
                  ? 'bg-green-100 text-green-600'
                  : i === step
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-400'
              }`}>
                {s.done ? (
                  <CheckIcon className="h-3.5 w-3.5" />
                ) : i === step ? (
                  <span className="h-2 w-2 animate-pulse rounded-full bg-blue-600" />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <span className={`text-sm ${
                s.done ? 'text-green-600' : i === step ? 'font-medium text-gray-900' : 'text-gray-400'
              }`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          예상 소요 시간: 10~30초
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Done View
// ---------------------------------------------------------------------------

function DoneView({
  title,
  onGoToManuscript,
  onCreateAnother,
}: {
  title: string
  onGoToManuscript: () => void
  onCreateAnother: () => void
}) {
  return (
    <div className="page-shell flex h-full flex-col items-center justify-center">
      <div className="surface-card hover-lift w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
          <CheckCircleIcon className="h-8 w-8 text-green-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">원고 생성 완료!</h2>
        <p className="mt-1 text-sm text-gray-500 line-clamp-2">{title}</p>

        <div className="mt-6 space-y-2">
          <button
            onClick={onGoToManuscript}
            className="btn-base btn-primary btn-lg w-full"
          >
            원고 확인하기
          </button>
          <button
            onClick={onCreateAnother}
            className="btn-base btn-secondary btn-lg w-full"
          >
            다른 설정으로 다시 생성
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Error View
// ---------------------------------------------------------------------------

function ErrorView({
  title,
  message,
  onRetry,
  onBackToSources,
}: {
  title: string
  message: string
  onRetry: () => void
  onBackToSources: () => void
}) {
  return (
    <div className="page-shell flex h-full flex-col items-center justify-center">
      <div className="surface-card hover-lift w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <ErrorIcon className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">원고 생성 실패</h2>
        <p className="mt-1 text-sm text-gray-500 line-clamp-2">{title}</p>
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {message}
        </div>

        <div className="mt-6 space-y-2">
          <button
            onClick={onRetry}
            className="btn-base btn-primary btn-lg w-full"
          >
            다시 시도
          </button>
          <button
            onClick={onBackToSources}
            className="btn-base btn-secondary btn-lg w-full"
          >
            소스 목록으로
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  )
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  )
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3h.007M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
