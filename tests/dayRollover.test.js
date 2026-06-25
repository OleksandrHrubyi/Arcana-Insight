import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from './utils/testEnv.js'

// QA findings #9/#10: Horoscope + Daily Card stayed on yesterday after the local
// day rolled over while the app was backgrounded (iOS freezes JS timers). The
// resume handlers use isDayKeyStale to decide whether to refresh.

test('isDayKeyStale is true only when a rendered day key differs from today', async () => {
  const { isDayKeyStale } = await importModule('src/helpers/dayRollover.js')
  assert.equal(isDayKeyStale('2026-06-24', '2026-06-25'), true)
  assert.equal(isDayKeyStale('2026-06-25', '2026-06-25'), false)
})

test('isDayKeyStale is false when nothing has been rendered yet (no spurious refresh)', async () => {
  const { isDayKeyStale } = await importModule('src/helpers/dayRollover.js')
  assert.equal(isDayKeyStale('', '2026-06-25'), false)
  assert.equal(isDayKeyStale(null, '2026-06-25'), false)
  assert.equal(isDayKeyStale(undefined, '2026-06-25'), false)
})
