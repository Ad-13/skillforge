import { Router } from 'express'
import { asyncHandler } from '../../middleware/errorHandler.ts'
import { requireSession } from '../../middleware/requireSession.ts'
import { requireBearer } from '../../middleware/requireBearer.ts'
import { skillController } from './skill.controller.ts'

/** Routes for our own browser: authenticated by the session cookie. */
const internalRouter: Router = Router()

internalRouter.get('/', requireSession, asyncHandler(skillController.listMine))
internalRouter.post('/', requireSession, asyncHandler(skillController.create))
internalRouter.delete('/:id', requireSession, asyncHandler(skillController.remove))

/** Routes for other services: authenticated by an audience-scoped token. */
const publicRouter: Router = Router()

publicRouter.get('/', requireBearer, asyncHandler(skillController.listForBearer))

export { internalRouter as skillRouter, publicRouter as skillPublicRouter }
