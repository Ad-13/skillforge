import { Router } from 'express'
import { asyncHandler } from '../../middleware/errorHandler.ts'
import { requireSession } from '../../middleware/requireSession.ts'
import { userController } from './user.controller.ts'

const router: Router = Router()

router.get('/me', requireSession, asyncHandler(userController.me))
router.post('/me/onboarding', requireSession, asyncHandler(userController.completeOnboarding))

export { router as userRouter }
