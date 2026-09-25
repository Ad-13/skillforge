import {
  Component,
  ChangeDetectionStrategy,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core'
import { Marked } from 'marked'
import hljs from 'highlight.js/lib/core'
import typescript from 'highlight.js/lib/languages/typescript'
import javascript from 'highlight.js/lib/languages/javascript'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'
import python from 'highlight.js/lib/languages/python'
import sql from 'highlight.js/lib/languages/sql'
import yaml from 'highlight.js/lib/languages/yaml'
import markdown from 'highlight.js/lib/languages/markdown'
import diff from 'highlight.js/lib/languages/diff'

hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('css', css)
hljs.registerLanguage('json', json)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('python', python)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('diff', diff)

hljs.registerAliases(['ts', 'tsx'], { languageName: 'typescript' })
hljs.registerAliases(['js', 'jsx', 'mjs', 'cjs'], { languageName: 'javascript' })
hljs.registerAliases(['html', 'svg', 'vue', 'angular'], { languageName: 'xml' })
hljs.registerAliases(['scss', 'sass', 'less'], { languageName: 'css' })
hljs.registerAliases(['sh', 'shell', 'zsh', 'console'], { languageName: 'bash' })
hljs.registerAliases(['py'], { languageName: 'python' })
hljs.registerAliases(['yml'], { languageName: 'yaml' })
hljs.registerAliases(['md'], { languageName: 'markdown' })

const LANGUAGE_LABEL: Record<string, string> = {
  ts: 'TypeScript',
  tsx: 'TSX',
  typescript: 'TypeScript',
  js: 'JavaScript',
  jsx: 'JSX',
  javascript: 'JavaScript',
  html: 'HTML',
  xml: 'XML',
  svg: 'SVG',
  vue: 'Vue',
  css: 'CSS',
  scss: 'SCSS',
  sass: 'Sass',
  json: 'JSON',
  bash: 'Shell',
  sh: 'Shell',
  shell: 'Shell',
  zsh: 'Shell',
  console: 'Shell',
  py: 'Python',
  python: 'Python',
  sql: 'SQL',
  yaml: 'YAML',
  yml: 'YAML',
  md: 'Markdown',
  markdown: 'Markdown',
  diff: 'Diff',
}

const marked = new Marked()

marked.use({
  gfm: true,
  breaks: false,
  renderer: {
    code({ text, lang }) {
      const key = (lang ?? '').trim().toLowerCase()
      const definition = key ? hljs.getLanguage(key) : undefined
      const label = LANGUAGE_LABEL[key] ?? definition?.name ?? key

      const highlighted = definition
        ? hljs.highlight(text, { language: key }).value
        : escapeHtml(text)

      const badge = label ? `<span class="md-code-lang">${escapeHtml(label)}</span>` : ''
      return `<div class="md-code">${badge}<pre><code class="hljs">${highlighted}</code></pre></div>`
    },
    blockquote({ tokens }) {
      const body = this.parser.parse(tokens)
      const match = /^<p>\s*([\p{Extended_Pictographic}✀-➿])\s*/u.exec(body)

      if (!match) return `<blockquote>${body}</blockquote>`

      const icon = match[1] as string
      const rest = body.replace(match[0], '<p>')
      return `<aside class="md-callout"><span class="md-callout-icon">${icon}</span><div class="md-callout-body">${rest}</div></aside>`
    },
    table({ header, rows }) {
      const head = header.map((cell) => `<th>${this.parser.parseInline(cell.tokens)}</th>`).join('')
      const body = rows
        .map(
          (row) =>
            `<tr>${row.map((cell) => `<td>${this.parser.parseInline(cell.tokens)}</td>`).join('')}</tr>`,
        )
        .join('')

      return `<div class="md-table"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`
    },
  },
})

const LEADING_ICON = /^<p>\s*((?:\p{Extended_Pictographic}|[\u2600-\u27bf])(?:\ufe0f)?)\s+/u

const asCallout = (body: string): string | null => {
  const match = LEADING_ICON.exec(body)
  if (!match) return null

  const icon = match[1] as string
  const rest = body.replace(match[0], '<p>')
  return `<aside class="md-callout"><span class="md-callout-icon">${icon}</span><div class="md-callout-body">${rest}</div></aside>`
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

@Component({
  selector: 'sf-markdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `<div class="md" [innerHTML]="html()"></div>`,
  styleUrl: './markdown.css',
})
export class Markdown {
  readonly source = input<string>('')

  protected readonly html = computed(() => {
    const text = this.source()
    if (!text) return ''
    return marked.parse(text, { async: false }) as string
  })
}
