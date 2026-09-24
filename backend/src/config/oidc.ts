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

export const ISSUER = oidc.issuer

export const jwks = createRemoteJWKSet(new URL(oidc.jwks_uri))
