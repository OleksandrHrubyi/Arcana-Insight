import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from './utils/testEnv.js'

const { buildWidgetSnapshot, computeRitualProgress, WIDGET_PROMPT_MAX_CHARS } =
  await importModule('src/helpers/widgetSnapshotCore.js')

test('computeRitualProgress counts done activities over all four keys', () => {
  const done = new Set(['reflection', 'daily_card'])
  const progress = computeRitualProgress((key) => done.has(key))
  assert.deepEqual(progress, { done: 2, total: 4 })
  assert.deepEqual(computeRitualProgress(() => false), { done: 0, total: 4 })
})

test('buildWidgetSnapshot normalizes, trims and clamps', () => {
  const snapshot = buildWidgetSnapshot({
    dateKey: '2026-07-24',
    skyLine: '  Moon in Scorpio · Waxing Gibbous · Day 4  ',
    promptText: 'x'.repeat(WIDGET_PROMPT_MAX_CHARS + 50),
    progressDone: 99,
    progressTotal: 0,
  })
  assert.equal(snapshot.v, 1)
  assert.equal(snapshot.dateKey, '2026-07-24')
  assert.equal(snapshot.skyLine.startsWith('Moon in Scorpio'), true)
  assert.equal(snapshot.promptText.length, WIDGET_PROMPT_MAX_CHARS)
  assert.equal(snapshot.progressDone, 9)
  assert.equal(snapshot.progressTotal, 1)

  const empty = buildWidgetSnapshot({})
  assert.equal(empty.promptText, '')
  assert.equal(empty.progressTotal, 4)
  assert.match(empty.dateKey, /^\d{4}-\d{2}-\d{2}$/)
})
