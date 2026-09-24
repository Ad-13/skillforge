import { toSlug } from './slug.ts'
import { BadRequestError } from './errors.ts'

interface CanonicalSkill {
  slug: string
  name: string
  aliases: readonly string[]
}

const CANONICAL: readonly CanonicalSkill[] = [

  {
    slug: 'javascript',
    name: 'JavaScript',

    aliases: ['js', 'java-script', 'ecmascript', 'es6', 'es2015', 'es-next', 'esnext', 'vanilla-js'],
  },
  { slug: 'typescript', name: 'TypeScript', aliases: ['ts', 'type-script'] },
  { slug: 'html', name: 'HTML', aliases: ['html5', 'hyper-text-markup-language'] },
  { slug: 'css', name: 'CSS', aliases: ['css3', 'cascading-style-sheets'] },
  { slug: 'python', name: 'Python', aliases: ['py', 'python3'] },

  { slug: 'csharp', name: 'C#', aliases: ['c-sharp', 'csharp'] },
  { slug: 'cpp', name: 'C++', aliases: ['cplusplus', 'c-plus-plus'] },
  { slug: 'go', name: 'Go', aliases: ['golang'] },
  { slug: 'sql', name: 'SQL', aliases: ['structured-query-language'] },

  { slug: 'react', name: 'React', aliases: ['react-js', 'reactjs'] },
  { slug: 'angular', name: 'Angular', aliases: ['angular-js-2', 'angular-2'] },
  { slug: 'vue', name: 'Vue', aliases: ['vue-js', 'vuejs', 'vue-3'] },
  { slug: 'svelte', name: 'Svelte', aliases: ['svelte-js', 'sveltejs'] },
  { slug: 'nextjs', name: 'Next.js', aliases: ['next', 'next-js'] },
  { slug: 'nuxt', name: 'Nuxt', aliases: ['nuxt-js', 'nuxtjs'] },
  { slug: 'redux', name: 'Redux', aliases: ['redux-toolkit', 'rtk'] },
  { slug: 'rxjs', name: 'RxJS', aliases: ['rx-js', 'reactive-extensions'] },
  { slug: 'tailwind', name: 'Tailwind CSS', aliases: ['tailwind-css', 'tailwindcss'] },
  { slug: 'sass', name: 'Sass', aliases: ['scss'] },

  { slug: 'nodejs', name: 'Node.js', aliases: ['node', 'node-js'] },
  { slug: 'express', name: 'Express', aliases: ['express-js', 'expressjs'] },
  { slug: 'nestjs', name: 'NestJS', aliases: ['nest', 'nest-js'] },
  { slug: 'aspnet', name: 'ASP.NET Core', aliases: ['asp-net', 'asp-net-core', 'aspnet-core'] },
  { slug: 'dotnet', name: '.NET', aliases: ['net', 'dot-net', 'net-core', 'dotnet-core'] },
  { slug: 'graphql', name: 'GraphQL', aliases: ['graph-ql'] },
  { slug: 'rest', name: 'REST', aliases: ['rest-api', 'restful', 'restful-api'] },

  { slug: 'postgresql', name: 'PostgreSQL', aliases: ['postgres', 'psql', 'postgre-sql', 'pg'] },
  { slug: 'mysql', name: 'MySQL', aliases: ['my-sql'] },
  { slug: 'mongodb', name: 'MongoDB', aliases: ['mongo', 'mongo-db'] },
  { slug: 'redis', name: 'Redis', aliases: [] },
  { slug: 'prisma', name: 'Prisma', aliases: ['prisma-orm'] },

  { slug: 'docker', name: 'Docker', aliases: ['docker-compose'] },
  { slug: 'kubernetes', name: 'Kubernetes', aliases: ['k8s', 'kube'] },
  { slug: 'git', name: 'Git', aliases: ['git-scm'] },
  { slug: 'github-actions', name: 'GitHub Actions', aliases: ['gh-actions'] },
  { slug: 'cicd', name: 'CI/CD', aliases: ['ci-cd', 'ci', 'continuous-integration', 'continuous-delivery'] },
  { slug: 'aws', name: 'AWS', aliases: ['amazon-web-services'] },
  { slug: 'azure', name: 'Azure', aliases: ['microsoft-azure'] },
  { slug: 'linux', name: 'Linux', aliases: ['gnu-linux'] },

  { slug: 'http', name: 'HTTP', aliases: ['https', 'http-s', 'http-https', 'http-protocol'] },
  { slug: 'dom', name: 'The DOM', aliases: ['document-object-model', 'the-dom'] },
  { slug: 'web-accessibility', name: 'Web Accessibility', aliases: ['a11y', 'accessibility', 'wcag'] },
  { slug: 'oauth', name: 'OAuth 2.0', aliases: ['oauth-2', 'oauth-2-0', 'oauth2'] },
  { slug: 'oidc', name: 'OpenID Connect', aliases: ['openid', 'open-id-connect'] },
  { slug: 'jwt', name: 'JWT', aliases: ['json-web-token', 'json-web-tokens'] },

  { slug: 'testing', name: 'Testing', aliases: ['software-testing', 'automated-testing'] },
  { slug: 'unit-testing', name: 'Unit Testing', aliases: ['unit-tests'] },
  { slug: 'e2e-testing', name: 'End-to-End Testing', aliases: ['e2e', 'end-to-end-testing', 'e-2-e'] },
  { slug: 'algorithms', name: 'Algorithms', aliases: ['algorithms-and-data-structures', 'dsa'] },
]

