import type { Request, Response } from 'express'
import { UnauthorizedError } from '../../lib/errors.ts'
import { env } from '../../config/env.ts'
import { userService } from './user.service.ts'

export const userController = {
  async me(req: Request, res: Response): Promise<void> {
    const session = req.session
    if (!session) throw new UnauthorizedError()

    const user = await userService.getBySubOrThrow(session.sub)

    // The access and refresh tokens stay on the server. Only the profile
    // the interface needs crosses to the browser.
    res.json({ user, peerAppUrl: env.PEER_APP_URL ?? null })
  },

  async completeOnboarding(req: Request, res: Response): Promise<void> {
    const session = req.session
    if (!session) throw new UnauthorizedError()

    const user = await userService.completeOnboarding(session.userId)
    res.json({ user })
  },
}
