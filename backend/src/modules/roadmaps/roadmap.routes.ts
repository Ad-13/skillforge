import { Router } from 'express'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middleware/errorHandler.ts'
import { requireSession } from '../../middleware/requireSession.ts'
import { BadRequestError, UnauthorizedError } from '../../lib/errors.ts'
import { roadmapService } from './roadmap.service.ts'

const roadmapRouter: Router = Router({ mergeParams: true })

const completionSchema = z.object({ complete: z.boolean() })

const readSlug = (req: Request): string => {
  const { slug } = req.params
  if (typeof slug !== 'string' || slug.length === 0) throw new BadRequestError('Missing skill slug')
  return slug
}

const sessionOf = (req: Request) => {
  const session = req.session
  if (!session) throw new UnauthorizedError()
  return session
}

roadmapRouter.get(
  '/',
  requireSession,
  asyncHandler(async (req: Request, res: Response) => {
    const session = sessionOf(req)
    const roadmap = await roadmapService.getForSkill(session.userId, readSlug(req))

    res.json({ roadmap })
  }),
)

roadmapRouter.post(
  '/',
  requireSession,
  asyncHandler(async (req: Request, res: Response) => {
    const session = sessionOf(req)
    const result = await roadmapService.forge(session.userId, readSlug(req))
    res.status(201).json(result)
  }),
)

roadmapRouter.patch(
  '/steps/:stepId',
  requireSession,
  asyncHandler(async (req: Request, res: Response) => {
    const session = sessionOf(req)

    const { stepId } = req.params
    if (typeof stepId !== 'string' || stepId.length === 0) {
      throw new BadRequestError('Missing step id')
    }

    const parsed = completionSchema.safeParse(req.body)
    if (!parsed.success) throw new BadRequestError('Invalid payload', parsed.error.issues)

    const roadmap = await roadmapService.setStepCompletion(
      session.userId,
      stepId,
      parsed.data.complete,
    )

    res.json({ roadmap })
  }),
)

export { roadmapRouter }
