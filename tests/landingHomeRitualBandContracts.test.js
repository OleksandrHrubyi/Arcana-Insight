import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

// RP-03 contract: the ritual band is the primary above-the-fold CTA on Home.
// It must reuse the existing openNextRitual flow (reflection-first → /journal)
// and fully replace the old .daily-track chip. These are source-literal checks —
// renaming the handler or resurrecting the chip should fail loudly.

const source = readFileSync(
  path.resolve(process.cwd(), 'src/components/main/LandingScene.vue'),
  'utf8',
)

test('ritual band exists, reuses openNextRitual and the progress aria label', () => {
  assert.match(source, /class="ritual-band"/)
  assert.match(source, /@click="openNextRitual"/)
  assert.match(source, /:aria-label="dailyProgressAriaLabel"/)
})

test('old daily-track chip is fully replaced by the band', () => {
  assert.doesNotMatch(source, /class="daily-track"/)
})

test('funnel continuity: daily_track entry name is preserved', () => {
  assert.match(source, /query: \{ source: 'landing', entry: 'daily_track' \}/)
})

test('sky line degrades gracefully when astro is unavailable', () => {
  assert.match(source, /ritualBandSkyLine\(\) \{/)
  assert.match(source, /if \(!d\) return ''/)
  assert.match(source, /v-if="ritualBandSkyLine"/)
})
