import { Router } from 'express'
import * as userQuery from '../../db/queries/users.js'

const router = Router()

// GET /api/admin/users - 전체 사용자 목록
router.get('/', async (_req, res) => {
  try {
    const users = await userQuery.findAllExceptPassword()
    res.json({ users })
  } catch (err) {
    console.error('[admin/users] list', err)
    res.status(500).json({ error: '서버 오류가 발생했습니다.' })
  }
})

// GET /api/admin/users/pending - 가입 대기 목록
router.get('/pending', async (_req, res) => {
  try {
    const users = await userQuery.findPending()
    res.json({ users })
  } catch (err) {
    console.error('[admin/users] pending', err)
    res.status(500).json({ error: '서버 오류가 발생했습니다.' })
  }
})

// PATCH /api/admin/users/:id/approve - 가입 승인
router.patch('/:id/approve', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { role } = req.body

    const user = await userQuery.findById(id)
    if (!user) {
      res.status(404).json({ error: '사용자를 찾을 수 없습니다.' })
      return
    }
    if (user.status !== 'pending') {
      res.status(400).json({ error: '대기 상태인 사용자만 승인할 수 있습니다.' })
      return
    }

    await userQuery.approve(id, role || 'user')
    res.json({ message: '승인되었습니다.' })
  } catch (err) {
    console.error('[admin/users] approve', err)
    res.status(500).json({ error: '서버 오류가 발생했습니다.' })
  }
})

// PATCH /api/admin/users/:id/reject - 가입 반려
router.patch('/:id/reject', async (req, res) => {
  try {
    const id = Number(req.params.id)

    const user = await userQuery.findById(id)
    if (!user) {
      res.status(404).json({ error: '사용자를 찾을 수 없습니다.' })
      return
    }
    if (user.status !== 'pending') {
      res.status(400).json({ error: '대기 상태인 사용자만 반려할 수 있습니다.' })
      return
    }

    await userQuery.reject(id)
    res.json({ message: '반려되었습니다.' })
  } catch (err) {
    console.error('[admin/users] reject', err)
    res.status(500).json({ error: '서버 오류가 발생했습니다.' })
  }
})

// PATCH /api/admin/users/:id/role - 역할 변경
router.patch('/:id/role', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { role } = req.body

    if (role !== 'admin' && role !== 'user') {
      res.status(400).json({ error: '유효하지 않은 역할입니다.' })
      return
    }

    const user = await userQuery.findById(id)
    if (!user) {
      res.status(404).json({ error: '사용자를 찾을 수 없습니다.' })
      return
    }

    // 관리자 → 일반으로 변경 시: 관리자가 1명이면 불가
    if (user.role === 'admin' && role === 'user') {
      const adminCount = await userQuery.countAdmins()
      if (adminCount <= 1) {
        res.status(400).json({ error: '관리자가 1명뿐이므로 역할을 변경할 수 없습니다.' })
        return
      }
    }

    await userQuery.updateRole(id, role)
    res.json({ message: '역할이 변경되었습니다.' })
  } catch (err) {
    console.error('[admin/users] role', err)
    res.status(500).json({ error: '서버 오류가 발생했습니다.' })
  }
})

// PATCH /api/admin/users/:id/deactivate - 계정 비활성화
router.patch('/:id/deactivate', async (req, res) => {
  try {
    const id = Number(req.params.id)

    const user = await userQuery.findById(id)
    if (!user) {
      res.status(404).json({ error: '사용자를 찾을 수 없습니다.' })
      return
    }

    if (user.role === 'admin') {
      const adminCount = await userQuery.countAdmins()
      if (adminCount <= 1) {
        res.status(400).json({ error: '관리자가 1명뿐이므로 비활성화할 수 없습니다.' })
        return
      }
    }

    // 자기 자신 비활성화 방지
    if (id === req.user?.id) {
      res.status(400).json({ error: '자기 자신을 비활성화할 수 없습니다.' })
      return
    }

    await userQuery.deactivate(id)
    res.json({ message: '비활성화 되었습니다.' })
  } catch (err) {
    console.error('[admin/users] deactivate', err)
    res.status(500).json({ error: '서버 오류가 발생했습니다.' })
  }
})

export default router
