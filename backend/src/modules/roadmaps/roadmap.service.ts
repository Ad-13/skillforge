import { roadmapRepository } from './roadmap.repository.ts'
import { mapRepository } from '../maps/map.repository.ts'
import { skillRepository } from '../skills/skill.repository.ts'
import { generateRoadmap } from '../ai/roadmap.generator.ts'
import { findMissingTopics } from '../ai/completeness.ts'
import { mapService } from '../maps/map.service.ts'
import { summariseProgress } from '../../lib/progress.ts'
import { NotFoundError, BadRequestError } from '../../lib/errors.ts'

export interface RoadmapStepView {
  id: string
  position: number
  title: string
  summary: string | null
  completedAt: string | null
  complete: boolean
}

export interface RoadmapStageView {
  id: string
  position: number
  title: string
  rationale: string | null
  complete: boolean
  steps: RoadmapStepView[]
}

export interface RoadmapView {
  generatedAt: string
  generatedBy: string | null
  language: string
  stages: RoadmapStageView[]
  progress: number
  totalSteps: number
  completedSteps: number
  highestCompletedStage: string | null
  lastWorkedStage: string | null
}

interface StepRow {
  id: string
  position: number
  title: string
  summary: string | null
  completedAt: Date | null
}

interface StageRow {
  id: string
  position: number
  title: string
  rationale: string | null
  steps: StepRow[]
}

const toView = (roadmap: {
  generatedAt: Date
  generatedBy: string | null
  language: string
  stages: StageRow[]
}): RoadmapView => {
  const summary = summariseProgress(roadmap.stages)

  return {
    generatedAt: roadmap.generatedAt.toISOString(),
    generatedBy: roadmap.generatedBy,
    language: roadmap.language,
    stages: roadmap.stages.map((stage) => ({
      id: stage.id,
      position: stage.position,
      title: stage.title,
      rationale: stage.rationale,

      complete: stage.steps.length > 0 && stage.steps.every((s) => s.completedAt !== null),
      steps: stage.steps.map((step) => ({
        id: step.id,
        position: step.position,
        title: step.title,
        summary: step.summary,
        completedAt: step.completedAt?.toISOString() ?? null,
        complete: step.completedAt !== null,
      })),
    })),
    progress: summary.progress,
    totalSteps: summary.totalSteps,
    completedSteps: summary.completedSteps,
    highestCompletedStage: summary.highestCompletedStage,
    lastWorkedStage: summary.lastWorkedStage,
  }
}

export interface ForgeResult {
  roadmap: RoadmapView
  added: string[]
}

export const roadmapService = {
  async getForSkill(userId: string, slug: string): Promise<RoadmapView | null> {
    const skill = await skillRepository.findBySlug(userId, slug)
    if (!skill) throw new NotFoundError('Skill not found')

    const roadmap = await roadmapRepository.findByUserSkillId(skill.id)
    return roadmap ? toView(roadmap) : null
  },

  async forge(userId: string, slug: string): Promise<ForgeResult> {
    const skill = await skillRepository.findBySlug(userId, slug)
    if (!skill) throw new NotFoundError('Skill not found')

    let map = await mapRepository.findByLens(skill.id, 'ANATOMY')

    if (!map) {
      await mapService.generate(userId, slug, 'ANATOMY')
      map = await mapRepository.findByLens(skill.id, 'ANATOMY')
    }

    if (!map || map.nodes.length <= 1) {
      throw new BadRequestError(
        'The anatomy map for this skill is empty, so there is nothing to plan yet.',
      )
    }

    const topics = map.nodes
      .filter((node) => node.parentId !== null)
      .map((node) => ({ label: node.label, summary: node.summary, slug: node.slug }))

    const rootNode = map.nodes.find((node) => node.parentId === null)

    const gaps = await findMissingTopics({
      skillName: skill.name,
      skillKind: skill.kind,
      knownLabels: topics.map((t) => t.label),
      knownSlugs: map.nodes.map((node) => node.slug),
      language: skill.learningLanguage,
    })

    if (gaps.missing.length > 0 && rootNode) {
      const existing = await mapRepository.childrenOf(rootNode.id)

      await mapRepository.saveExpansion({
        skillMapId: map.id,
        parentId: rootNode.id,
        parentAncestors: [],
        parentSlug: rootNode.slug,
        children: gaps.missing.map((item) => ({
          label: item.label,
          slug: item.slug,
          summary: item.summary,
          relation: 'CORE' as const,
        })),
        startPosition: existing.nextPosition,
      })
    }

    const { roadmap, model } = await generateRoadmap({
      skillName: skill.name,
      skillKind: skill.kind,
      topics: [...topics, ...gaps.missing.map((g) => ({ label: g.label, summary: g.summary }))],
      language: skill.learningLanguage,
    })

    const saved = await roadmapRepository.replace({
      userSkillId: skill.id,
      roadmap,
      language: skill.learningLanguage,
      model,
    })

    return { roadmap: toView(saved), added: gaps.missing.map((g) => g.label) }
  },

  async setStepCompletion(
    userId: string,
    stepId: string,
    complete: boolean,
  ): Promise<RoadmapView> {
    const step = await roadmapRepository.findStep(stepId)
    if (!step) throw new NotFoundError('Step not found')

    if (step.stage.roadmap.userSkill.userId !== userId) {
      throw new NotFoundError('Step not found')
    }

    await roadmapRepository.setStepCompletion(stepId, complete ? new Date() : null)

    const roadmap = await roadmapRepository.findByUserSkillId(step.stage.roadmap.userSkillId)
    if (!roadmap) throw new NotFoundError('Roadmap not found')

    return toView(roadmap)
  },
}
