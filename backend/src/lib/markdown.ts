const BLOCK_START = /^(#{1,6}\s|>\s?|\|.*\||```|~~~|---\s*$|\*\*\*\s*$|[-*+]\s|\d+[.)]\s)/
const HEADING = /^#{1,6}\s/
const FENCE = /^(```|~~~)/
const LIST = /^([-*+]\s|\d+[.)]\s)/
const TABLE = /^\|.*\|/
const QUOTE = /^>/

type BlockKind = 'table' | 'list' | 'quote'

const kindOf = (trimmed: string): BlockKind | null => {
  if (TABLE.test(trimmed)) return 'table'
  if (LIST.test(trimmed)) return 'list'
  if (QUOTE.test(trimmed)) return 'quote'
  return null
}

export const normaliseMarkdown = (raw: string): string => {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n')
  const out: string[] = []
  let inFence = false

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? ''
    const trimmed = line.trim()

    if (FENCE.test(trimmed)) {
      if (!inFence && out.length > 0 && (out[out.length - 1] ?? '').trim() !== '') out.push('')
      out.push(line)
      inFence = !inFence
      if (!inFence) out.push('')
      continue
    }

    if (inFence) {
      out.push(line)
      continue
    }

    const prev = (out[out.length - 1] ?? '').trim()

    if (trimmed !== '' && prev !== '') {
      const before = kindOf(prev)
      const current = kindOf(trimmed)

      const sameRun = before !== null && before === current
      const needsBreak = (BLOCK_START.test(trimmed) || before !== null) && !sameRun
      if (needsBreak) out.push('')
    }

    out.push(line)

    const next = lines[i + 1]
    if (HEADING.test(trimmed) && next !== undefined && next.trim() !== '') out.push('')
  }

  return `${out.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`
}

export const stripLeadingH1 = (markdown: string, title: string): string => {
  const match = /^#\s+(.+)\n/.exec(markdown)
  if (!match) return markdown

  const heading = (match[1] ?? '').trim()
  if (heading.toLowerCase() !== title.trim().toLowerCase()) return markdown

  return markdown.slice(match[0].length).trimStart()
}

export const titleFromMarkdown = (markdown: string, filename: string): string => {
  const match = /^#\s+(.+)$/m.exec(markdown)
  const heading = match?.[1]?.trim()
  if (heading && heading.length > 0) return heading.slice(0, 200)

  return filename.replace(/\.(md|markdown|txt)$/i, '').replace(/[-_]+/g, ' ').trim() || 'Imported note'
}
