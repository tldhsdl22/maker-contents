import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { promptService } from '../../services/prompt.js'
import { ApiError } from '../../services/api.js'
import type { Prompt } from '../../types/prompt.js'

export default function PromptManagementPage() {
  const navigate = useNavigate()
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchPrompts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await promptService.getAll()
      setPrompts(data.prompts)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '프롬프트 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPrompts() }, [fetchPrompts])

  async function handleToggle(id: number) {
    try {
      const { prompt } = await promptService.toggle(id)
      setPrompts(prev => prev.map(p => p.id === id ? prompt : p))
    } catch (err) {
      alert(err instanceof ApiError ? err.message : '상태 변경에 실패했습니다.')
    }
  }

  async function handleDelete(prompt: Prompt) {
    if (!confirm(`"${prompt.name}" 프롬프트를 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.`)) return
    try {
      await promptService.delete(prompt.id)
      setPrompts(prev => prev.filter(p => p.id !== prompt.id))
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
          <h1 className="text-2xl font-bold text-gray-900">프롬프트 관리</h1>
          <p className="mt-1 text-sm text-gray-500">원고 생성에 사용할 프롬프트 템플릿을 관리합니다.</p>
        </div>
        <button
          onClick={() => navigate('/admin/prompts/new')}
          className="btn-base btn-primary btn-md"
        >
          <PlusIcon className="h-4 w-4" />
          새 프롬프트
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {prompts.length === 0 ? (
        <EmptyState onAdd={() => navigate('/admin/prompts/new')} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-500">프롬프트명</th>
                <th className="px-6 py-3 font-medium text-gray-500">설명</th>
                <th className="px-6 py-3 font-medium text-gray-500">상태</th>
                <th className="px-6 py-3 font-medium text-gray-500">생성자</th>
                <th className="px-6 py-3 font-medium text-gray-500">수정일</th>
                <th className="px-6 py-3 font-medium text-gray-500">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {prompts.map(prompt => (
                <PromptRow
                  key={prompt.id}
                  prompt={prompt}
                  onEdit={() => navigate(`/admin/prompts/${prompt.id}/edit`)}
                  onToggle={() => handleToggle(prompt.id)}
                  onDelete={() => handleDelete(prompt)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function PromptRow({ prompt, onEdit, onToggle, onDelete }: {
  prompt: Prompt
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  const updatedAt = new Date(prompt.updated_at).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'short', day: 'numeric',
  })

  return (
    <tr className="transition hover:bg-gray-50">
      <td className="px-6 py-4">
        <button onClick={onEdit} className="btn-link text-sm">
          {prompt.name}
        </button>
      </td>
      <td className="max-w-xs truncate px-6 py-4 text-gray-500">
        {prompt.description || '—'}
      </td>
      <td className="px-6 py-4">
        <button
          onClick={onToggle}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition ${
            prompt.is_active
              ? 'bg-green-50 text-green-700 hover:bg-green-100'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${prompt.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
          {prompt.is_active ? '활성' : '비활성'}
        </button>
      </td>
      <td className="px-6 py-4 text-gray-500">{prompt.creator_name}</td>
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
        <PromptIcon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="mt-4 text-sm font-medium text-gray-900">등록된 프롬프트가 없습니다</h3>
      <p className="mt-1 text-sm text-gray-500">새 프롬프트를 추가하여 원고 생성에 활용하세요.</p>
      <button
        onClick={onAdd}
        className="btn-base btn-primary btn-md mt-4"
      >
        <PlusIcon className="h-4 w-4" />
        새 프롬프트 추가
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

function PromptIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  )
}
