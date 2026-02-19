import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { imageTemplateService } from '../../services/imageTemplate.js'
import { ApiError } from '../../services/api.js'

export default function ImageTemplateEditPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [originalImagePrompt, setOriginalImagePrompt] = useState('')
  const [newImagePrompt, setNewImagePrompt] = useState('')
  const [removeWatermark, setRemoveWatermark] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    setFetching(true)
    imageTemplateService.getById(Number(id))
      .then(data => {
        const t = data.template
        setName(t.name)
        setDescription(t.description || '')
        setOriginalImagePrompt(t.original_image_prompt)
        setNewImagePrompt(t.new_image_prompt || '')
        setRemoveWatermark(Boolean(t.remove_watermark))
      })
      .catch(err => {
        setError(err instanceof ApiError ? err.message : '이미지 템플릿을 불러오지 못했습니다.')
      })
      .finally(() => setFetching(false))
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('템플릿명을 입력해주세요.')
      return
    }
    if (!originalImagePrompt.trim()) {
      setError('원본 이미지 처리 프롬프트를 입력해주세요.')
      return
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      original_image_prompt: originalImagePrompt.trim(),
      new_image_prompt: newImagePrompt.trim() || undefined,
      remove_watermark: removeWatermark,
    }

    setLoading(true)
    try {
      if (isEdit) {
        await imageTemplateService.update(Number(id), payload)
      } else {
        await imageTemplateService.create(payload)
      }
      navigate('/admin/image-templates')
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
          onClick={() => navigate('/admin/image-templates')}
          className="inline-flex items-center gap-1 text-sm text-gray-500 transition hover:text-gray-900"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          이미지 템플릿 목록
        </button>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          {isEdit ? '이미지 템플릿 수정' : '새 이미지 템플릿'}
        </h1>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 기본 정보 */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
          <h2 className="text-base font-semibold text-gray-900">기본 정보</h2>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              템플릿명 <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="예: 원본 유사 변환, 2D 일러스트, 색상 변환"
              className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm shadow-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">설명</label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="이 템플릿이 어떤 이미지 처리를 하는지 간략히 설명해주세요."
              className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm shadow-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>
        </div>

        {/* 원본 이미지 처리 프롬프트 */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">원본 이미지 처리 프롬프트</h2>
            <p className="mt-1 text-sm text-gray-500">기사에 포함된 원본 이미지를 가공할 때 이미지 AI에 전달할 프롬프트입니다.</p>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="originalImagePrompt" className="block text-sm font-medium text-gray-700">
                프롬프트 <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-gray-400">{originalImagePrompt.length}자</span>
            </div>
            <textarea
              id="originalImagePrompt"
              value={originalImagePrompt}
              onChange={e => setOriginalImagePrompt(e.target.value)}
              rows={6}
              placeholder="예: 이 이미지를 원본과 유사하되 완전히 새로운 이미지로 리드로잉해주세요. 구도와 색감은 유지하되 세부 표현을 변경해주세요."
              className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 font-mono text-sm shadow-sm transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <button
              type="button"
              role="switch"
              aria-checked={removeWatermark}
              onClick={() => setRemoveWatermark(prev => !prev)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                removeWatermark ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
                  removeWatermark ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <div>
              <p className="text-sm font-medium text-gray-700">워터마크 제거</p>
              <p className="text-xs text-gray-500">활성화 시 프롬프트에 워터마크 제거 지시가 자동으로 추가됩니다.</p>
            </div>
          </div>
        </div>

        {/* 신규 이미지 생성 프롬프트 */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">신규 이미지 생성 프롬프트</h2>
            <p className="mt-1 text-sm text-gray-500">이미지가 부족할 때 새로 생성할 이미지의 프롬프트입니다. (선택)</p>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="newImagePrompt" className="block text-sm font-medium text-gray-700">프롬프트</label>
              <span className="text-xs text-gray-400">{newImagePrompt.length}자</span>
            </div>
            <textarea
              id="newImagePrompt"
              value={newImagePrompt}
              onChange={e => setNewImagePrompt(e.target.value)}
              rows={6}
              placeholder="예: 기사 주제와 관련된 사실적인 스타일의 이미지를 생성해주세요. 밝고 깨끗한 톤으로 블로그에 적합한 이미지를 만들어주세요."
              className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 font-mono text-sm shadow-sm transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/image-templates')}
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
