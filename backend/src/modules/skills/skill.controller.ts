import type { Request, Response } from 'express'
import { BadRequestError, UnauthorizedError } from '../../lib/errors.ts'
import {
  createSkillSchema,
  importSkillsSchema,
  updateSkillSchema,
  skillService,
} from './skill.service.ts'

const readSlug = (req: Request): string => {
  const { slug } = req.params
  if (typeof slug !== 'string' || slug.length === 0) {
    throw new BadRequestError('Missing skill slug')
  }
  return slug
}

export const skillController = {
  async listMine(req: Request, res: Response): Promise<void> {
    const session = req.session
    if (!session) throw new UnauthorizedError()

    res.json({ skills: await skillService.listForUser(session.userId) })
  },

  async getOne(req: Request, res: Response): Promise<void> {
    const session = req.session
    if (!session) throw new UnauthorizedError()

    res.json({ skill: await skillService.getBySlugOrThrow(session.userId, readSlug(req)) })
  },

  async create(req: Request, res: Response): Promise<void> {
    const session = req.session
    if (!session) throw new UnauthorizedError()

    const parsed = createSkillSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new BadRequestError('Invalid skill payload', parsed.error.issues)
    }

    const result = await skillService.create(session.userId, parsed.data)

    if (result.status === 'suggestion') {
      res.status(200).json(result)
      return
    }

    res.status(201).json(result)
  },

  async importFromPeer(req: Request, res: Response): Promise<void> {
    const session = req.session
    if (!session) throw new UnauthorizedError()

    const parsed = importSkillsSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new BadRequestError('Invalid import payload', parsed.error.issues)
    }

    const skills = await skillService.importFromPeer(session.userId, parsed.data)
    res.status(200).json({ skills })
  },

  async update(req: Request, res: Response): Promise<void> {
    const session = req.session
    if (!session) throw new UnauthorizedError()

    const parsed = updateSkillSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new BadRequestError('Invalid update payload', parsed.error.issues)
    }

    const skill = await skillService.setLanguage(session.userId, readSlug(req), parsed.data)
    res.json({ skill })
  },

  async remove(req: Request, res: Response): Promise<void> {
    const session = req.session
    if (!session) throw new UnauthorizedError()

    await skillService.deleteOwned(session.userId, readSlug(req))
    res.status(204).end()
  },

  async listForPeer(req: Request, res: Response): Promise<void> {
    const auth = req.auth
    if (!auth) throw new UnauthorizedError()

    res.json({
      sub: auth.sub,
      skills: await skillService.listForPeer(auth.sub),
      servedBy: 'skillforge-api',
    })
  },
}
