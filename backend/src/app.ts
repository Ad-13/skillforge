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

/**
 * Angular's application builder writes to dist/<project>/browser. Serving it
 * from this same process is what keeps the browser on a single origin: the
 * session cookie stays first-party, and CORS never enters the picture.
 */
const clientDir = path.resolve(currentDir, '..', '..', 'frontend', 'dist', 'skillforge', 'browser')

export const createApp = (): Express => {
  const app = express()

  // Behind Render's TLS termination the process only ever sees plain HTTP.
  // Without trusting the proxy, `secure` cookies are silently dropped.
  app.set('trust proxy', 1)
  app.disable('x-powered-by')

  app.use(express.json({ limit: '100kb' }))
  app.use(cookieParser())

  // Development-only host guard.
  //
  // Locally this service must be reached at the host recorded in BASE_URL
  // (skillforge.localhost), never at plain "localhost". Cookies are bound to a
  // host: a sign-in started on the wrong one sets its cookie there, the
  // provider returns the browser to the BASE_URL host, the cookie is not sent,
  // and the callback fails with a state error that hides the real cause.
  //
  // Production is skipped on purpose — there the public host comes from the
  // platform, and comparing it with BASE_URL could loop behind a proxy.
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

  // The machine-facing surface lives on its own path so the two kinds of
  // authentication never share a route.
  app.use('/api/public/skills', skillPublicRouter)

  app.use(express.static(clientDir, { index: false }))

  // Single-page-app fallback. Express 5 moved to path-to-regexp v8, where
  // `app.get('*')` throws at startup; a final middleware is version-proof.
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