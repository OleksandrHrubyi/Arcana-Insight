import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const readSource = (relativePath) => {
  const absolutePath = path.resolve(process.cwd(), relativePath)
  return fs.readFileSync(absolutePath, 'utf8')
}

test('App bootstrap refreshes premium entitlement on mount and app resume', () => {
  const appSource = readSource('src/App.vue')
  const authBootSource = readSource('src/boot/auth.ts')

  assert.match(appSource, /void initPushListenersSafe\(\)/)
  assert.match(appSource, /void syncPremiumStatusSafe\(\)/)
  assert.match(authBootSource, /App\.addListener\('appStateChange'/)
  assert.match(authBootSource, /if \(!isActive\) \{/)
  assert.match(authBootSource, /runAuthTask\('syncSession\(appState\)'/)
})

test('key premium screens keep explicit access gating and sync hooks', () => {
  const savedReadings = readSource('src/pages/SavedReadingsPage.vue')
  assert.match(savedReadings, /<section v-if="!hasPremiumAccess" class="readings-lock">/)
  assert.match(savedReadings, /watch\(hasPremiumAccess, \(next\) => \{/)
  assert.match(savedReadings, /if \(!next\) \{\s*applyEmptySavedReadingsState\(\)/s)
  assert.match(savedReadings, /void loadReadingsSafe\(\)/)

  const compatibility = readSource('src/pages/CompatibilityPage.vue')
  // Redesigned page gates premium per-dimension (isDimLocked) plus an unlock
  // card, both reactive to hasPremiumAccess; paywall analytics + route preserved.
  assert.match(compatibility, /v-if="!hasPremiumAccess"/)
  assert.match(compatibility, /isDimLocked/)
  assert.match(compatibility, /PAYWALL_ENTRY_POINTS\.compatibilityLock/)
  assert.match(compatibility, /name:\s*'premium'[\s\S]*source:\s*point\.source/)

  const horoscope = readSource('src/components/main/HoroscopeComponent.vue')
  assert.match(horoscope, /watch:\s*\{[\s\S]*hasPremiumAccess\(next\)/)
  assert.match(horoscope, /if \(!next && this\.themeTab !== FREE_HOROSCOPE_THEME\)/)
  assert.match(horoscope, /isThemeLocked\(tab\)\s*\{[\s\S]*if \(this\.hasPremiumAccess\) return false/s)

  const tarotOracle = readSource('src/components/TarotOraclePage.vue')
  assert.match(tarotOracle, /if \(spread === 1 && !hasPremiumAccess\.value && hasUsedFreeTarotToday\(\)\)/)
  assert.match(tarotOracle, /if \(!hasPremiumAccess\.value && hasUsedFreeTarotToday\(\)\)/)
  // Non-premium still falls back to the deterministic basic interpretation, but the
  // first AI reading per account is granted (server-enforced) before that fallback.
  assert.match(tarotOracle, /if \(!hasPremiumAccess\.value\) \{/)
  assert.match(tarotOracle, /if \(isLoggedIn && tarotAiEnabled && !readFreeAiTarotUsed\(\)\)/)
  assert.match(tarotOracle, /markFreeAiTarotUsed\(\)/)
  assert.match(tarotOracle, /const data = buildBasicInterpretation\(payload\)/)

  const premiumScreen = readSource('src/components/main/PremiumInfoComponent.vue')
  assert.match(
    premiumScreen,
    /applyPremiumAccessStatus\(\{ active: true, plan: result\.plan, source: 'billing' \}\)/,
  )
  assert.match(
    premiumScreen,
    /applyPremiumAccessStatus\(\{ active: false, plan: 'monthly', source: 'billing' \}\)/,
  )
})

test('paywall keeps a single primary entry and tags all other entries as secondary', () => {
  const tarotInterpretation = readSource('src/pages/TarotInterpretationPage.vue')
  assert.match(tarotInterpretation, /PAYWALL_ENTRY_POINTS\.tarotPostSession/)
  assert.match(tarotInterpretation, /analytics\.logEvent\(point\.event/)
  assert.match(tarotInterpretation, /name:\s*'premium'[\s\S]*source:\s*point\.source/)

  const tarotOracle = readSource('src/components/TarotOraclePage.vue')
  assert.match(tarotOracle, /PAYWALL_ENTRY_POINTS\.tarotDailyLimit/)
  assert.match(tarotOracle, /PAYWALL_ENTRY_POINTS\.tarotSpreadLock/)
  assert.match(tarotOracle, /analytics\.logEvent\(point\.event/)

  const savedReadings = readSource('src/pages/SavedReadingsPage.vue')
  assert.match(savedReadings, /PAYWALL_ENTRY_POINTS\.readingsLock/)
  assert.match(savedReadings, /analytics\.logEvent\(point\.event/)
  assert.match(savedReadings, /name:\s*'premium'[\s\S]*source:\s*point\.source[\s\S]*entry:\s*point\.entry/)

  const compatibility = readSource('src/pages/CompatibilityPage.vue')
  assert.match(compatibility, /PAYWALL_ENTRY_POINTS\.compatibilityLock/)
  assert.match(compatibility, /analytics\.logEvent\(point\.event/)
  assert.match(compatibility, /name:\s*'premium'[\s\S]*source:\s*point\.source[\s\S]*entry:\s*point\.entry/)

  const horoscope = readSource('src/components/main/HoroscopeComponent.vue')
  assert.match(horoscope, /PAYWALL_ENTRY_POINTS\.horoscopeLock/)
  assert.match(horoscope, /analytics\.logEvent\(point\.event/)
  assert.match(horoscope, /name:\s*'premium'[\s\S]*source:\s*point\.source[\s\S]*entry:\s*point\.entry/)

  const menu = readSource('src/components/main/MenuComponent.vue')
  assert.match(menu, /PAYWALL_ENTRY_POINTS\.menuPremium/)
  assert.match(menu, /analytics\.logEvent\(point\.event/)
  assert.match(menu, /name:\s*item\.routeName[\s\S]*source:\s*point\.source[\s\S]*entry:\s*point\.entry/)
})
