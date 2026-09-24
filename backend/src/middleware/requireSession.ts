import type { RequestHandler } from 'express'
import { UnauthorizedError } from '../lib/errors.ts'
import { readSession, writeSession } from '../lib/session.ts'
import { authService } from '../modules/auth/auth.service.ts'

export const requireSession: RequestHandler = async (req, _res, next) => {
  try {
    const session = await readSession(req)
    if (!session) throw new UnauthorizedError()
    req.session = session
    next()
  } catch (error) {
    next(error)
  }
}

export const requireFreshAccessToken: RequestHandler = async (req, res, next) => {
  try {
    const session = await readSession(req)
    if (!session) throw new UnauthorizedError()

    if (!authService.needsRefresh(session)) {
      req.session = session
      next()
      return
    }

    if (!session.refreshToken) {

      throw new UnauthorizedError('Access token expired')
    }

    const refreshed = await authService.refresh(session.refreshToken)
    const updated = { ...session, ...refreshed }

    await writeSession(res, updated)

    req.session = updated
    next()
  } catch (error) {
    next(error)
  }
}
