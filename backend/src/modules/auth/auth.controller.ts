import type { Request, Response } from 'express'
import { env } from '../../config/env.ts'
import { BadRequestError, UnauthorizedError } from '../../lib/errors.ts'
import {
  clearSession,
  clearTransaction,
  readTransaction,
  writeSession,
  writeTransaction,
} from '../../lib/session.ts'
import { sanitiseReturnTo } from '../../lib/return-to.ts'
import { authService } from './auth.service.ts'

export const authController = {
  async login(req: Request, res: Response): Promise<void> {
    const { transaction, authorizationUrl } = authService.beginLogin()
    const returnTo = sanitiseReturnTo(req.query['returnTo'])

    await writeTransaction(res, returnTo ? { ...transaction, returnTo } : transaction)

    res.redirect(authorizationUrl)
  },

  async callback(req: Request, res: Response): Promise<void> {
    const { code, state, error, error_description: description } = req.query

    if (typeof error === 'string') {
      throw new BadRequestError(`Provider returned an error: ${error}`, description)
    }

    const transaction = await readTransaction(req)
    clearTransaction(res)

    if (!transaction || typeof code !== 'string' || transaction.state !== state) {
      throw new UnauthorizedError('State mismatch — the login did not start here')
    }

    const session = await authService.completeLogin(code, transaction)
    await writeSession(res, session)

    const returnTo = sanitiseReturnTo(transaction.returnTo)
    res.redirect(returnTo ? `${env.BASE_URL}${returnTo}` : env.BASE_URL)
  },

  logout(_req: Request, res: Response): void {
    clearSession(res)
    res.redirect(authService.buildLogoutUrl())
  },
}
