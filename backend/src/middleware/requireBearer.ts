import type { RequestHandler } from 'express'
import { UnauthorizedError } from '../lib/errors.ts'
import { authService } from '../modules/auth/auth.service.ts'

/**
 * Requires a bearer token addressed to this API. Used by the machine-facing
 * endpoints that another service calls on a user's behalf.
 *
 * Kept deliberately separate from `requireSession`: one route accepting both
 * a cookie and a bearer token erases the boundary between "my own browser"
 * and "another service", and that boundary is the point of the design.
 */
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
