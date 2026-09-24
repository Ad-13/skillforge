import { canonicalise } from '../../lib/canonical.ts'
import type { GeneratedChild, GeneratedRelation } from './expansion.schema.ts'

export type MapLensName = 'FOUNDATION' | 'ANATOMY' | 'ECOSYSTEM'

export interface ExpansionContext {
  lens: MapLensName
  targetSlug: string
  pathSlugs: readonly string[]
  siblingSlugs: readonly string[]
  mapSlugs: readonly string[]
  targetIsRoot: boolean
}

export interface AcceptedChild {
  label: string
  slug: string
  summary: string
  relation: GeneratedRelation
}

export interface RejectedChild {
  label: string
  reason: string
}

export interface FilteredExpansion {
  accepted: AcceptedChild[]
  rejected: RejectedChild[]
}

const relationFor = (lens: MapLensName, claimed: GeneratedRelation): GeneratedRelation => {
  if (claimed === 'RELATED') return 'RELATED'

  switch (lens) {
    case 'FOUNDATION':
      return 'PREREQUISITE'
    case 'ANATOMY':
      return 'CORE'
    case 'ECOSYSTEM':
      return 'ECOSYSTEM'
  }
}

export const filterExpansion = (
  children: readonly GeneratedChild[],
  context: ExpansionContext,
): FilteredExpansion => {
  const path = new Set(context.pathSlugs)
  const siblings = new Set(context.siblingSlugs)
  const inMap = new Set(context.mapSlugs)

  const accepted: AcceptedChild[] = []
  const rejected: RejectedChild[] = []
  const seen = new Set<string>()

  for (const child of children) {
    const { name, slug } = canonicalise(child.label)

    if (slug.length === 0) {
      rejected.push({ label: child.label, reason: 'not a nameable skill' })
      continue
    }

    if (slug === context.targetSlug) {
      rejected.push({ label: child.label, reason: 'repeats the node being expanded' })
      continue
    }

    if (path.has(slug)) {
      rejected.push({ label: child.label, reason: 'already on the path from the root' })
      continue
    }

    if (siblings.has(slug)) {
      rejected.push({ label: child.label, reason: 'already a child of this node' })
      continue
    }

    if (inMap.has(slug)) {
      rejected.push({ label: child.label, reason: 'already somewhere else in this map' })
      continue
    }

    if (seen.has(slug)) {
      rejected.push({ label: child.label, reason: 'duplicate within this answer' })
      continue
    }

    seen.add(slug)
    accepted.push({
      label: name,
      slug,
      summary: child.summary,
      relation: relationFor(context.lens, child.relation),
    })
  }

  return { accepted, rejected }
}
