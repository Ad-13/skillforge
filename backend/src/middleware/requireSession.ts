import type { RequestHandler } from 'express'
import { UnauthorizedError } from '../lib/errors.ts'
import { readSession, writeSession } from '../lib/session.ts'
import { authService } from '../modules/auth/auth.service.ts'

/** Requires the encrypted session cookie. Used by our own frontend. */
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

/**
 * Same as above, and additionally guarantees a usable access token.
 *
 * Only routes that call another service need this — refreshing costs a
 * round trip to the provider, so it is not done on every request.
 */
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
      // No refresh token: the session simply ends here, and the frontend
      // sends the user through the provider again.
      throw new UnauthorizedError('Access token expired')
    }

    const refreshed = await authService.refresh(session.refreshToken)
    const updated = { ...session, ...refreshed }

    // The rotated refresh token must be persisted, or the next refresh
    // presents a token the provider has already invalidated.
    await writeSession(res, updated)

    req.session = updated
    next()
  } catch (error) {
    next(error)
  }
}
