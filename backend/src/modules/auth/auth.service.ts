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

/** Refresh a minute early, so a request never races the expiry. */
const REFRESH_SKEW_MS = 60_000

export const authService = {
  /**
   * Prepare a login: three fresh secrets, each closing a specific attack.
   *
   * `state` proves the callback belongs to a flow we started (CSRF).
   * `nonce` proves the id_token was minted for this request (replay).
   * `codeVerifier` proves we are the party that asked for the code (PKCE) —
   * an intercepted code is useless without it.
   */
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

    // `offline_access` is what makes the provider return a refresh token.
    // Without it the session simply ends when the access token expires.
    url.searchParams.set('scope', 'openid profile email offline_access')

    // Addressing the token to a specific API is what makes it a verifiable
    // JWT rather than an opaque string, and what lets each service reject
    // tokens minted for somebody else.
    url.searchParams.set('audience', env.API_AUDIENCE)

    return {
      transaction: { state, nonce, codeVerifier },
      authorizationUrl: url.toString(),
    }
  },

  /**
   * Finish a login: exchange the one-time code for tokens, verify the
   * identity token, provision the local user row, and build the session.
   *
   * The exchange is server to server. The browser never holds a token and
   * the client secret never leaves this process.
   */
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

    // Signature, issuer, audience and expiry are all checked here. The
    // audience of an id_token is the client id: an identity token is
    // addressed to the application, never to an API.
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

    // `jwtVerify` knows nothing about nonce; that check belongs to us.
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

  /**
   * Exchange a refresh token for a fresh access token.
   *
   * Compare this with writing refresh tokens yourself: no generation, no
   * hashing, no storage table, no atomic rotation, no revocation endpoint.
   * What does remain ours is handling rotation — providers may return a new
   * refresh token, and dropping it would sign the user out on the next turn.
   */
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
      // A refused refresh token means the session is over — the user
      // revoked access, or the token was already rotated away.
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

  /** Verify a bearer token presented by another service. */
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
    // Clearing our own cookie is not enough: the session at the provider
    // would stay alive and the next sign-in would pass silently, which
    // reads to the user as "logout is broken".
    if (oidc.end_session_endpoint) {
      const url = new URL(oidc.end_session_endpoint)
      url.searchParams.set('client_id', env.OIDC_CLIENT_ID)
      url.searchParams.set('post_logout_redirect_uri', env.BASE_URL)
      return url.toString()
    }

    // Auth0 predates the standard endpoint and uses its own path.
    const url = new URL('/v2/logout', ISSUER)
    url.searchParams.set('client_id', env.OIDC_CLIENT_ID)
    url.searchParams.set('returnTo', env.BASE_URL)
    return url.toString()
  },
}

/**
 * Prefer the token's own `exp` claim over the `expires_in` field: the former
 * is what the resource server will actually enforce.
 */
const expiryOf = (tokens: TokenResponse): number => {
  try {
    const { exp } = decodeJwt(tokens.access_token)
    if (typeof exp === 'number') return exp * 1000
  } catch {
    // Opaque access token — fall through to expires_in.
  }
  return Date.now() + (tokens.expires_in ?? 3600) * 1000
}
