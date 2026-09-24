import crypto from 'node:crypto'
import { EncryptJWT, jwtDecrypt } from 'jose'
import type { CookieOptions, Request, Response } from 'express'
import { env } from '../config/env.ts'

export interface SessionData {
  sub: string
  userId: string
  email: string | null
  displayName: string | null
  accessToken: string
  refreshToken: string | null
  accessTokenExpiresAt: number
  [key: string]: unknown
}

export interface AuthTransaction {
  state: string
  nonce: string
  codeVerifier: string
  returnTo?: string
  [key: string]: unknown
}

export const SESSION_COOKIE = 'sid'
export const TRANSACTION_COOKIE = 'auth_tx'

export const SESSION_TTL_SECONDS = 12 * 60 * 60
export const TRANSACTION_TTL_SECONDS = 5 * 60

const cookieBase: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.isProduction,
  path: '/',
}

const key = crypto.createHash('sha256').update(env.SESSION_SECRET).digest()

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
