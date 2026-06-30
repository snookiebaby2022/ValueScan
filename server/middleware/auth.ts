import jwt from 'jsonwebtoken'
import type { Request, Response, NextFunction } from 'express'
import { db, type UserRow } from '../db.js'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}

export type AuthPayload = { userId: string; email: string; role: string }

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload
      userRow?: UserRow
    }
  }
}

export function signToken(user: UserRow) {
  return jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' })
}

export function authRequired(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Sign in required' })
    return
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as AuthPayload
    req.user = payload
    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.userId) as UserRow | undefined
    if (!userRow) {
      res.status(401).json({ error: 'User not found' })
      return
    }
    req.userRow = userRow
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' })
  }
}

export function sellerRequired(req: Request, res: Response, next: NextFunction) {
  authRequired(req, res, () => {
    if (req.userRow!.role !== 'seller' && req.userRow!.role !== 'admin') {
      res.status(403).json({ error: 'Seller account required' })
      return
    }
    next()
  })
}

export function adminRequired(req: Request, res: Response, next: NextFunction) {
  authRequired(req, res, () => {
    if (req.userRow!.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' })
      return
    }
    next()
  })
}

/** Attach user when a valid token is present; continue anonymously otherwise. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    next()
    return
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as AuthPayload
    req.user = payload
    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.userId) as UserRow | undefined
    if (userRow) req.userRow = userRow
  } catch {
    // ignore invalid token for optional auth
  }
  next()
}
