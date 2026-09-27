const HUES = [
  '#61d5e8',
  '#5b8def',
  '#5fcb95',
  '#9d86f0',
  '#ebc56a',
  '#e0708f',
  '#f0a15e',
  '#4fc3b0',
] as const

const hashOf = (value: string): number => {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return Math.abs(hash)
}

export const hueFor = (slug: string): string => HUES[hashOf(slug) % HUES.length] as string

export const initialsFor = (name: string): string => {
  const words = name
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((word) => word.length > 0)

  if (words.length === 0) return '?'

  if (words.length > 1) {
    return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase()
  }

  const word = words[0] as string
  const capitals = word.match(/\p{Lu}/gu) ?? []
  if (capitals.length >= 2) return (capitals[0] as string) + (capitals[1] as string)

  const first = word[0]?.toUpperCase() ?? ''
  const second = word[1]?.toLowerCase() ?? ''
  return first + second
}
