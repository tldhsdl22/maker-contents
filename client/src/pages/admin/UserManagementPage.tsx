import { useState, useEffect, useCallback } from 'react'
import { adminUserService } from '../../services/auth.js'
import { ApiError } from '../../services/api.js'
import type { UserDetail } from '../../types/auth.js'

type Tab = 'pending' | 'all'

export default function UserManagementPage() {
  const [tab, setTab] = useState<Tab>('pending')
  const [pendingUsers, setPendingUsers] = useState<UserDetail[]>([])
  const [allUsers, setAllUsers] = useState<UserDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ text: '', type: '' as 'success' | 'error' | '' })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [pending, all] = await Promise.all([
        adminUserService.getPending(),
        adminUserService.getAll(),
      ])
      setPendingUsers(pending.users)
      setAllUsers(all.users)
    } catch (err) {
      showMessage(err instanceof ApiError ? err.message : '데이터를 불러오지 못했습니다.', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function showMessage(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  async function handleAction(action: () => Promise<{ message: string }>) {
    try {
      const res = await action()
      showMessage(res.message, 'success')
      fetchData()
    } catch (err) {
      showMessage(err instanceof ApiError ? err.message : '처리에 실패했습니다.', 'error')
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const statusLabel: Record<string, { text: string; color: string }> = {
    pending: { text: '대기', color: 'bg-yellow-100 text-yellow-700' },
    approved: { text: '승인', color: 'bg-green-100 text-green-700' },
    rejected: { text: '반려', color: 'bg-red-100 text-red-700' },
  }

  return (
    <div className="page-shell p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">사용자 관리</h1>

      {message.text && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
        }`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
        <button
          onClick={() => setTab('pending')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
            tab === 'pending' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          가입 대기 {pendingUsers.length > 0 && (
            <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs text-white">
              {pendingUsers.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('all')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
            tab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          전체 사용자
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : tab === 'pending' ? (
        <PendingTable users={pendingUsers} onApprove={(id, role) => handleAction(() => adminUserService.approve(id, role))} onReject={(id) => handleAction(() => adminUserService.reject(id))} formatDate={formatDate} />
      ) : (
        <AllUsersTable users={allUsers} onChangeRole={(id, role) => handleAction(() => adminUserService.changeRole(id, role))} onDeactivate={(id) => handleAction(() => adminUserService.deactivate(id))} formatDate={formatDate} statusLabel={statusLabel} />
      )}
    </div>
  )
}

function PendingTable({ users, onApprove, onReject, formatDate }: {
  users: UserDetail[]
  onApprove: (id: number, role: 'admin' | 'user') => void
  onReject: (id: number) => void
  formatDate: (d: string | null) => string
}) {
  if (users.length === 0) {
    return <p className="py-12 text-center text-sm text-gray-500">대기 중인 가입 신청이 없습니다.</p>
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="px-4 py-3 text-left font-medium text-gray-600">아이디</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">이름</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">신청일</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600">작업</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{user.username}</td>
              <td className="px-4 py-3 text-gray-600">{user.name}</td>
              <td className="px-4 py-3 text-gray-500">{formatDate(user.created_at)}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onApprove(user.id, 'user')}
                    className="btn-base btn-secondary btn-sm"
                  >
                    승인
                  </button>
                  <button
                    onClick={() => onApprove(user.id, 'admin')}
                    className="btn-base btn-primary btn-sm"
                  >
                    관리자 승인
                  </button>
                  <button
                    onClick={() => onReject(user.id)}
                    className="btn-base btn-ghost btn-sm text-red-600 hover:bg-red-50"
                  >
                    반려
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AllUsersTable({ users, onChangeRole, onDeactivate, formatDate, statusLabel }: {
  users: UserDetail[]
  onChangeRole: (id: number, role: 'admin' | 'user') => void
  onDeactivate: (id: number) => void
  formatDate: (d: string | null) => string
  statusLabel: Record<string, { text: string; color: string }>
}) {
  if (users.length === 0) {
    return <p className="py-12 text-center text-sm text-gray-500">등록된 사용자가 없습니다.</p>
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="px-4 py-3 text-left font-medium text-gray-600">아이디</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">이름</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">역할</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">상태</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">최종 로그인</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600">작업</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {users.map((user) => {
            const status = statusLabel[user.status] || { text: user.status, color: 'bg-gray-100 text-gray-600' }
            return (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{user.username}</td>
                <td className="px-4 py-3 text-gray-600">{user.name}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {user.role === 'admin' ? '관리자' : '사용자'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                    {status.text}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{formatDate(user.last_login_at)}</td>
                <td className="px-4 py-3 text-right">
                  {user.status === 'approved' && (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onChangeRole(user.id, user.role === 'admin' ? 'user' : 'admin')}
                        className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-200"
                      >
                        {user.role === 'admin' ? '사용자로' : '관리자로'}
                      </button>
                      <button
                        onClick={() => onDeactivate(user.id)}
                        className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100"
                      >
                        비활성화
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
