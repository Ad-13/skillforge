import { canonicalise } from './canonical.ts'

export const parseTrustedSkills = (raw: string | undefined): ReadonlySet<string> => {
  const slugs = new Set<string>()
  for (const part of (raw ?? '').split(',')) {
    const { slug } = canonicalise(part)
    if (slug.length > 0) slugs.add(slug)
  }
  return slugs
}
