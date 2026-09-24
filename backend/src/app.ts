import express, { type Express } from 'express'
import cookieParser from 'cookie-parser'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { env } from './config/env.ts'
import { errorHandler } from './middleware/errorHandler.ts'
import { authRouter } from './modules/auth/auth.routes.ts'
import { userRouter } from './modules/users/user.routes.ts'
import { skillRouter, skillPublicRouter } from './modules/skills/skill.routes.ts'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const clientDir = path.resolve(currentDir, '..', '..', 'frontend', 'dist', 'skillforge', 'browser')

export const createApp = (): Express => {
  const app = express()

  app.set('trust proxy', 1)
  app.disable('x-powered-by')

  app.use(express.json({ limit: '100kb' }))
  app.use(cookieParser())

  if (!env.isProduction) {
    const expectedHost = new URL(env.BASE_URL).host

    app.use((req, res, next) => {
      if (req.headers.host === undefined || req.headers.host === expectedHost) {
        next()
        return
      }
      res.redirect(307, `${env.BASE_URL}${req.originalUrl}`)
    })
  }

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'skillforge', env: env.NODE_ENV })
  })

  app.use('/auth', authRouter)
  app.use('/api/users', userRouter)
  app.use('/api/skills', skillRouter)

  app.use('/api/public/skills', skillPublicRouter)

  app.use(express.static(clientDir, { index: false }))

  app.use((req, res, next) => {
    if (req.method !== 'GET') {
      next()
      return
    }
    res.sendFile(path.join(clientDir, 'index.html'), (error) => {
      if (error) next()
    })
  })

  app.use(errorHandler)

  return app
}
