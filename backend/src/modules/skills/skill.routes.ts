import { Router } from 'express'
import { asyncHandler } from '../../middleware/errorHandler.ts'
import { requireSession } from '../../middleware/requireSession.ts'
import { requireBearer } from '../../middleware/requireBearer.ts'
import { skillController } from './skill.controller.ts'

/**
 * Routes for our own browser: authenticated by the session cookie.
 *
 * Note that skills are addressed by slug rather than by id. A slug is unique
 * per user, so the lookup key already contains the owner — a request cannot
 * name someone else's row, and there is no ownership check to forget.
 */
const internalRouter: Router = Router()

internalRouter.get('/', requireSession, asyncHandler(skillController.listMine))
internalRouter.post('/', requireSession, asyncHandler(skillController.create))

// Placed before '/:slug' on purpose: Express matches in order, and a literal
// path registered after a parameter would be swallowed by it.
internalRouter.post('/import', requireSession, asyncHandler(skillController.importFromPeer))

internalRouter.get('/:slug', requireSession, asyncHandler(skillController.getOne))
internalRouter.patch('/:slug', requireSession, asyncHandler(skillController.update))
internalRouter.delete('/:slug', requireSession, asyncHandler(skillController.remove))

/** Routes for other services: authenticated by an audience-scoped token. */
const publicRouter: Router = Router()

publicRouter.get('/', requireBearer, asyncHandler(skillController.listForPeer))

export { internalRouter as skillRouter, publicRouter as skillPublicRouter }
