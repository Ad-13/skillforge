import 'dotenv/config'
import { z } from 'zod'

/**
 * Environment is validated once, at startup, against an explicit schema.
 *
 * The alternative — reading `process.env.FOO` where it is needed — fails at
 * the worst possible moment: halfway through a user's login, in production,
 * with an error that says `undefined`. Here a missing or malformed value
 * stops the process before it accepts a single request.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3002),

  /** Public origin of this service. No trailing slash: it is concatenated. */
  BASE_URL: z.url().refine((value) => !value.endsWith('/'), {
    message: 'BASE_URL must not end with a slash',
  }),

  /** Neon POOLED endpoint (hostname contains "-pooler"). Used at runtime. */
  DATABASE_URL: z.string().min(1),

  /**
   * Neon DIRECT endpoint (same hostname without "-pooler"). Used only by the
   * Prisma CLI — see prisma.config.ts for why migrations avoid the pooler.
   * The running server never opens this connection, so it is optional here.
   */
  DIRECT_URL: z.string().min(1).optional(),

  OIDC_ISSUER: z.url(),
  OIDC_CLIENT_ID: z.string().min(1),
  OIDC_CLIENT_SECRET: z.string().min(1),

  /** Identifier of the API the access token is addressed to (`aud`). */
  API_AUDIENCE: z.string().min(1),

  /** Key material for the encrypted session cookie. */
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),

  /** Peer application, used only for a link in the UI. */
  PEER_APP_URL: z.url().optional(),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n')
  throw new Error(`Invalid environment configuration:\n${issues}`)
}

export const env = Object.freeze({
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === 'production',
  redirectUri: `${parsed.data.BASE_URL}/auth/callback`,
})

export type Env = typeof env
