import crypto from 'node:crypto'
import { EncryptJWT, jwtDecrypt } from 'jose'
import type { CookieOptions, Request, Response } from 'express'
import { env } from '../config/env.ts'

/**
 * What the server remembers about a signed-in visitor.
 *
 * It lives inside an encrypted cookie rather than in server memory or a
 * session table. The process therefore holds no session state at all: it
 * survives restarts, scales to several instances, and needs no Redis.
 * The trade-off is that a session cannot be revoked server-side, which is
 * why the lifetime is hours rather than months.
 */
export interface SessionData {
  /** `sub` claim — the stable user identifier issued by the provider. */
  sub: string
  /** Primary key of the matching row in our own database. */
  userId: string
  email: string | null
  displayName: string | null
  accessToken: string
  refreshToken: string | null
  /** Unix milliseconds. Used to decide when to refresh. */
  accessTokenExpiresAt: number
  [key: string]: unknown
}

export interface AuthTransaction {
  state: string
  nonce: string
  codeVerifier: string
  [key: string]: unknown
}

export const SESSION_COOKIE = 'sid'
export const TRANSACTION_COOKIE = 'auth_tx'

export const SESSION_TTL_SECONDS = 12 * 60 * 60
export const TRANSACTION_TTL_SECONDS = 5 * 60

const cookieBase: CookieOptions = {
  httpOnly: true, // unreachable from JavaScript, so XSS cannot read it
  sameSite: 'lax', // the OAuth callback is a top-level GET, so lax suffices
  secure: env.isProduction, // HTTPS only outside local development
  path: '/',
}

/**
 * A256GCM needs exactly 32 bytes of key material. Hashing the configured
 * secret guarantees the right length whatever the operator typed.
 */
const key = crypto.createHash('sha256').update(env.SESSION_SECRET).digest()

/**
 * Encrypted, not merely signed. The payload carries the user's access and
 * refresh tokens, which must stay unreadable to the browser — a signed JWT
 * would be readable by anyone holding the cookie.
 */
const seal = (payload: Record<string, unknown>, ttlSeconds: number): Promise<string> =>
  new EncryptJWT(payload)
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .encrypt(key)

const unseal = async <T>(value: string | undefined): Promise<T | null> => {
  if (!value) return null
  try {
    const { payload } = await jwtDecrypt(value, key)
    return payload as T
  } catch {
    // Tampered, encrypted with a different key, or expired. All three mean
    // the same thing to the caller: there is no session.
    return null
  }
}

export const readSession = (req: Request): Promise<SessionData | null> =>
  unseal<SessionData>(req.cookies?.[SESSION_COOKIE] as string | undefined)

export const writeSession = async (res: Response, session: SessionData): Promise<void> => {
  const value = await seal(session, SESSION_TTL_SECONDS)
  res.cookie(SESSION_COOKIE, value, { ...cookieBase, maxAge: SESSION_TTL_SECONDS * 1000 })
}

export const clearSession = (res: Response): void => {
  res.clearCookie(SESSION_COOKIE, cookieBase)
}

export const readTransaction = (req: Request): Promise<AuthTransaction | null> =>
  unseal<AuthTransaction>(req.cookies?.[TRANSACTION_COOKIE] as string | undefined)

export const writeTransaction = async (
  res: Response,
  transaction: AuthTransaction,
): Promise<void> => {
  const value = await seal(transaction, TRANSACTION_TTL_SECONDS)
  res.cookie(TRANSACTION_COOKIE, value, {
    ...cookieBase,
    maxAge: TRANSACTION_TTL_SECONDS * 1000,
  })
}

export const clearTransaction = (res: Response): void => {
  res.clearCookie(TRANSACTION_COOKIE, cookieBase)
}
