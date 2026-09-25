import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { normaliseMarkdown, stripLeadingH1, titleFromMarkdown } from '../markdown.ts'

describe('normaliseMarkdown', () => {
  it('separates a heading from the paragraph glued under it', () => {
    const out = normaliseMarkdown('# Title\nSome prose.')
    assert.equal(out, '# Title\n\nSome prose.\n')
  })

  it('keeps the rows of one table together', () => {
    const out = normaliseMarkdown('Intro\n| a | b |\n| - | - |\n| 1 | 2 |')
    assert.equal(out, 'Intro\n\n| a | b |\n| - | - |\n| 1 | 2 |\n')
  })

  it('keeps the items of one list together', () => {
    const out = normaliseMarkdown('Intro\n- one\n- two\n- three')
    assert.equal(out, 'Intro\n\n- one\n- two\n- three\n')
  })

  it('leaves the inside of a fenced block alone', () => {
    const source = 'Text\n```bash\n# not a heading\n- not a list\n```\nAfter'
    const out = normaliseMarkdown(source)

    assert.ok(out.includes('```bash\n# not a heading\n- not a list\n```'))
    assert.ok(out.includes('\n\nAfter'))
  })

  it('collapses runs of blank lines but keeps one', () => {
    assert.equal(normaliseMarkdown('a\n\n\n\n\nb'), 'a\n\nb\n')
  })

  it('normalises CRLF', () => {
    assert.equal(normaliseMarkdown('a\r\n\r\nb'), 'a\n\nb\n')
  })

  it('turns a Notion callout into a blockquote', () => {
    const source = 'Before\n<aside>\n💡 Keys are for identity.\n\n</aside>\nAfter'
    const out = normaliseMarkdown(source)

    assert.ok(out.includes('> 💡 Keys are for identity.'))
    assert.ok(!out.includes('<aside>'))
    assert.ok(out.includes('\n\nAfter'))
  })

  it('keeps a multi-paragraph callout together', () => {
    const out = normaliseMarkdown('<aside>\n⚠️ One.\n\nTwo.\n</aside>')
    assert.ok(out.includes('> ⚠️ One.'))
    assert.ok(out.includes('> Two.'))
  })

  it('is idempotent — running it twice changes nothing further', () => {
    const source = '# Title\nProse.\n- one\n- two\n| a | b |\n| - | - |'
    const once = normaliseMarkdown(source)
    assert.equal(normaliseMarkdown(once), once)
  })
})

describe('stripLeadingH1', () => {
  it('removes the heading when it repeats the title', () => {
    assert.equal(stripLeadingH1('# Hooks\n\nBody.\n', 'Hooks'), 'Body.\n')
  })

  it('ignores case and surrounding space', () => {
    assert.equal(stripLeadingH1('# hooks\n\nBody.\n', '  Hooks '), 'Body.\n')
  })

  it('keeps a heading that says something else', () => {
    const source = '# Rules of hooks\n\nBody.\n'
    assert.equal(stripLeadingH1(source, 'Hooks'), source)
  })
})

describe('titleFromMarkdown', () => {
  it('prefers the first heading', () => {
    assert.equal(titleFromMarkdown('# Rules of hooks\n\nBody', 'notes.md'), 'Rules of hooks')
  })

  it('falls back to the filename, made readable', () => {
    assert.equal(titleFromMarkdown('Just prose.', 'rules-of_hooks.md'), 'rules of hooks')
  })

  it('never returns an empty title', () => {
    assert.equal(titleFromMarkdown('prose', '.md'), 'Imported note')
  })
})
