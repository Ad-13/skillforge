import type { RequestHandler } from 'express'
import { UnauthorizedError } from '../lib/errors.ts'
import { authService } from '../modules/auth/auth.service.ts'

export const requireBearer: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.get('authorization') ?? ''

    if (!header.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing bearer token')
    }

    req.auth = await authService.verifyAccessToken(header.slice(7))
    next()
  } catch (error) {
    next(error)
  }
}
