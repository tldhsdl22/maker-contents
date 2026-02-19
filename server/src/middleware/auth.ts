import type { Request, Response, NextFunction } from 'express'
import jwt, { type SignOptions } from 'jsonwebtoken'
import { config } from '../config/index.js'
import { findById } from '../db/queries/users.js'

export interface JwtPayload {
  userId: number
  role: 'admin' | 'user'
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number
        username: string
        name: string
        role: 'admin' | 'user'
      }
    }
  }
}

export function generateToken(payload: JwtPayload): string {
  const expiresIn = config.jwt.expiresIn as SignOptions['expiresIn']
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn,
  })
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: '인증이 필요합니다.' })
    return
  }

  const token = header.slice(7)

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload
    const user = await findById(decoded.userId)

    if (!user || user.status !== 'approved') {
      res.status(401).json({ error: '유효하지 않은 계정입니다.' })
      return
    }

    req.user = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    }
    next()
  } catch {
    res.status(401).json({ error: '토큰이 만료되었거나 유효하지 않습니다.' })
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: '관리자 권한이 필요합니다.' })
    return
  }
  next()
}
