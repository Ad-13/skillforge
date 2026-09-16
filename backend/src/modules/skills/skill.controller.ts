import type { Request, Response } from 'express'
import { BadRequestError, UnauthorizedError } from '../../lib/errors.ts'
import { createSkillSchema, skillService } from './skill.service.ts'

export const skillController = {
  /** Cookie-authenticated: this application's own frontend. */
  async listMine(req: Request, res: Response): Promise<void> {
    const session = req.session
    if (!session) throw new UnauthorizedError()

    res.json({ skills: await skillService.listForUser(session.userId) })
  },

  async create(req: Request, res: Response): Promise<void> {
    const session = req.session
    if (!session) throw new UnauthorizedError()

    // Validation lives at the boundary. Everything past this line is typed
    // and trusted; everything before it is a string from the network.
    const parsed = createSkillSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new BadRequestError('Invalid skill payload', parsed.error.issues)
    }

    const skill = await skillService.create(session.userId, parsed.data)
    res.status(201).json({ skill })
  },

  async remove(req: Request, res: Response): Promise<void> {
    const session = req.session
    if (!session) throw new UnauthorizedError()

    // Express 5 types a route parameter as string | string[]; narrow it
    // before it reaches the service layer.
    const { id } = req.params
    if (typeof id !== 'string' || id.length === 0) {
      throw new BadRequestError('Missing skill id')
    }

    await skillService.deleteOwned(session.userId, id)
    res.status(204).end()
  },

  /**
   * Bearer-authenticated: the public API another service calls.
   *
   * The subject comes from a cryptographically verified token whose
   * audience matched this API — not from a query parameter, and not from
   * a cookie that a different site could have triggered.
   */
  async listForBearer(req: Request, res: Response): Promise<void> {
    const auth = req.auth
    if (!auth) throw new UnauthorizedError()

    res.json({
      sub: auth.sub,
      skills: await skillService.listForSub(auth.sub),
      servedBy: 'skillforge-api',
    })
  },
}
