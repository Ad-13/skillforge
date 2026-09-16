import type { SessionData } from '../lib/session.ts'

declare global {
  namespace Express {
    interface Request {
      /** Present after `requireSession`. */
      session?: SessionData
      /** Present after `requireBearer`: the verified token subject. */
      auth?: { sub: string }
    }
  }
}

export {}
