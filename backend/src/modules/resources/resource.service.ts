import { resourceRepository } from './resource.repository.ts'
import { skillRepository, type UserSkillWithRoadmap } from '../skills/skill.repository.ts'
import { generateStageResources, generateStepResources } from '../ai/resources.generator.ts'
import { normaliseMarkdown, stripLeadingH1, titleFromMarkdown } from '../../lib/markdown.ts'
import { NotFoundError, BadRequestError } from '../../lib/errors.ts'
import type {
  CreateResourceInput,
  ImportNoteInput,
  UpdateResourceInput,
} from './resource.schemas.ts'

export interface ResourceView {
  id: string
  kind: string
  title: string
  url: string | null
  searchQuery: string | null
  sourceType: string | null
  content: string | null
  origin: string
  createdAt: string
  updatedAt: string
}

export interface ResourceStepView {
  id: string
  position: number
  title: string
  summary: string | null
  complete: boolean
  resources: ResourceView[]
}

export interface StepWorkspaceView {
  skillName: string
  skillSlug: string
  stage: { id: string; position: number; title: string; rationale: string | null }
  step: { id: string; position: number; title: string; summary: string | null; complete: boolean }
  previousStepId: string | null
  nextStepId: string | null
  links: ResourceView[]
  notes: ResourceView[]
}

export interface ResourceStageView {
  id: string
  position: number
  title: string
  rationale: string | null
  covered: number
  steps: ResourceStepView[]
}

export interface ResourcesView {
  hasRoadmap: boolean
  stages: ResourceStageView[]
  general: ResourceView[]
  total: number
}

interface ResourceRow {
  id: string
  stepId: string | null
  kind: string
  title: string
  url: string | null
  searchQuery: string | null
  sourceType: string | null
  content: string | null
  origin: string
  createdAt: Date
  updatedAt: Date
}

const toView = (row: ResourceRow): ResourceView => ({
  id: row.id,
  kind: row.kind,
  title: row.title,
  url: row.url,
  searchQuery: row.searchQuery,
  sourceType: row.sourceType,
  content: row.content,
  origin: row.origin,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
})

const buildView = (skill: UserSkillWithRoadmap, rows: readonly ResourceRow[]): ResourcesView => {
  const byStep = new Map<string, ResourceView[]>()
  const general: ResourceView[] = []

  for (const row of rows) {
    if (row.stepId === null) {
      general.push(toView(row))
      continue
    }
    const list = byStep.get(row.stepId)
    if (list) list.push(toView(row))
    else byStep.set(row.stepId, [toView(row)])
  }

  const stages = (skill.roadmap?.stages ?? []).map((stage) => {
    const steps = stage.steps.map((step) => ({
      id: step.id,
      position: step.position,
      title: step.title,
      summary: step.summary,
      complete: step.completedAt !== null,
      resources: byStep.get(step.id) ?? [],
    }))

    return {
      id: stage.id,
      position: stage.position,
      title: stage.title,
      rationale: stage.rationale,
      covered: steps.filter((step) => step.resources.length > 0).length,
      steps,
    }
  })

  return { hasRoadmap: skill.roadmap !== null, stages, general, total: rows.length }
}

