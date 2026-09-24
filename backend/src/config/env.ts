import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3002),

  BASE_URL: z.url().refine((value) => !value.endsWith('/'), {
    message: 'BASE_URL must not end with a slash',
  }),

  DATABASE_URL: z.string().min(1),

  DIRECT_URL: z.string().min(1).optional(),

  OIDC_ISSUER: z.url(),
  OIDC_CLIENT_ID: z.string().min(1),
  OIDC_CLIENT_SECRET: z.string().min(1),

  API_AUDIENCE: z.string().min(1),

  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),

  PEER_APP_URL: z.url().optional(),

  AI_BASE_URL: z.url().default('https://api.groq.com/openai/v1'),
  AI_API_KEY: z.string().min(1),
  AI_MODEL: z.string().min(1).default('openai/gpt-oss-120b'),
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
