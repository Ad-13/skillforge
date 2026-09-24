import crypto from 'node:crypto'
import { prisma } from '../../lib/prisma.ts'
import type { GeneratedRoadmap } from '../ai/roadmap.generator.ts'

const withStages = {
  stages: {
    orderBy: { position: 'asc' as const },
    include: { steps: { orderBy: { position: 'asc' as const } } },
  },
}

export const roadmapRepository = {
  findByUserSkillId(userSkillId: string) {
    return prisma.learningRoadmap.findUnique({
      where: { userSkillId },
      include: withStages,
    })
  },

  findStep(stepId: string) {
    return prisma.learningStep.findUnique({
      where: { id: stepId },
      include: { stage: { include: { roadmap: { include: { userSkill: true } } } } },
    })
  },

  setStepCompletion(stepId: string, completedAt: Date | null) {
    return prisma.learningStep.update({
      where: { id: stepId },
      data: { completedAt },
    })
  },

  async replace(input: {
    userSkillId: string
    roadmap: GeneratedRoadmap
    language: 'EN' | 'RU' | 'DE'
    model: string
  }) {
    return prisma.$transaction(async (tx) => {
      const roadmap = await tx.learningRoadmap.upsert({
        where: { userSkillId: input.userSkillId },
        update: { generatedAt: new Date(), generatedBy: input.model, language: input.language },
        create: {
          userSkillId: input.userSkillId,
          generatedBy: input.model,
          language: input.language,
        },
      })

      await tx.learningStage.deleteMany({ where: { roadmapId: roadmap.id } })

      const stageRows = input.roadmap.stages.map((stage, index) => ({
        id: crypto.randomUUID(),
        roadmapId: roadmap.id,
        position: index,
        title: stage.title,
        rationale: stage.rationale,
      }))

      const stepRows = input.roadmap.stages.flatMap((stage, stageIndex) =>
        stage.steps.map((step, stepIndex) => ({
          id: crypto.randomUUID(),
          stageId: stageRows[stageIndex]!.id,
          position: stepIndex,
          title: step.title,
          summary: step.summary,
          completedAt: null,
        })),
      )

      await tx.learningStage.createMany({ data: stageRows })
      await tx.learningStep.createMany({ data: stepRows })

      return tx.learningRoadmap.findUniqueOrThrow({
        where: { id: roadmap.id },
        include: withStages,
      })
    })
  },
}
