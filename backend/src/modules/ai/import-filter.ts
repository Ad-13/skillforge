import { z } from 'zod'
import { aiProvider } from './ai.provider.ts'

const verdictSchema = z.enum(['KEEP', 'DROP'])

const itemSchema = z.object({
  index: z.number().int().min(0).max(40),
  verdict: verdictSchema,
  name: z.string().trim().min(1).max(80),
  kind: z.enum(['TECHNOLOGY', 'FIELD', 'CONCEPT']),
  reason: z.string().trim().max(120),
})

const filterSchema = z.object({
  items: z.array(itemSchema).max(40),
})

export interface ImportCandidate {
  index: number
  name: string
}

export interface ImportJudgement {
  index: number
  keep: boolean
  name: string
  kind: 'TECHNOLOGY' | 'FIELD' | 'CONCEPT'
  reason: string
}

const SYSTEM = [
  'A job posting was parsed into requirement phrases. Decide which of them name',
  'something a person can sit down and learn, and give that thing its ordinary name.',
  '',
  'KEEP when the phrase names a technology, a language, a tool, a field of work',
  'or a concept somebody could study: Python, Kubernetes, machine learning,',
  'accessibility, German, distributed systems, product discovery.',
  '',
  'DROP when it names anything else: a personal quality, a qualification or degree,',
  'a length of service, a legal status, a working arrangement, a job title on its',
  'own, an industry the employer happens to be in, or a responsibility rather than',
  'a subject. "Ownership of the roadmap" is a responsibility; "roadmapping" is a',
  'subject. When a phrase is a role, keep it only if there is a body of knowledge',
  'behind the role that a person studies.',
  '',
  'NAME',
  '- The ordinary name of the subject, nothing else: "Generative AI", not',
  '  "Built a GenAI"; "Machine Learning", not "Fundamental knowledge of ML".',
  '- Expand an abbreviation only when it is unambiguous in this context: ML is',
  '  Machine Learning, K8s is Kubernetes. Leave SQL, HTML, AWS as they are.',
  '- Never invent a narrower subject than the phrase supports.',
  '',
  'KIND',
  'TECHNOLOGY for a concrete tool, library, language or platform. FIELD for a',
  'broad area of work with many technologies under it. CONCEPT for an idea or',
  'practice that is not a product.',
  '',
  'FORM',
  '- Answer once for every index you are given, and never for an index you are not.',
  '- "reason" is one short phrase, and only matters for a DROP.',
].join('\n')

export const filterImportCandidates = async (
  candidates: readonly ImportCandidate[],
): Promise<ImportJudgement[]> => {
  if (candidates.length === 0) return []

  const user = [
    'PHRASES:',
    ...candidates.map((candidate) => `${candidate.index}. ${candidate.name}`),
  ].join('\n')

  const answer = await aiProvider.completeStructured(filterSchema, 'ImportFilter', {
    system: SYSTEM,
    user,
  })

  const known = new Set(candidates.map((candidate) => candidate.index))
  const seen = new Set<number>()
  const out: ImportJudgement[] = []

  for (const item of answer.items) {
    if (!known.has(item.index) || seen.has(item.index)) continue
    seen.add(item.index)

    out.push({
      index: item.index,
      keep: item.verdict === 'KEEP',
      name: item.name,
      kind: item.kind,
      reason: item.reason,
    })
  }

  return out
}
