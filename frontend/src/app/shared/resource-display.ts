import type { Resource, ResourceSourceType } from '../core/api.types'
import type { IconName } from './icon'

export type ResourceFilter = 'all' | 'DOCS' | 'ARTICLE' | 'VIDEO' | 'NOTE'

const SOURCE: Record<ResourceSourceType, { label: string; icon: IconName; hue: string }> = {
  DOCS: { label: 'Docs', icon: 'note', hue: 'var(--accent)' },
  ARTICLE: { label: 'Article', icon: 'note', hue: 'var(--gold)' },
  VIDEO: { label: 'Video', icon: 'spark', hue: 'var(--rel-related)' },
  REPO: { label: 'Repository', icon: 'link', hue: 'var(--rel-ecosystem)' },
  COURSE: { label: 'Course', icon: 'book', hue: 'var(--success)' },
}

export const resourceLabel = (resource: Resource): string => {
  if (resource.kind === 'NOTE') return 'Note'
  return resource.sourceType ? SOURCE[resource.sourceType].label : 'Link'
}

export const resourceIcon = (resource: Resource): IconName => {
  if (resource.kind === 'NOTE') return 'note'
  return resource.sourceType ? SOURCE[resource.sourceType].icon : 'link'
}

export const resourceHue = (resource: Resource): string => {
  if (resource.kind === 'NOTE') return 'var(--rel-ecosystem)'
  return resource.sourceType ? SOURCE[resource.sourceType].hue : 'var(--accent)'
}

export const resourceHost = (resource: Resource): string => {
  if (!resource.url) return 'web search'
  try {
    return new URL(resource.url).hostname.replace(/^www\./, '')
  } catch {
    return resource.url
  }
}

export const resourceHref = (resource: Resource): string => {
  if (resource.url) return resource.url
  const query = encodeURIComponent(resource.searchQuery ?? resource.title)
  return `https://duckduckgo.com/?q=${query}`
}

export const matchesFilter = (resource: Resource, filter: ResourceFilter): boolean => {
  if (filter === 'all') return true
  if (filter === 'NOTE') return resource.kind === 'NOTE'
  return resource.kind === 'LINK' && resource.sourceType === filter
}
