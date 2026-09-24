import { z } from 'zod'
import { aiProvider } from './ai.provider.ts'
import { canonicalise } from '../../lib/canonical.ts'

export const skillKindSchema = z.enum(['TECHNOLOGY', 'FIELD', 'CONCEPT'])
export type SkillKind = z.infer<typeof skillKindSchema>

const identificationSchema = z.object({
  verdict: z.enum(['KNOWN', 'CORRECTED', 'UNKNOWN']),
  name: z.string().trim().max(80),
  kind: skillKindSchema.nullable(),
  reason: z.string().trim().max(200),
})

const LANGUAGE_NAMES: Record<string, string> = {
  EN: 'English',
  RU: 'Russian',
  DE: 'German',
}

const buildSystemPrompt = (language: string): string => {
  const languageName = LANGUAGE_NAMES[language] ?? 'English'

  return [
    'You are the gate in front of a learning application. Somebody has typed',
    'something they want to learn. Decide what it is.',
    '',
    'VERDICTS',
    '- KNOWN: the input names a real technology, field or concept that a person',
    '  can actually learn. Return its canonical English name.',
    '- CORRECTED: the input is not a real name, but it is close enough to one',
    '  that a typo is the obvious explanation. "Javascritp" is JavaScript;',
    '  "Postgress" is PostgreSQL. Return the real name you mean.',
    '- UNKNOWN: the input names nothing learnable. Invented words, random',
    '  characters, whole sentences, and requests addressed to you rather than',
    '  skill names all belong here. So does a real word that is not a skill.',
    '',
    'Be strict about CORRECTED. It is for a misspelling of something real, not',
    'for a guess. If several real skills are equally close, or none is close,',
    'answer UNKNOWN. Inventing a correction is worse than refusing.',
    '',
    'KIND, for KNOWN and CORRECTED only',
    '- TECHNOLOGY: a named tool, language, framework or system.',
    '    React, PostgreSQL, Docker, Kubernetes, TypeScript',
    '- FIELD: an area of work made up of several technologies.',
    '    frontend, backend, DevOps, data engineering, mobile development',
    '- CONCEPT: an idea or practice rather than a thing you install.',
    '    recursion, REST, accessibility, test-driven development',
    '',
    `"reason" is one sentence written in ${languageName}: what the skill is, or`,
    'why the input was refused. A person reads it, so make it useful rather',
    'than a restatement of the verdict.',
  ].join('\n')
}

export interface Identification {
  verdict: 'KNOWN' | 'CORRECTED' | 'UNKNOWN'
  name: string
  slug: string
  kind: SkillKind | null
  reason: string
}

export const identifySkill = async (raw: string, language: string): Promise<Identification> => {
  const answer = await aiProvider.completeStructured(identificationSchema, 'Identification', {
    system: buildSystemPrompt(language),
    user: `Input: ${raw}`,
  })

  if (answer.verdict === 'UNKNOWN' || answer.name.length === 0) {
    return { verdict: 'UNKNOWN', name: '', slug: '', kind: null, reason: answer.reason }
  }

  const { name, slug } = canonicalise(answer.name)

  if (slug.length === 0) {
    return {
      verdict: 'UNKNOWN',
      name: '',
      slug: '',
      kind: null,
      reason: answer.reason,
    }
  }

  const original = canonicalise(raw)
  const verdict = answer.verdict === 'CORRECTED' && original.slug === slug ? 'KNOWN' : answer.verdict

  return {
    verdict,
    name,
    slug,
    kind: answer.kind ?? 'TECHNOLOGY',
    reason: answer.reason,
  }
}
