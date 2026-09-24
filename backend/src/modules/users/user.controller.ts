import type { Request, Response } from 'express'
import { UnauthorizedError } from '../../lib/errors.ts'
import { clearSession } from '../../lib/session.ts'
import { env } from '../../config/env.ts'
import { userService } from './user.service.ts'

export const userController = {
  async me(req: Request, res: Response): Promise<void> {
    const session = req.session
    if (!session) throw new UnauthorizedError()

    const user = await userService.getBySub(session.sub)

    if (!user) {
      clearSession(res)
      throw new UnauthorizedError('Your session refers to an account that no longer exists.')
    }

    res.json({ user, peerAppUrl: env.PEER_APP_URL ?? null })
  },

  async completeOnboarding(req: Request, res: Response): Promise<void> {
    const session = req.session
    if (!session) throw new UnauthorizedError()

    const user = await userService.completeOnboarding(session.userId)
    res.json({ user })
  },
}