export const resourceService = {
  async getForSkill(userId: string, slug: string): Promise<ResourcesView> {
    const skill = await skillRepository.findBySlug(userId, slug)
    if (!skill) throw new NotFoundError('Skill not found')

    const rows = await resourceRepository.listForSkill(skill.id)
    return buildView(skill, rows as ResourceRow[])
  },

  async forgeForStage(
    userId: string,
    slug: string,
    stageId: string,
  ): Promise<{ resources: ResourcesView; added: number }> {
    const skill = await skillRepository.findBySlug(userId, slug)
    if (!skill) throw new NotFoundError('Skill not found')

    const stage = skill.roadmap?.stages.find((candidate) => candidate.id === stageId)
    if (!stage) throw new NotFoundError('Stage not found')

    if (stage.steps.length === 0) {
      throw new BadRequestError('This stage has no steps to find resources for.')
    }

    const { resources } = await generateStageResources({
      skillName: skill.name,
      stageTitle: stage.title,
      stageRationale: stage.rationale,
      steps: stage.steps.map((step) => ({ title: step.title, summary: step.summary })),
      language: skill.learningLanguage,
    })

    const byStep = new Map<string, (typeof resources.steps)[number]['resources']>()

    for (const entry of resources.steps) {
      const step = stage.steps[entry.stepIndex]
      if (!step) continue
      if (byStep.has(step.id)) continue
      if (entry.resources.length === 0) continue
      byStep.set(step.id, entry.resources)
    }

    const rows = await resourceRepository.replaceForSteps({
      userSkillId: skill.id,
      stepIds: stage.steps.map((step) => step.id),
      language: skill.learningLanguage,
      byStep,
    })

    const added = [...byStep.values()].reduce((total, list) => total + list.length, 0)

    return { resources: buildView(skill, rows as ResourceRow[]), added }
  },

  async getStep(userId: string, slug: string, stepId: string): Promise<StepWorkspaceView> {
    const skill = await skillRepository.findBySlug(userId, slug)
    if (!skill) throw new NotFoundError('Skill not found')

    const stages = skill.roadmap?.stages ?? []
    const stage = stages.find((candidate) => candidate.steps.some((step) => step.id === stepId))
    const step = stage?.steps.find((candidate) => candidate.id === stepId)
    if (!stage || !step) throw new NotFoundError('Step not found')

    const rows = (await resourceRepository.listForStep(stepId)) as ResourceRow[]

    const flat = stages.flatMap((one) => one.steps)
    const index = flat.findIndex((candidate) => candidate.id === stepId)

    return {
      skillName: skill.name,
      skillSlug: skill.slug,
      stage: {
        id: stage.id,
        position: stage.position,
        title: stage.title,
        rationale: stage.rationale,
      },
      step: {
        id: step.id,
        position: step.position,
        title: step.title,
        summary: step.summary,
        complete: step.completedAt !== null,
      },
      previousStepId: index > 0 ? (flat[index - 1]?.id ?? null) : null,
      nextStepId: index >= 0 && index < flat.length - 1 ? (flat[index + 1]?.id ?? null) : null,
      links: rows.filter((row) => row.kind === 'LINK').map(toView),
      notes: rows.filter((row) => row.kind === 'NOTE').map(toView),
    }
  },

  async getStage(userId: string, slug: string, stageId: string): Promise<ResourceStageView> {
    const view = await this.getForSkill(userId, slug)
    const stage = view.stages.find((candidate) => candidate.id === stageId)
    if (!stage) throw new NotFoundError('Stage not found')
    return stage
  },

  async forgeForStep(
    userId: string,
    slug: string,
    stepId: string,
  ): Promise<{ step: StepWorkspaceView; added: number }> {
    const skill = await skillRepository.findBySlug(userId, slug)
    if (!skill) throw new NotFoundError('Skill not found')

    const stages = skill.roadmap?.stages ?? []
    const stage = stages.find((candidate) => candidate.steps.some((step) => step.id === stepId))
    const step = stage?.steps.find((candidate) => candidate.id === stepId)
    if (!stage || !step) throw new NotFoundError('Step not found')

    const { resources } = await generateStepResources({
      skillName: skill.name,
      stageTitle: stage.title,
      stepTitle: step.title,
      stepSummary: step.summary,
      siblingTitles: stage.steps
        .filter((candidate) => candidate.id !== stepId)
        .map((candidate) => candidate.title),
      language: skill.learningLanguage,
    })

    await resourceRepository.replaceForSteps({
      userSkillId: skill.id,
      stepIds: [stepId],
      language: skill.learningLanguage,
      byStep: new Map([[stepId, resources]]),
    })

    return { step: await this.getStep(userId, slug, stepId), added: resources.length }
  },

  async create(userId: string, slug: string, input: CreateResourceInput): Promise<ResourceView> {
    const skill = await skillRepository.findBySlug(userId, slug)
    if (!skill) throw new NotFoundError('Skill not found')

    if (input.stepId !== null) this.assertStepBelongs(skill, input.stepId)

    const row = await resourceRepository.create({
      userSkillId: skill.id,
      stepId: input.stepId,
      kind: input.kind,
      title: input.title,
      url: input.kind === 'LINK' ? input.url : null,
      searchQuery: null,
      sourceType: input.kind === 'LINK' ? input.sourceType : null,
      content: input.kind === 'NOTE' ? normaliseMarkdown(input.content) : null,
      language: skill.learningLanguage,
    })

    return toView(row as ResourceRow)
  },

  async importNote(userId: string, slug: string, input: ImportNoteInput): Promise<ResourceView> {
    const skill = await skillRepository.findBySlug(userId, slug)
    if (!skill) throw new NotFoundError('Skill not found')

    if (input.stepId !== null) this.assertStepBelongs(skill, input.stepId)

    const title = input.title ?? titleFromMarkdown(input.content, input.filename)
    const normalised = normaliseMarkdown(input.content)
    const body = stripLeadingH1(normalised, title)

    if (body.trim().length === 0) {
      throw new BadRequestError('That file has a title and nothing else in it.')
    }

    const row = await resourceRepository.create({
      userSkillId: skill.id,
      stepId: input.stepId,
      kind: 'NOTE',
      title,
      url: null,
      searchQuery: null,
      sourceType: null,
      content: body,
      language: skill.learningLanguage,
    })

    return toView(row as ResourceRow)
  },

  async update(
    userId: string,
    resourceId: string,
    input: UpdateResourceInput,
  ): Promise<ResourceView> {
    const resource = await resourceRepository.findOwned(resourceId)
    if (!resource) throw new NotFoundError('Resource not found')
    if (resource.userSkill.userId !== userId) throw new NotFoundError('Resource not found')

    if (input.content !== undefined && resource.kind !== 'NOTE') {
      throw new BadRequestError('Only a note has a body to edit.')
    }
    if (input.url !== undefined && resource.kind !== 'LINK') {
      throw new BadRequestError('Only a link has an address to edit.')
    }

    const row = await resourceRepository.update(resourceId, {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.url !== undefined ? { url: input.url } : {}),
      ...(input.sourceType !== undefined ? { sourceType: input.sourceType } : {}),
      ...(input.content !== undefined ? { content: normaliseMarkdown(input.content) } : {}),
    })

    return toView(row as ResourceRow)
  },

  assertStepBelongs(skill: UserSkillWithRoadmap, stepId: string): void {
    const found = (skill.roadmap?.stages ?? []).some((stage) =>
      stage.steps.some((step) => step.id === stepId),
    )
    if (!found) throw new NotFoundError('Step not found')
  },

  async remove(userId: string, resourceId: string): Promise<void> {
    const resource = await resourceRepository.findOwned(resourceId)
    if (!resource) throw new NotFoundError('Resource not found')
    if (resource.userSkill.userId !== userId) throw new NotFoundError('Resource not found')
    await resourceRepository.deleteById(resourceId)
  },
}
