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
