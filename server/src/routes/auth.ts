import { Router } from 'express'
import bcrypt from 'bcrypt'
import * as userQuery from '../db/queries/users.js'
import { authenticate, generateToken } from '../middleware/auth.js'

const router = Router()

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, name, password } = req.body

    if (!username || !name || !password) {
      res.status(400).json({ error: '모든 필드를 입력해 주세요.' })
      return
    }

    if (!/^[a-z0-9]{4,20}$/.test(username)) {
      res.status(400).json({ error: '아이디는 영문 소문자와 숫자 조합으로 4~20자여야 합니다.' })
      return
    }

    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      res.status(400).json({ error: '비밀번호는 8자 이상, 영문과 숫자를 반드시 포함해야 합니다.' })
      return
    }

    const existing = await userQuery.findByUsername(username)
    if (existing) {
      res.status(409).json({ error: '이미 사용 중인 아이디입니다.' })
      return
    }

    const hashed = await bcrypt.hash(password, 10)
    const totalUsers = await userQuery.countAll()

    // 첫 번째 가입자는 자동 관리자 + 즉시 승인
    const isFirstUser = totalUsers === 0

    const userId = await userQuery.create({
      username,
      name,
      password: hashed,
      role: isFirstUser ? 'admin' : 'user',
      status: isFirstUser ? 'approved' : 'pending',
    })

    if (isFirstUser) {
      const token = generateToken({ userId, role: 'admin' })
      res.status(201).json({
        message: '첫 번째 사용자로 관리자 계정이 생성되었습니다.',
        token,
        user: { id: userId, username, name, role: 'admin' },
      })
    } else {
      res.status(201).json({
        message: '관리자 승인 후 이용 가능합니다.',
      })
    }
  } catch (err) {
    console.error('[auth/register]', err)
    res.status(500).json({ error: '서버 오류가 발생했습니다.' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      res.status(400).json({ error: '아이디와 비밀번호를 입력해 주세요.' })
      return
    }

    const user = await userQuery.findByUsername(username)

    if (!user) {
      res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' })
      return
    }

    if (user.status === 'pending') {
      res.status(403).json({ error: '관리자 승인 대기 중입니다.' })
      return
    }

    if (user.status === 'rejected') {
      res.status(403).json({ error: '가입이 반려된 계정입니다.' })
      return
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' })
      return
    }

    await userQuery.updateLastLogin(user.id)
    const token = generateToken({ userId: user.id, role: user.role })

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    })
  } catch (err) {
    console.error('[auth/login]', err)
    res.status(500).json({ error: '서버 오류가 발생했습니다.' })
  }
})

// GET /api/auth/me - 현재 로그인된 사용자 정보
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user })
})

// POST /api/auth/logout (클라이언트에서 토큰 삭제로 처리, 형식적 엔드포인트)
router.post('/logout', (_req, res) => {
  res.json({ message: '로그아웃 되었습니다.' })
})

// GET /api/auth/check-username/:username - 아이디 중복 확인
router.get('/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params
    const existing = await userQuery.findByUsername(username)
    res.json({ available: !existing })
  } catch (err) {
    console.error('[auth/check-username]', err)
    res.status(500).json({ error: '서버 오류가 발생했습니다.' })
  }
})

export default router
