import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const readSource = (relativePath) => {
  const absolutePath = path.resolve(process.cwd(), relativePath)
  return fs.readFileSync(absolutePath, 'utf8')
}

test('home daily hero keeps reveal state separate from daily_card completion', () => {
  const source = readSource('src/components/main/LandingScene.vue')

  assert.match(source, /hasRevealedDailyCardOnHomeToday: false/)
  assert.match(source, /isHeroCardRevealed\(\)\s*\{\s*return this\.hasDailyCardToday \|\| this\.hasRevealedDailyCardOnHomeToday/s)
  assert.match(source, /persistHomeDailyCardRevealState\(true\)/)
  assert.doesNotMatch(source, /markDailyActivity\(DAILY_ACTIVITY_KEYS\.dailyCard\)/)
  assert.match(source, /done: this\.hasDailyCardToday/)
})

test('home daily hero reveal persists per day without changing progress semantics', () => {
  const source = readSource('src/components/main/LandingScene.vue')

  assert.match(source, /const HOME_DAILY_CARD_REVEAL_PREFIX = 'arcana_home_daily_card_revealed_v1:'/)
  assert.match(source, /getHomeDailyCardRevealStorageKey\(dateKey = localISODate\(\)\)/)
  assert.match(source, /readHomeDailyCardRevealState\(dateKey = localISODate\(\)\)/)
  assert.match(source, /this\.hasRevealedDailyCardOnHomeToday =\s*this\.hasDailyCardToday \|\| this\.readHomeDailyCardRevealState\(\)/s)
})
