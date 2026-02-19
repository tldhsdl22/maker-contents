import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { imageTemplateService } from '../../services/imageTemplate.js'
import { ApiError } from '../../services/api.js'
import type { ImageTemplate } from '../../types/imageTemplate.js'

export default function ImageTemplateManagementPage() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<ImageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await imageTemplateService.getAll()
      setTemplates(data.templates)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '이미지 템플릿 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  async function handleToggle(id: number) {
    try {
      const { template } = await imageTemplateService.toggle(id)
      setTemplates(prev => prev.map(t => t.id === id ? template : t))
    } catch (err) {
      alert(err instanceof ApiError ? err.message : '상태 변경에 실패했습니다.')
    }
  }

  async function handleDelete(template: ImageTemplate) {
    if (!confirm(`"${template.name}" 이미지 템플릿을 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.`)) return
    try {
      await imageTemplateService.delete(template.id)
      setTemplates(prev => prev.filter(t => t.id !== template.id))
    } catch (err) {
      alert(err instanceof ApiError ? err.message : '삭제에 실패했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="page-shell p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">이미지 템플릿 관리</h1>
          <p className="mt-1 text-sm text-gray-500">원고에 사용할 이미지 처리 방식을 관리합니다.</p>
        </div>
        <button
          onClick={() => navigate('/admin/image-templates/new')}
          className="btn-base btn-primary btn-md"
        >
          <PlusIcon className="h-4 w-4" />
          새 템플릿
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {templates.length === 0 ? (
        <EmptyState onAdd={() => navigate('/admin/image-templates/new')} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-500">템플릿명</th>
                <th className="px-6 py-3 font-medium text-gray-500">원본 처리 프롬프트</th>
                <th className="px-6 py-3 font-medium text-gray-500">워터마크 제거</th>
                <th className="px-6 py-3 font-medium text-gray-500">상태</th>
                <th className="px-6 py-3 font-medium text-gray-500">생성자</th>
                <th className="px-6 py-3 font-medium text-gray-500">수정일</th>
                <th className="px-6 py-3 font-medium text-gray-500">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {templates.map(template => (
                <TemplateRow
                  key={template.id}
                  template={template}
                  onEdit={() => navigate(`/admin/image-templates/${template.id}/edit`)}
                  onToggle={() => handleToggle(template.id)}
                  onDelete={() => handleDelete(template)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function TemplateRow({ template, onEdit, onToggle, onDelete }: {
  template: ImageTemplate
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  const updatedAt = new Date(template.updated_at).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'short', day: 'numeric',
  })

  return (
    <tr className="transition hover:bg-gray-50">
      <td className="px-6 py-4">
        <button onClick={onEdit} className="btn-link text-sm">
          {template.name}
        </button>
        {template.description && (
          <p className="mt-0.5 max-w-xs truncate text-xs text-gray-400">{template.description}</p>
        )}
      </td>
      <td className="max-w-[200px] truncate px-6 py-4 text-gray-500 font-mono text-xs">
        {template.original_image_prompt}
      </td>
      <td className="px-6 py-4">
        {template.remove_watermark ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
            <CheckIcon className="h-3.5 w-3.5" /> 사용
          </span>
        ) : (
          <span className="text-xs text-gray-400">미사용</span>
        )}
      </td>
      <td className="px-6 py-4">
        <button
          onClick={onToggle}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition ${
            template.is_active
              ? 'bg-green-50 text-green-700 hover:bg-green-100'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${template.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
          {template.is_active ? '활성' : '비활성'}
        </button>
      </td>
      <td className="px-6 py-4 text-gray-500">{template.creator_name}</td>
      <td className="px-6 py-4 text-gray-500">{updatedAt}</td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="btn-base btn-ghost btn-sm text-gray-400"
            title="수정"
          >
            <EditIcon className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="btn-base btn-ghost btn-sm text-gray-400 hover:bg-red-50 hover:text-red-600"
            title="삭제"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-16">
      <div className="rounded-full bg-gray-100 p-3">
        <ImageIcon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="mt-4 text-sm font-medium text-gray-900">등록된 이미지 템플릿이 없습니다</h3>
      <p className="mt-1 text-sm text-gray-500">새 템플릿을 추가하여 이미지 처리 방식을 정의하세요.</p>
      <button
        onClick={onAdd}
        className="btn-base btn-primary btn-md mt-4"
      >
        <PlusIcon className="h-4 w-4" />
        새 템플릿 추가
      </button>
    </div>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  )
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21zM8.25 8.625a1.125 1.125 0 100-2.25 1.125 1.125 0 000 2.25z" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}
