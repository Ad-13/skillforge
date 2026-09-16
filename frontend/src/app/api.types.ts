/** Response shapes shared between the API and this client. */

export interface CurrentUser {
  id: string
  sub: string
  email: string | null
  displayName: string | null
  pictureUrl: string | null
  onboarded: boolean
  createdAt: string
}

export interface MeResponse {
  user: CurrentUser
  peerAppUrl: string | null
}

export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'

export interface Skill {
  id: string
  name: string
  level: SkillLevel
  createdAt: string
}

export interface SkillsResponse {
  skills: Skill[]
}

export interface SkillResponse {
  skill: Skill
}