const RAW_ALIASES: Record<string, string> = {
  'c#': 'csharp',
  'c♯': 'csharp',
  'f#': 'fsharp',
  'c++': 'cpp',
  c: 'c',
  '.net': 'dotnet',
  'node.js': 'nodejs',
  'next.js': 'nextjs',
  'vue.js': 'vue',
  'react.js': 'react',
}

const BY_ALIAS = new Map<string, CanonicalSkill>()
for (const entry of CANONICAL) {
  BY_ALIAS.set(entry.slug, entry)
  for (const alias of entry.aliases) BY_ALIAS.set(alias, entry)
}

const EDGE_NOISE = new Set([
  'the',
  'a',
  'learn',
  'learning',
  'basics',
  'fundamentals',
  'framework',
  'library',
  'language',
  'lang',
  'programming',
  'advanced',
  'intro',
  'introduction',
])

const TRAILING_VERSION = /-(?:v?\d+(?:-\d+)*)$/

const stripNoise = (slug: string): string => {
  let parts = slug.split('-').filter((part) => part.length > 0)

  while (parts.length > 1 && EDGE_NOISE.has(parts[0] as string)) parts = parts.slice(1)
  while (parts.length > 1 && EDGE_NOISE.has(parts[parts.length - 1] as string)) parts = parts.slice(0, -1)

  return parts.join('-')
}

export interface CanonicalName {
  name: string
  slug: string
  known: boolean
}

export const canonicalise = (raw: string): CanonicalName => {
  const trimmed = raw.trim().replace(/\s+/g, ' ')

  const rawHit = RAW_ALIASES[trimmed.toLowerCase()]
  if (rawHit !== undefined) {
    const entry = BY_ALIAS.get(rawHit)
    if (entry) return { name: entry.name, slug: entry.slug, known: true }

    return { name: trimmed, slug: rawHit, known: false }
  }

  const slug = toSlug(trimmed)

  if (slug.length === 0) return { name: trimmed, slug: '', known: false }

  const candidates = [slug, slug.replace(TRAILING_VERSION, ''), stripNoise(slug.replace(TRAILING_VERSION, ''))]

  for (const candidate of candidates) {
    const hit = BY_ALIAS.get(candidate)
    if (hit) return { name: hit.name, slug: hit.slug, known: true }
  }

  const narrowed = candidates[candidates.length - 1] as string
  return { name: trimmed, slug: narrowed.length > 0 ? narrowed : slug, known: false }
}

export const canonicaliseOrThrow = (raw: string): CanonicalName => {
  const result = canonicalise(raw)

  if (result.slug.length === 0) {
    throw new BadRequestError(
      'A skill name must contain Latin letters or digits, for example "Angular" or "CI/CD"',
    )
  }

  return result
}
