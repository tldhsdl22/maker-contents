import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { authService } from '../services/auth.js'
import { ApiError } from '../services/api.js'
import BrandLogo from '../components/BrandLogo.js'

export default function RegisterPage() {
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  // 아이디 중복 실시간 확인
  useEffect(() => {
    if (!username || !/^[a-z0-9]{4,20}$/.test(username)) {
      setUsernameStatus('idle')
      return
    }

    setUsernameStatus('checking')
    const timer = setTimeout(async () => {
      try {
        const res = await authService.checkUsername(username)
        setUsernameStatus(res.available ? 'available' : 'taken')
      } catch {
        setUsernameStatus('idle')
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [username])

  const passwordValid = password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password)
  const passwordMatch = password === passwordConfirm
  const usernameValid = /^[a-z0-9]{4,20}$/.test(username)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!usernameValid) {
      setError('아이디는 영문 소문자와 숫자 조합으로 4~20자여야 합니다.')
      return
    }
    if (usernameStatus === 'taken') {
      setError('이미 사용 중인 아이디입니다.')
      return
    }
    if (!passwordValid) {
      setError('비밀번호는 8자 이상, 영문과 숫자를 반드시 포함해야 합니다.')
      return
    }
    if (!passwordMatch) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    setSubmitting(true)

    try {
      const res = await authService.register({ username, name, password })

      // 첫 번째 가입자인 경우 자동 로그인
      if (res.token && res.user) {
        login(res.token, res.user)
        navigate('/')
      } else {
        setSuccess(res.message)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '가입 신청에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="page-shell flex min-h-screen items-center justify-center px-4">
        <div className="surface-card hover-lift w-full max-w-sm p-8 text-center">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <BrandLogo variant="F" size="md" />
          </div>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">가입 신청 완료</h2>
          <p className="mb-6 text-sm text-gray-600">{success}</p>
          <Link
            to="/login"
            className="btn-base btn-primary btn-md"
          >
            로그인 페이지로
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo variant="F" size="lg" />
          <p className="mt-1 text-sm text-gray-500">AI 콘텐츠 생산 시스템</p>
        </div>

        <form onSubmit={handleSubmit} className="surface-card hover-lift p-8">
          <h2 className="mb-6 text-xl font-semibold text-gray-900">회원가입</h2>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="username" className="mb-1 block text-sm font-medium text-gray-700">
              아이디
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className="w-full rounded-lg border border-gray-200 bg-white/80 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              placeholder="영문 소문자, 숫자 4~20자"
              required
              autoFocus
            />
            {username && (
              <p className={`mt-1 text-xs ${
                usernameStatus === 'available' ? 'text-green-600' :
                usernameStatus === 'taken' ? 'text-red-600' :
                !usernameValid ? 'text-red-600' :
                'text-gray-400'
              }`}>
                {!usernameValid ? '영문 소문자와 숫자 조합 4~20자' :
                 usernameStatus === 'checking' ? '확인 중...' :
                 usernameStatus === 'available' ? '사용 가능한 아이디입니다.' :
                 usernameStatus === 'taken' ? '이미 사용 중인 아이디입니다.' : ''}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
              이름
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white/80 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              placeholder="이름을 입력하세요"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white/80 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              placeholder="8자 이상, 영문+숫자 포함"
              required
            />
            {password && !passwordValid && (
              <p className="mt-1 text-xs text-red-600">8자 이상, 영문과 숫자를 포함해야 합니다.</p>
            )}
          </div>

          <div className="mb-6">
            <label htmlFor="passwordConfirm" className="mb-1 block text-sm font-medium text-gray-700">
              비밀번호 확인
            </label>
            <input
              id="passwordConfirm"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white/80 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              placeholder="비밀번호를 다시 입력하세요"
              required
            />
            {passwordConfirm && !passwordMatch && (
              <p className="mt-1 text-xs text-red-600">비밀번호가 일치하지 않습니다.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-base btn-primary btn-lg w-full disabled:opacity-50"
          >
            {submitting ? '처리 중...' : '가입 신청'}
          </button>

          <p className="mt-4 text-center text-sm text-gray-500">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="btn-link">
              로그인
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
