import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  countSteps,
  highestCompletedStage,
  isStageComplete,
  lastWorkedStage,
  progressOf,
  summariseProgress,
  type ProgressStage,
} from '../progress.ts'
import { toSlug, toSlugOrThrow } from '../slug.ts'

const stage = (title: string, completions: readonly (string | null)[]): ProgressStage => ({
  title,
  steps: completions.map((value) => ({
    completedAt: value === null ? null : new Date(value),
  })),
})

const angular: ProgressStage[] = [
  stage('Web and TypeScript Foundations', ['2026-09-14', '2026-09-14', '2026-09-15']),
  stage('Angular Fundamentals', ['2026-09-16', '2026-09-16', '2026-09-17']),
  stage('Reactive Angular', ['2026-09-18', null, null, null]),
  stage('Signals and State', [null, null]),
]

test('progress is the share of completed steps across the whole roadmap', () => {
  const summary = summariseProgress(angular)

  assert.equal(summary.totalSteps, 12)
  assert.equal(summary.completedSteps, 7)
  assert.equal(Math.round(summary.progress * 100), 58)
})

test('the level reached is the furthest stage that is fully complete', () => {
  assert.equal(summariseProgress(angular).highestCompletedStage, 'Angular Fundamentals')
})

test('"where was I" is the stage of the most recently completed step', () => {
  const summary = summariseProgress(angular)

  assert.equal(summary.lastWorkedStage, 'Reactive Angular')
  assert.equal(summary.lastActivityAt?.toISOString().slice(0, 10), '2026-09-18')
})

test('an empty stage does not count as complete', () => {

  assert.equal(isStageComplete({ title: 'Empty', steps: [] }), false)
  assert.equal(progressOf([{ title: 'Empty', steps: [] }]), 0)
})

test('an empty roadmap yields zero rather than a division by zero', () => {
  assert.deepEqual(countSteps([]), { total: 0, completed: 0 })
  assert.equal(progressOf([]), 0)
  assert.equal(summariseProgress([]).highestCompletedStage, null)
})

test('finishing a later stage while skipping an earlier one still counts', () => {

  const jumper: ProgressStage[] = [
    stage('One', ['2026-09-01', null]),
    stage('Two', [null]),
    stage('Three', [null]),
    stage('Four', ['2026-09-10', '2026-09-11']),
  ]

  assert.equal(highestCompletedStage(jumper)?.title, 'Four')
})

test('the last worked stage follows time, not stage order', () => {

  const messy: ProgressStage[] = [
    stage('One', ['2026-09-20', null]),
    stage('Two', [null]),
    stage('Three', ['2026-09-02', null]),
  ]

  assert.equal(lastWorkedStage(messy)?.title, 'One')
  assert.equal(highestCompletedStage(messy), null)
})

test('different spellings of one skill collapse to the same slug', () => {
  assert.equal(toSlug('  Angular  '), 'angular')
  assert.equal(toSlug('ANGULAR'), 'angular')
  assert.equal(toSlug('Angular 21'), 'angular-21')
  assert.equal(toSlug('CI/CD'), 'ci-cd')
  assert.equal(toSlug('Node.js'), 'node-js')
})

test('accented Latin is folded rather than dropped', () => {
  assert.equal(toSlug('Café'), 'cafe')
})

test('input that cannot produce a slug is refused, not silently emptied', () => {

  assert.equal(toSlug('   '), '')
  assert.throws(() => toSlugOrThrow('Ангуляр'), /Latin letters/)
  assert.equal(toSlugOrThrow('Angular'), 'angular')
})
