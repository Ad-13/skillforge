const MAX_LENGTH = 512

export const sanitiseReturnTo = (raw: unknown): string | null => {
  if (typeof raw !== 'string') return null

  const value = raw.trim()
  if (value.length === 0 || value.length > MAX_LENGTH) return null
  if (!value.startsWith('/')) return null
  if (value.startsWith('//')) return null
  if (value.includes('\\')) return null
  if (/[\u0000-\u001f\u007f]/.test(value)) return null

  try {
    const resolved = new URL(value, 'https://placeholder.invalid')
    if (resolved.origin !== 'https://placeholder.invalid') return null
    return `${resolved.pathname}${resolved.search}${resolved.hash}`
  } catch {
    return null
  }
}
