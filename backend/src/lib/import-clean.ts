const NOT_A_SKILL: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
  { pattern: /^(willingness|readiness|ability|availability|desire|eagerness)\b/i, reason: 'an attitude, not a skill' },
  { pattern: /\b(willing|ready|able|happy) to\b/i, reason: 'an attitude, not a skill' },
  { pattern: /\b(university|bachelor'?s?|master'?s?|phd|doctoral|academic)\b.*\b(degree|diploma|education)\b/i, reason: 'a qualification, not a skill' },
  { pattern: /^(relevant|appropriate|suitable)\b.*\b(degree|background|education)\b/i, reason: 'a qualification, not a skill' },
  { pattern: /\b(degree|diploma) in\b/i, reason: 'a qualification, not a skill' },
  { pattern: /\b\d+\+?\s*(years?|yrs?)\b/i, reason: 'a length of service, not a skill' },
  { pattern: /\b(work|working) permit\b|\bvisa\b|\bright to work\b|\beligib/i, reason: 'a legal status, not a skill' },
  { pattern: /\b(driver'?s|driving) licen[cs]e\b/i, reason: 'a licence, not a skill' },
  { pattern: /\b(relocat|travel|commut|on[- ]?site|remote work|hybrid)\b/i, reason: 'a working arrangement, not a skill' },
  { pattern: /\b(team player|team spirit|self[- ]?starter|proactiv|motivat|passionate|enthusias|attention to detail|work ethic|cultural fit|mindset)\b/i, reason: 'a personal trait, not a skill' },
  { pattern: /\b(full[- ]?time|part[- ]?time|permanent|contract|freelance|notice period|salary|start date)\b/i, reason: 'a contract term, not a skill' },
  { pattern: /^(native|mother tongue)\b/i, reason: 'a background, not a skill' },
]

const PREFIXES: readonly RegExp[] = [
  /^(solid|strong|deep|good|basic|fundamental|excellent|proven|extensive|hands[- ]?on|practical|working|advanced|broad)\s+/i,
  /^(knowledge|understanding|command|mastery|grasp|awareness|familiarity|expertise|experience|proficiency|fluency)\s+(of|in|with)\s+/i,
  /^(experience|experienced)\s+(as|working with|working in)\s+/i,
  /^(built|build|building|created|create|creating|developed|develop|developing|shipped|delivered|designed|implemented|worked with|worked on|used|using)\s+/i,
  /^(a|an|the)\s+/i,
  /^(skills?|competence|competency)\s+(in|with)\s+/i,
]

const SUFFIXES: readonly RegExp[] = [
  /\s+(experience|expertise|knowledge|proficiency|fluency|competence|competency|background|skills?)$/i,
  /\s+(project|projects|portfolio|track record|exposure)$/i,
  /\s+(is a plus|is a bonus|preferred|required|desirable|nice to have)$/i,
]

const LANGUAGE_LEVEL = /\s*(language\s+)?(proficiency|level|skills?)?\s*\(?\b([ABC][12])\b\)?\s*$/i

const squash = (value: string): string => value.replace(/\s+/g, ' ').trim()

export interface CleanResult {
  raw: string
  name: string
  rejected: string | null
}

export const cleanImportedName = (raw: string): CleanResult => {
  const original = squash(raw)

  for (const { pattern, reason } of NOT_A_SKILL) {
    if (pattern.test(original)) return { raw: original, name: original, rejected: reason }
  }

  let name = original

  let changed = true
  while (changed) {
    changed = false

    for (const prefix of PREFIXES) {
      const next = squash(name.replace(prefix, ''))
      if (next !== name && next.length > 1) {
        name = next
        changed = true
      }
    }

    for (const suffix of SUFFIXES) {
      const next = squash(name.replace(suffix, ''))
      if (next !== name && next.length > 1) {
        name = next
        changed = true
      }
    }
  }

  const withoutLevel = squash(name.replace(LANGUAGE_LEVEL, ''))
  if (withoutLevel.length > 1) name = withoutLevel

  name = squash(name.replace(/^[-–—•*,.:;\s]+|[-–—•*,.:;\s]+$/g, ''))

  if (name.length < 2) return { raw: original, name: original, rejected: 'too short to name anything' }

  return { raw: original, name, rejected: null }
}

export const dedupeByName = (results: readonly CleanResult[]): CleanResult[] => {
  const seen = new Set<string>()
  const out: CleanResult[] = []

  for (const result of results) {
    const key = result.name.toLowerCase()
    if (result.rejected === null) {
      if (seen.has(key)) continue
      seen.add(key)
    }
    out.push(result)
  }

  return out
}
