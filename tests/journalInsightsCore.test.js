import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from './utils/testEnv.js'

const ins = await importModule('src/helpers/journalInsightsCore.js')

const mk = (dateKey, mood, phase) => ({ dateKey, mood, body: 'x', sky: phase ? { moonPhaseKey: phase } : undefined })

test('computeJournalInsights aggregates mood distribution + phases within the window', () => {
  const today = '2026-07-30'
  const entries = [
    mk('2026-07-30', 'calm', 'full'),
    mk('2026-07-29', 'calm', 'waningGibbous'),
    mk('2026-07-28', 'bright', 'waningGibbous'),
    mk('2026-06-01', 'low', 'new'), // outside 30-day window → excluded
  ]
  const r = ins.computeJournalInsights(entries, { todayKey: today })
  assert.equal(r.totalEntries, 3, 'old entry excluded')
  assert.equal(r.moods[0].key, 'calm')
  assert.equal(r.moods[0].count, 2)
  assert.equal(r.moods[0].pct, 67) // 2 of 3 mood-tagged
  assert.equal(r.phases[0].key, 'waningGibbous') // most common phase
})

test('computeJournalInsights returns null when there is nothing in the window', () => {
  assert.equal(ins.computeJournalInsights([], { todayKey: '2026-07-30' }), null)
  assert.equal(ins.computeJournalInsights([mk('2026-01-01', 'calm')], { todayKey: '2026-07-30' }), null)
})

test('streak counts consecutive days ending today, breaks on a gap', () => {
  assert.equal(ins.computeJournalStreak(['2026-07-30', '2026-07-29', '2026-07-28'], '2026-07-30'), 3)
  // gap on the 29th → only today counts
  assert.equal(ins.computeJournalStreak(['2026-07-30', '2026-07-28'], '2026-07-30'), 1)
  // no entry today but yesterday → streak still alive
  assert.equal(ins.computeJournalStreak(['2026-07-29', '2026-07-28'], '2026-07-30'), 2)
  // last entry 2 days ago → streak broken
  assert.equal(ins.computeJournalStreak(['2026-07-28'], '2026-07-30'), 0)
  assert.equal(ins.computeJournalStreak([], '2026-07-30'), 0)
})
