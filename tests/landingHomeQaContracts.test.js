import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const readSource = (relativePath) => {
  const absolutePath = path.resolve(process.cwd(), relativePath)
  return fs.readFileSync(absolutePath, 'utf8')
}

test('home qa mode stays dev-only and query-gated', () => {
  const source = readSource('src/components/main/LandingScene.vue')

  assert.match(source, /if \(!import\.meta\.env\.DEV \|\| typeof window === 'undefined'\) return null/)
  assert.match(source, /params\.get\('qa'\) !== HOME_QA_QUERY_VALUE/)
  assert.match(source, /if \(!this\.qaHomeConfig\) {\s*void this\.initializeLandingAuthSafe\(\)\s*}/s)
  assert.match(source, /if \(this\.qaHomeConfig\) {\s*this\.applyHomeQaState\(\)\s*return\s*}/s)
})

test('home qa mode exposes fresh and revealed deterministic states', () => {
  const source = readSource('src/components/main/LandingScene.vue')

  assert.match(source, /rawView === 'revealed' \|\| rawView === 'generic' \? rawView : 'fresh'/)
  assert.match(source, /this\.qaNow = new Date\('2026-04-29T09:18:00'\)/)
  assert.match(source, /this\.dailyCardData = \{/)
  assert.match(source, /this\.horoscopeData =\s*qaConfig\.view === 'generic'\s*\?\s*null/s)
  assert.match(source, /if \(qaConfig\.view === 'revealed'\)/)
})

// B5 (launch audit): onHomeResume fires on EVERY visibilitychange→visible. It must
// not blank focus-today and refetch the same day's cached content on a plain
// app-switch — content reload is allowed only on a day rollover (the original N1
// fix) or when the previous load never completed (recovery). Local progress flags
// stay refreshed on every foreground.
test('home resume reloads content only on day-roll or failed previous load', () => {
  const source = readSource('src/components/main/LandingScene.vue')

  const resume = source.match(/onHomeResume\(\)\s*\{[\s\S]*?\n    \},/)?.[0] || ''
  assert.ok(resume, 'onHomeResume must exist')
  assert.match(resume, /if \(dayRolled \|\| !this\.dailyCardData\) void this\.loadLandingContent\(\)/)
  assert.doesNotMatch(resume, /^\s*void this\.loadLandingContent\(\)$/m, 'content reload must not be unconditional')
  assert.match(resume, /this\.refreshHomeProgressState\(\)/)
  assert.match(resume, /if \(dayRolled\) void this\.computeAstro\(\)/)
})

// C14 (launch audit): the daily reveal flag is written under a dated key and was
// never pruned — one orphan localStorage key accumulated per day forever.
test('stale dated home-reveal keys are pruned on mount', () => {
  const source = readSource('src/components/main/LandingScene.vue')
  assert.match(source, /pruneStaleHomeDailyCardRevealKeys\(today\)/)
  assert.match(source, /key\.startsWith\(HOME_DAILY_CARD_REVEAL_PREFIX\) && key !== keepKey/)
})
