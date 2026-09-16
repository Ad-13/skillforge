import { prisma } from '../../lib/prisma.ts'
import type { Skill, SkillLevel } from '../../generated/prisma/client.ts'

export const skillRepository = {
  listByUserId(userId: string): Promise<Skill[]> {
    return prisma.skill.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    })
  },

  listByAuthSub(authSub: string): Promise<Skill[]> {
    return prisma.skill.findMany({
      where: { user: { authSub } },
      orderBy: { name: 'asc' },
    })
  },

  create(userId: string, name: string, level: SkillLevel): Promise<Skill> {
    return prisma.skill.create({ data: { userId, name, level } })
  },

  findById(id: string): Promise<Skill | null> {
    return prisma.skill.findUnique({ where: { id } })
  },

  delete(id: string): Promise<Skill> {
    return prisma.skill.delete({ where: { id } })
  },
}
