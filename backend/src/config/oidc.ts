import { createRemoteJWKSet } from 'jose'
import { env } from './env.ts'

export interface OidcDocument {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  userinfo_endpoint: string
  jwks_uri: string
  end_session_endpoint?: string
}

/**
 * Every provider address comes from the discovery document rather than from
 * constants. Changing identity provider is then a change of environment
 * variables and nothing else — which is exactly how this project moved from
 * a self-hosted Keycloak to a managed provider without touching code.
 */
const loadDiscovery = async (): Promise<OidcDocument> => {
  const base = env.OIDC_ISSUER.endsWith('/') ? env.OIDC_ISSUER : `${env.OIDC_ISSUER}/`
  const url = new URL('.well-known/openid-configuration', base)

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(
      `OIDC discovery failed with ${response.status} at ${url.toString()}. ` +
        'Check OIDC_ISSUER and that the provider is reachable.',
    )
  }

  return (await response.json()) as OidcDocument
}

export const oidc = await loadDiscovery()

/**
 * Verify against the issuer the provider declares about itself, not against
 * our own environment variable: providers disagree over the trailing slash
 * and the comparison is character by character.
 */
export const ISSUER = oidc.issuer

/** Fetches and caches the provider's public keys, refetching after rotation. */
export const jwks = createRemoteJWKSet(new URL(oidc.jwks_uri))
