import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canonicalise, canonicaliseOrThrow } from '../canonical.ts'

const slugOf = (input: string): string => canonicalise(input).slug
const nameOf = (input: string): string => canonicalise(input).name

test('JS and JavaScript are one skill', () => {
  assert.equal(slugOf('JS'), 'javascript')
  assert.equal(slugOf('JavaScript'), 'javascript')
  assert.equal(slugOf('javascript'), 'javascript')
  assert.equal(slugOf('java script'), 'javascript')
})

test('the stored name is the canonical spelling, not what was typed', () => {

  assert.equal(nameOf('js'), 'JavaScript')
  assert.equal(nameOf('POSTGRES'), 'PostgreSQL')
  assert.equal(nameOf('k8s'), 'Kubernetes')
})

test('the usual short forms collapse', () => {
  assert.equal(slugOf('TS'), 'typescript')
  assert.equal(slugOf('Postgres'), 'postgresql')
  assert.equal(slugOf('K8s'), 'kubernetes')
  assert.equal(slugOf('ReactJS'), 'react')
  assert.equal(slugOf('React.js'), 'react')
  assert.equal(slugOf('Node'), 'nodejs')
  assert.equal(slugOf('node.js'), 'nodejs')
})

test('Java is not JavaScript', () => {

  assert.notEqual(slugOf('Java'), 'javascript')
})

test('C, C# and C++ stay three different skills', () => {

  const c = slugOf('C')
  const sharp = slugOf('C#')
  const plus = slugOf('C++')

  assert.equal(new Set([c, sharp, plus]).size, 3)
  assert.equal(sharp, 'csharp')
  assert.equal(plus, 'cpp')
})

test('an unknown skill keeps the spelling it was given', () => {
  const result = canonicalise('Zig')
  assert.equal(result.known, false)
  assert.equal(result.name, 'Zig')
  assert.equal(result.slug, 'zig')
})

test('trailing versions are dropped', () => {
  assert.equal(slugOf('Angular 21'), 'angular')
  assert.equal(slugOf('Vue 3'), 'vue')
  assert.equal(slugOf('Zig 0.13'), 'zig')
})

test('noise words at the edges are dropped, in the middle kept', () => {
  assert.equal(slugOf('Learn Docker'), 'docker')
  assert.equal(slugOf('Docker basics'), 'docker')
  assert.equal(slugOf('the Python language'), 'python')

  assert.equal(slugOf('Test Driven Development'), 'test-driven-development')
})

test('narrowing never empties a name made only of noise words', () => {

  assert.ok(slugOf('Fundamentals').length > 0)
  assert.ok(slugOf('the').length > 0)
})

test('whitespace and case never make two skills', () => {
  assert.equal(slugOf('  TypeScript  '), slugOf('typescript'))
  assert.equal(slugOf('Next   JS'), slugOf('Next.js'))
})

test('a name with no Latin characters is refused, not silently emptied', () => {
  assert.throws(() => canonicaliseOrThrow('Ангуляр'), /Latin/)
  assert.throws(() => canonicaliseOrThrow('!!!'), /Latin/)
})
