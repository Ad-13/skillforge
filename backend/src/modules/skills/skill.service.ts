import { z } from 'zod'
import { skillRepository, type UserSkillWithRoadmap } from './skill.repository.ts'
import { NotFoundError } from '../../lib/errors.ts'
import { toSlugOrThrow } from '../../lib/slug.ts'
import { summariseProgress, type ProgressStage } from '../../lib/progress.ts'

// ---------------------------------------------------------------------------
// Input schemas — the boundary between "a string from the network" and
// "a value the rest of the code may trust".
// ---------------------------------------------------------------------------

export const learningLanguageSchema = z.enum(['EN', 'RU', 'DE'])

export const createSkillSchema = z.object({
  name: z.string().trim().min(1).max(80),
})

export const importSkillsSchema = z.object({
  /**
   * Capped at twenty. A job analysis that reports fifty missing skills is a
   * bug in the analysis, and turning it into fifty dashboard cards would make
   * the dashboard useless rather than helpful.
   */
  skills: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
})

export const updateSkillSchema = z.object({
  learningLanguage: learningLanguageSchema,
})

export type CreateSkillInput = z.infer<typeof createSkillSchema>
export type ImportSkillsInput = z.infer<typeof importSkillsSchema>
export type UpdateSkillInput = z.infer<typeof updateSkillSchema>

// ---------------------------------------------------------------------------
// Output shapes — deliberately narrower than the rows behind them.
// ---------------------------------------------------------------------------

/** What the dashboard shows for each skill. */
export interface SkillSummary {
  id: string
  name: string
  slug: string
  source: string
  learningLanguage: string
  hasMap: boolean
  hasRoadmap: boolean
  progress: number
  totalSteps: number
  completedSteps: number
  highestCompletedStage: string | null
  lastWorkedStage: string | null
  lastActivityAt: string | null
  createdAt: string
}

/** The workspace: everything above, plus the plan itself. */
export interface SkillDetail extends SkillSummary {
  stages: Array<{
    id: string
    position: number
    title: string
    rationale: string | null
    complete: boolean
    steps: Array<{
      id: string
      position: number
      title: string
      summary: string | null
      completedAt: string | null
    }>
  }>
}

const stagesOf = (skill: UserSkillWithRoadmap): ProgressStage[] =>
  skill.roadmap?.stages ?? []

const toSummary = (skill: UserSkillWithRoadmap): SkillSummary => {
  const summary = summariseProgress(stagesOf(skill))

  return {
    id: skill.id,
    name: skill.name,
    slug: skill.slug,
    source: skill.source,
    learningLanguage: skill.learningLanguage,
    hasMap: skill.skillMap !== null,
    hasRoadmap: skill.roadmap !== null,
    progress: summary.progress,
    totalSteps: summary.totalSteps,
    completedSteps: summary.completedSteps,
    highestCompletedStage: summary.highestCompletedStage,
    lastWorkedStage: summary.lastWorkedStage,
    lastActivityAt: summary.lastActivityAt?.toISOString() ?? null,
    createdAt: skill.createdAt.toISOString(),
  }
}

const toDetail = (skill: UserSkillWithRoadmap): SkillDetail => ({
  ...toSummary(skill),
  stages: (skill.roadmap?.stages ?? []).map((stage) => ({
    id: stage.id,
    position: stage.position,
    title: stage.title,
    rationale: stage.rationale,
    // Computed, never stored — the same function the dashboard uses, so the
    // two views can never disagree about whether a stage is finished.
    complete: stage.steps.length > 0 && stage.steps.every((s) => s.completedAt !== null),
    steps: stage.steps.map((step) => ({
      id: step.id,
      position: step.position,
      title: step.title,
      summary: step.summary,
      completedAt: step.completedAt?.toISOString() ?? null,
    })),
  })),
})

// ---------------------------------------------------------------------------

export const skillService = {
  async listForUser(userId: string): Promise<SkillSummary[]> {
    const skills = await skillRepository.listByUserId(userId)
    return skills.map(toSummary)
  },

  async getBySlugOrThrow(userId: string, slug: string): Promise<SkillDetail> {
    const skill = await skillRepository.findBySlug(userId, slug)
    if (!skill) throw new NotFoundError('Skill not found')
    return toDetail(skill)
  },

  async create(userId: string, input: CreateSkillInput): Promise<SkillSummary> {
    const skill = await skillRepository.upsertBySlug({
      userId,
      name: input.name,
      slug: toSlugOrThrow(input.name),
      source: 'MANUAL',
    })

    return toSummary(skill)
  },

  /**
   * The CareerOS hand-off.
   *
   * Three properties matter here, and all three are consequences of decisions
   * made earlier rather than code written now:
   *
   *  - idempotent, because (userId, slug) is unique and the upsert leaves an
   *    existing row alone. Opening the same link twice changes nothing.
   *  - one root skill per entry: Docker, Azure and CI/CD become three separate
   *    skills, never one combined map.
   *  - nothing is generated. Creating three maps and three roadmaps on a link
   *    click would spend real money and a minute of waiting on work the person
   *    has not asked for.
   */
  async importFromPeer(
    userId: string,
    input: ImportSkillsInput,
  ): Promise<SkillSummary[]> {
    const seen = new Set<string>()
    const created: SkillSummary[] = []

    for (const name of input.skills) {
      const slug = toSlugOrThrow(name)

      // "Docker" and "docker" in one request are the same skill; without this
      // the second upsert would overwrite the first in the same transaction
      // and the response would list it twice.
      if (seen.has(slug)) continue
      seen.add(slug)

      const skill = await skillRepository.upsertBySlug({
        userId,
        name,
        slug,
        source: 'CAREEROS',
      })

      created.push(toSummary(skill))
    }

    return created
  },

  async setLanguage(
    userId: string,
    slug: string,
    input: UpdateSkillInput,
  ): Promise<SkillSummary> {
    // Read first so a missing skill is a 404 rather than a Prisma error
    // leaking out of the update.
    const existing = await skillRepository.findBySlug(userId, slug)
    if (!existing) throw new NotFoundError('Skill not found')

    // Changing the language regenerates nothing. An existing roadmap keeps
    // the language it was generated in; producing a new one is a separate,
    // explicit action, because it resets progress.
    const skill = await skillRepository.setLanguage(userId, slug, input.learningLanguage)
    return toSummary(skill)
  },

  async deleteOwned(userId: string, slug: string): Promise<void> {
    const existing = await skillRepository.findBySlug(userId, slug)
    if (!existing) throw new NotFoundError('Skill not found')
    await skillRepository.deleteBySlug(userId, slug)
  },

  /**
   * What the companion application sees.
   *
   * A different shape from the internal one on purpose: another service has no
   * business knowing our row ids or our stage structure. Name, slug, progress
   * and the level reached are enough to render a "skill strength" panel, and
   * every one of them is derived rather than self-reported.
   */
  async listForPeer(sub: string): Promise<
    Array<{ name: string; slug: string; progress: number; currentLevel: string | null }>
  > {
    const skills = await skillRepository.listByAuthSub(sub)

    return skills.map((skill) => {
      const summary = summariseProgress(stagesOf(skill))

      return {
        name: skill.name,
        slug: skill.slug,
        // Two decimals: the consumer draws a bar, not an accountant's report.
        progress: Math.round(summary.progress * 100) / 100,
        currentLevel: summary.highestCompletedStage,
      }
    })
  },
}
