import { Router } from 'express'
import type { Request, Response } from 'express'
import { asyncHandler } from '../../middleware/errorHandler.ts'
import { requireSession } from '../../middleware/requireSession.ts'
import { BadRequestError, UnauthorizedError } from '../../lib/errors.ts'
import { resourceService } from './resource.service.ts'
import {
  createResourceSchema,
  importNoteSchema,
  updateResourceSchema,
} from './resource.schemas.ts'

const resourceRouter: Router = Router({ mergeParams: true })

const readSlug = (req: Request): string => {
  const { slug } = req.params
  if (typeof slug !== 'string' || slug.length === 0) {
    throw new BadRequestError('Missing skill slug')
  }
  return slug
}

const readParam = (req: Request, name: string): string => {
  const value = req.params[name]
  if (typeof value !== 'string' || value.length === 0) {
    throw new BadRequestError(`Missing ${name}`)
  }
  return value
}

const sessionOf = (req: Request) => {
  const session = req.session
  if (!session) throw new UnauthorizedError()
  return session
}

resourceRouter.get(
  '/',
  requireSession,
  asyncHandler(async (req: Request, res: Response) => {
    const session = sessionOf(req)
    const resources = await resourceService.getForSkill(session.userId, readSlug(req))
    res.json({ resources })
  }),
)

resourceRouter.get(
  '/stages/:stageId',
  requireSession,
  asyncHandler(async (req: Request, res: Response) => {
    const session = sessionOf(req)
    const stage = await resourceService.getStage(
      session.userId,
      readSlug(req),
      readParam(req, 'stageId'),
    )
    res.json({ stage })
  }),
)

resourceRouter.get(
  '/steps/:stepId',
  requireSession,
  asyncHandler(async (req: Request, res: Response) => {
    const session = sessionOf(req)
    const step = await resourceService.getStep(
      session.userId,
      readSlug(req),
      readParam(req, 'stepId'),
    )
    res.json({ step })
  }),
)

resourceRouter.post(
  '/stages/:stageId',
  requireSession,
  asyncHandler(async (req: Request, res: Response) => {
    const session = sessionOf(req)
    const result = await resourceService.forgeForStage(
      session.userId,
      readSlug(req),
      readParam(req, 'stageId'),
    )
    res.status(201).json(result)
  }),
)

resourceRouter.post(
  '/steps/:stepId',
  requireSession,
  asyncHandler(async (req: Request, res: Response) => {
    const session = sessionOf(req)
    const result = await resourceService.forgeForStep(
      session.userId,
      readSlug(req),
      readParam(req, 'stepId'),
    )
    res.status(201).json(result)
  }),
)

resourceRouter.post(
  '/import',
  requireSession,
  asyncHandler(async (req: Request, res: Response) => {
    const session = sessionOf(req)
    const input = importNoteSchema.parse(req.body)
    const resource = await resourceService.importNote(session.userId, readSlug(req), input)
    res.status(201).json({ resource })
  }),
)

resourceRouter.post(
  '/',
  requireSession,
  asyncHandler(async (req: Request, res: Response) => {
    const session = sessionOf(req)
    const input = createResourceSchema.parse(req.body)
    const resource = await resourceService.create(session.userId, readSlug(req), input)
    res.status(201).json({ resource })
  }),
)

resourceRouter.patch(
  '/:resourceId',
  requireSession,
  asyncHandler(async (req: Request, res: Response) => {
    const session = sessionOf(req)
    const input = updateResourceSchema.parse(req.body)
    const resource = await resourceService.update(
      session.userId,
      readParam(req, 'resourceId'),
      input,
    )
    res.json({ resource })
  }),
)

resourceRouter.delete(
  '/:resourceId',
  requireSession,
  asyncHandler(async (req: Request, res: Response) => {
    const session = sessionOf(req)
    await resourceService.remove(session.userId, readParam(req, 'resourceId'))
    res.status(204).end()
  }),
)

export { resourceRouter }
