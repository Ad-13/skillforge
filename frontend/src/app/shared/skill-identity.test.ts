import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { hueFor, initialsFor } from './skill-identity.ts'

describe('initialsFor', () => {
  it('takes the first two letters of a single word', () => {
    assert.equal(initialsFor('React'), 'Re')
    assert.equal(initialsFor('docker'), 'Do')
  })

  it('takes the capitals of a camel-cased name', () => {
    assert.equal(initialsFor('TypeScript'), 'TS')
    assert.equal(initialsFor('JavaScript'), 'JS')
  })

  it('ignores punctuation inside a single word', () => {
    assert.equal(initialsFor('Node.js'), 'No')
  })

  it('takes one letter from each of the first two words', () => {
    assert.equal(initialsFor('Generative AI'), 'GA')
    assert.equal(initialsFor('machine learning basics'), 'ML')
  })

  it('never returns an empty string', () => {
    assert.equal(initialsFor('  '), '?')
    assert.equal(initialsFor('#'), '?')
  })
})

describe('hueFor', () => {
  it('is stable for the same slug', () => {
    assert.equal(hueFor('react'), hueFor('react'))
  })

  it('returns a hex colour', () => {
    assert.match(hueFor('anything'), /^#[0-9a-f]{6}$/)
  })
})
