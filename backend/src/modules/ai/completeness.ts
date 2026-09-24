import { z } from 'zod'
import { aiProvider } from './ai.provider.ts'
import { canonicalise } from '../../lib/canonical.ts'

const gapSchema = z.object({
  missing: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(60),
        summary: z.string().trim().min(1).max(260),
      }),
    )

    .max(8),
})

const LANGUAGE_NAMES: Record<string, string> = { EN: 'English', RU: 'Russian', DE: 'German' }

export interface GapCheckInput {
  skillName: string
  skillKind: 'TECHNOLOGY' | 'FIELD' | 'CONCEPT'
  knownLabels: readonly string[]
  knownSlugs: readonly string[]
  language: string
}

export interface GapCheckResult {
  missing: Array<{ label: string; slug: string; summary: string }>
  model: string
}

export const findMissingTopics = async (input: GapCheckInput): Promise<GapCheckResult> => {
  const languageName = LANGUAGE_NAMES[input.language] ?? 'English'

  const system = [
    'You review a list of topics that somebody has collected for learning a',
    'skill, and you name what is missing from it.',
    '',
    '- Judge the list as preparation for real work, not as an encyclopaedia.',
    '  Something is missing if a practitioner would notice its absence.',
    '- Name at most eight, and fewer is better. An empty list is a correct and',
    '  common answer: do not invent gaps to have something to say.',
    '- Do not repeat anything already on the list, in any spelling.',
    '- Do not name prerequisites of the skill, and do not name separate tools',
    '  used alongside it. Only what belongs INSIDE the skill.',
    '',
    `"label" is in English. "summary" is one sentence in ${languageName},`,
    'saying why its absence matters.',
  ].join('\n')

  const user = [
    `SKILL: ${input.skillName} (${input.skillKind})`,
    '',
    'ALREADY COLLECTED:',
    ...input.knownLabels.map((label) => `- ${label}`),
  ].join('\n')

  const answer = await aiProvider.completeStructured(gapSchema, 'GapCheck', { system, user })

  const known = new Set(input.knownSlugs)
  const seen = new Set<string>()
  const missing: GapCheckResult['missing'] = []

  for (const item of answer.missing) {
    const { name, slug } = canonicalise(item.label)
    if (slug.length === 0 || known.has(slug) || seen.has(slug)) continue

    seen.add(slug)
    missing.push({ label: name, slug, summary: item.summary })
  }

  return { missing, model: aiProvider.modelId() }
}
