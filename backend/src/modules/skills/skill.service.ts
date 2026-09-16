import { z } from 'zod'
import { skillRepository } from './skill.repository.ts'
import { ForbiddenError, NotFoundError } from '../../lib/errors.ts'
import type { Skill } from '../../generated/prisma/client.ts'

export const skillLevelSchema = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])

export const createSkillSchema = z.object({
  name: z.string().trim().min(1).max(60),
  level: skillLevelSchema.default('BEGINNER'),
})

export type CreateSkillInput = z.infer<typeof createSkillSchema>

export interface PublicSkill {
  id: string
  name: string
  level: string
  createdAt: string
}

const toPublicSkill = (skill: Skill): PublicSkill => ({
  id: skill.id,
  name: skill.name,
  level: skill.level,
  createdAt: skill.createdAt.toISOString(),
})

export const skillService = {
  async listForUser(userId: string): Promise<PublicSkill[]> {
    const skills = await skillRepository.listByUserId(userId)
    return skills.map(toPublicSkill)
  },

  /**
   * Used by the machine-facing endpoint, where we hold a verified `sub`
   * from a bearer token but have not looked up the local row.
   */
  async listForSub(sub: string): Promise<PublicSkill[]> {
    const skills = await skillRepository.listByAuthSub(sub)
    return skills.map(toPublicSkill)
  },

  async create(userId: string, input: CreateSkillInput): Promise<PublicSkill> {
    const skill = await skillRepository.create(userId, input.name, input.level)
    return toPublicSkill(skill)
  },

  /**
   * Ownership is checked in the service, not in the route. A route that
   * forgets the check is a silent data leak; a service that owns the rule
   * can only be wrong in one place.
   */
  async deleteOwned(userId: string, skillId: string): Promise<void> {
    const skill = await skillRepository.findById(skillId)
    if (!skill) throw new NotFoundError('Skill not found')
    if (skill.userId !== userId) throw new ForbiddenError('Not your skill')
    await skillRepository.delete(skillId)
  },
}
