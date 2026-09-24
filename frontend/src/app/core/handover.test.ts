import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isHandoverUrl, loginUrlFor, parseHandover } from './handover.ts'

describe('parseHandover', () => {
  it('reads a single skill', () => {
    const result = parseHandover('?skills=Built+a+GenAI&source=careeros')
    assert.deepEqual(result.skills, ['Built a GenAI'])
    assert.equal(result.source, 'careeros')
  })

  it('reads the comma separated set CareerOS sends', () => {
    const query =
      '?skills=Built+a+GenAI%2CConsulting+experience%2CPython%2CSQL&source=careeros'
    const result = parseHandover(query)

    assert.deepEqual(result.skills, [
      'Built a GenAI',
      'Consulting experience',
      'Python',
      'SQL',
    ])
  })

  it('drops empty entries and trims the rest', () => {
    const result = parseHandover('?skills=+Python+%2C%2C+SQL+%2C')
    assert.deepEqual(result.skills, ['Python', 'SQL'])
  })

  it('caps the list at twenty, matching the server', () => {
    const many = Array.from({ length: 30 }, (_, i) => `Skill ${i}`).join(',')
    assert.equal(parseHandover(`?skills=${encodeURIComponent(many)}`).skills.length, 20)
  })

  it('answers with an empty list when there is no parameter', () => {
    assert.deepEqual(parseHandover('?source=careeros').skills, [])
  })
})

describe('isHandoverUrl', () => {
  it('recognises the handover path', () => {
    assert.equal(isHandoverUrl('/roadmap', '?skills=Python'), true)
  })

  it('recognises any url carrying a source', () => {
    assert.equal(isHandoverUrl('/', '?source=careeros'), true)
  })

  it('leaves an ordinary url alone', () => {
    assert.equal(isHandoverUrl('/skills/react', ''), false)
  })
})

describe('loginUrlFor', () => {
  it('encodes the whole url so the server can send us back', () => {
    assert.equal(
      loginUrlFor('/roadmap', '?skills=Python%2CSQL&source=careeros', ''),
      '/auth/login?returnTo=%2Froadmap%3Fskills%3DPython%252CSQL%26source%3Dcareeros',
    )
  })
})
