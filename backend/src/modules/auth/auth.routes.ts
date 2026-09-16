import { Router } from 'express'
import { asyncHandler } from '../../middleware/errorHandler.ts'
import { authController } from './auth.controller.ts'

const router: Router = Router()

router.get('/login', asyncHandler(authController.login))
router.get('/callback', asyncHandler(authController.callback))
router.get('/logout', authController.logout)

export { router as authRouter }
