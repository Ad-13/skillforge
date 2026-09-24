import crypto from 'node:crypto'
import { jwtVerify, decodeJwt } from 'jose'
import { env } from '../../config/env.ts'
import { ISSUER, jwks, oidc } from '../../config/oidc.ts'
import { UnauthorizedError, UpstreamError } from '../../lib/errors.ts'
import type { AuthTransaction, SessionData } from '../../lib/session.ts'
import { userService } from '../users/user.service.ts'

interface TokenResponse {
  access_token: string
  id_token: string
  refresh_token?: string
  expires_in?: number
  token_type: string
}

const randomString = (): string => crypto.randomBytes(32).toString('base64url')

const challengeFrom = (verifier: string): string =>
  crypto.createHash('sha256').update(verifier).digest('base64url')

const REFRESH_SKEW_MS = 60_000

export const authService = {
  beginLogin(): { transaction: AuthTransaction; authorizationUrl: string } {
    const state = randomString()
    const nonce = randomString()
    const codeVerifier = randomString()

    const url = new URL(oidc.authorization_endpoint)
    url.searchParams.set('client_id', env.OIDC_CLIENT_ID)
    url.searchParams.set('redirect_uri', env.redirectUri)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('state', state)
    url.searchParams.set('nonce', nonce)
    url.searchParams.set('code_challenge', challengeFrom(codeVerifier))
    url.searchParams.set('code_challenge_method', 'S256')

    url.searchParams.set('scope', 'openid profile email offline_access')

    url.searchParams.set('audience', env.API_AUDIENCE)

    return {
      transaction: { state, nonce, codeVerifier },
      authorizationUrl: url.toString(),
    }
  },

  async completeLogin(code: string, transaction: AuthTransaction): Promise<SessionData> {
    const response = await fetch(oidc.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: env.redirectUri,
        client_id: env.OIDC_CLIENT_ID,
        client_secret: env.OIDC_CLIENT_SECRET,
        code_verifier: transaction.codeVerifier,
      }),
    })

    if (!response.ok) {
      throw new UpstreamError('Token exchange failed', await response.text())
    }

    const tokens = (await response.json()) as TokenResponse

    let claims: Record<string, unknown>
    try {
      const verified = await jwtVerify(tokens.id_token, jwks, {
        issuer: ISSUER,
        audience: env.OIDC_CLIENT_ID,
      })
      claims = verified.payload as Record<string, unknown>
    } catch (error) {
      throw new UnauthorizedError(
        `Invalid id_token: ${error instanceof Error ? error.message : 'unknown'}`,
      )
    }

    if (claims.nonce !== transaction.nonce) {
      throw new UnauthorizedError('Nonce mismatch')
    }

    const sub = String(claims.sub)
    const email = typeof claims.email === 'string' ? claims.email : null
    const displayName =
      (typeof claims.name === 'string' && claims.name) ||
      (typeof claims.nickname === 'string' && claims.nickname) ||
      email

    const user = await userService.provisionFromIdentity({
      authSub: sub,
      email,
      displayName,
      pictureUrl: typeof claims.picture === 'string' ? claims.picture : null,
    })

    return {
      sub,
      userId: user.id,
      email,
      displayName,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      accessTokenExpiresAt: expiryOf(tokens),
    }
  },

  async refresh(refreshToken: string): Promise<Pick<SessionData, 'accessToken' | 'refreshToken' | 'accessTokenExpiresAt'>> {
    const response = await fetch(oidc.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: env.OIDC_CLIENT_ID,
        client_secret: env.OIDC_CLIENT_SECRET,
      }),
    })

    if (!response.ok) {

      throw new UnauthorizedError('Refresh token rejected')
    }

    const tokens = (await response.json()) as TokenResponse

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? refreshToken,
      accessTokenExpiresAt: expiryOf(tokens),
    }
  },

  needsRefresh(session: SessionData): boolean {
    return Date.now() >= session.accessTokenExpiresAt - REFRESH_SKEW_MS
  },

  async verifyAccessToken(token: string): Promise<{ sub: string }> {
    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer: ISSUER,
        audience: env.API_AUDIENCE,
      })
      return { sub: String(payload.sub) }
    } catch (error) {
      throw new UnauthorizedError(
        `Invalid access token: ${error instanceof Error ? error.message : 'unknown'}`,
      )
    }
  },

  buildLogoutUrl(): string {

    if (oidc.end_session_endpoint) {
      const url = new URL(oidc.end_session_endpoint)
      url.searchParams.set('client_id', env.OIDC_CLIENT_ID)
      url.searchParams.set('post_logout_redirect_uri', env.BASE_URL)
      return url.toString()
    }

    const url = new URL('/v2/logout', ISSUER)
    url.searchParams.set('client_id', env.OIDC_CLIENT_ID)
    url.searchParams.set('returnTo', env.BASE_URL)
    return url.toString()
  },
}

const expiryOf = (tokens: TokenResponse): number => {
  try {
    const { exp } = decodeJwt(tokens.access_token)
    if (typeof exp === 'number') return exp * 1000
  } catch {

  }
  return Date.now() + (tokens.expires_in ?? 3600) * 1000
}
