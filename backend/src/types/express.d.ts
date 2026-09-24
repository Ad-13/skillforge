import type { SessionData } from '../lib/session.ts'

declare global {
  namespace Express {
    interface Request {
      session?: SessionData
      auth?: { sub: string }
    }
  }
}

export {}
