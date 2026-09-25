import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { cleanImportedName, dedupeByName } from '../import-clean.ts'

const clean = (raw: string) => cleanImportedName(raw)

describe('cleanImportedName — rejections', () => {
  it('rejects a willingness', () => {
    const result = clean('Willingness to travel')
    assert.equal(result.rejected, 'an attitude, not a skill')
  })

  it('rejects a degree', () => {
    assert.notEqual(clean('Relevant university degree').rejected, null)
    assert.notEqual(clean("Bachelor's degree in Computer Science").rejected, null)
  })

  it('rejects a length of service', () => {
    assert.notEqual(clean('5+ years of experience').rejected, null)
  })

  it('rejects a personal trait', () => {
    assert.notEqual(clean('Team player').rejected, null)
    assert.notEqual(clean('Attention to detail').rejected, null)
  })

  it('rejects a licence and a work permit', () => {
    assert.notEqual(clean("Driver's licence").rejected, null)
    assert.notEqual(clean('EU work permit').rejected, null)
  })
})

describe('cleanImportedName — the names CareerOS actually sends', () => {
  const cases: ReadonlyArray<[string, string]> = [
    ['Built a GenAI', 'GenAI'],
    ['Consulting experience', 'Consulting'],
    ['Data Science experience', 'Data Science'],
    ['Fundamental knowledge of generative AI', 'generative AI'],
    ['Fundamental knowledge of machine learning', 'machine learning'],
    ['German language proficiency C1', 'German'],
    ['ML Engineering experience', 'ML Engineering'],
    ['ML project', 'ML'],
    ['Product Owner experience', 'Product Owner'],
    ['Python', 'Python'],
    ['SQL', 'SQL'],
  ]

  for (const [raw, expected] of cases) {
    it(`${raw} -> ${expected}`, () => {
      const result = clean(raw)
      assert.equal(result.rejected, null, `${raw} should survive the pattern check`)
      assert.equal(result.name, expected)
    })
  }
})

describe('cleanImportedName — other shapes', () => {
  it('strips a stacked prefix', () => {
    assert.equal(clean('Strong hands-on experience with Docker').name, 'Docker')
  })

  it('strips a trailing qualifier', () => {
    assert.equal(clean('Kubernetes is a plus').name, 'Kubernetes')
  })

  it('leaves a plain technology alone', () => {
    assert.equal(clean('  PostgreSQL  ').name, 'PostgreSQL')
  })

  it('never strips a name down to nothing', () => {
    assert.equal(clean('Experience').name, 'Experience')
  })

  it('keeps a language without its level', () => {
    assert.equal(clean('English C2').name, 'English')
    assert.equal(clean('German (B2)').name, 'German')
  })
})

describe('dedupeByName', () => {
  it('collapses names that cleaning made identical', () => {
    const results = [clean('Python'), clean('Python experience'), clean('SQL')]
    assert.deepEqual(
      dedupeByName(results).map((r) => r.name),
      ['Python', 'SQL'],
    )
  })

  it('keeps every rejection, so nothing disappears silently', () => {
    const results = [clean('Willingness to travel'), clean('Willingness to relocate')]
    assert.equal(dedupeByName(results).length, 2)
  })
})
