export const HANDOVER_PATH = '/roadmap'

export interface Handover {
  skills: string[]
  source: string | null
}

export const parseHandover = (search: string): Handover => {
  const params = new URLSearchParams(search)
  const raw = params.get('skills') ?? ''

  const skills = raw
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name.length > 0)
    .slice(0, 20)

  return { skills, source: params.get('source') }
}

export const isHandoverUrl = (pathname: string, search: string): boolean => {
  if (pathname === HANDOVER_PATH) return true
  return new URLSearchParams(search).get('source') !== null
}

export const loginUrlFor = (pathname: string, search: string, hash: string): string => {
  const returnTo = `${pathname}${search}${hash}`
  return `/auth/login?returnTo=${encodeURIComponent(returnTo)}`
}
