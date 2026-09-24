import crypto from 'node:crypto'
import { prisma } from '../../lib/prisma.ts'
import type { GeneratedResource } from '../ai/resources.generator.ts'

export const resourceRepository = {
  listForSkill(userSkillId: string) {
    return prisma.resource.findMany({
      where: { userSkillId },
      orderBy: [{ stepId: 'asc' }, { createdAt: 'asc' }],
    })
  },

  listForStep(stepId: string) {
    return prisma.resource.findMany({ where: { stepId }, orderBy: [{ createdAt: 'asc' }] })
  },

  create(data: {
    userSkillId: string
    stepId: string | null
    kind: 'LINK' | 'NOTE'
    title: string
    url: string | null
    searchQuery: string | null
    sourceType: 'DOCS' | 'ARTICLE' | 'VIDEO' | 'REPO' | 'COURSE' | null
    content: string | null
    language: 'EN' | 'RU' | 'DE'
  }) {
    return prisma.resource.create({ data: { ...data, origin: 'USER' } })
  },

  update(
    resourceId: string,
    data: {
      title?: string
      url?: string | null
      sourceType?: 'DOCS' | 'ARTICLE' | 'VIDEO' | 'REPO' | 'COURSE'
      content?: string
    },
  ) {
    return prisma.resource.update({ where: { id: resourceId }, data })
  },

  findOwned(resourceId: string) {
    return prisma.resource.findUnique({
      where: { id: resourceId },
      include: { userSkill: { select: { userId: true, slug: true } } },
    })
  },

  deleteById(resourceId: string) {
    return prisma.resource.delete({ where: { id: resourceId } })
  },

  async replaceForSteps(input: {
    userSkillId: string
    stepIds: readonly string[]
    language: 'EN' | 'RU' | 'DE'
    byStep: ReadonlyMap<string, readonly GeneratedResource[]>
  }) {
    const rows = [...input.byStep.entries()].flatMap(([stepId, resources]) =>
      resources.map((resource) => ({
        id: crypto.randomUUID(),
        userSkillId: input.userSkillId,
        stepId,
        kind: 'LINK' as const,
        title: resource.title,
        url: resource.url,
        searchQuery: resource.searchQuery,
        sourceType: resource.sourceType,
        content: null,
        language: input.language,
        origin: 'AI' as const,
      })),
    )

    return prisma.$transaction(async (tx) => {
      await tx.resource.deleteMany({
        where: {
          userSkillId: input.userSkillId,
          stepId: { in: [...input.stepIds] },
          origin: 'AI',
        },
      })

      if (rows.length > 0) await tx.resource.createMany({ data: rows })

      return tx.resource.findMany({
        where: { userSkillId: input.userSkillId },
        orderBy: [{ stepId: 'asc' }, { createdAt: 'asc' }],
      })
    })
  },
}
