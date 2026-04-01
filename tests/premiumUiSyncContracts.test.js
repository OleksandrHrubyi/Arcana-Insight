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
  assert.match(compatibility, /<section v-if="hasPremiumAccess" class="compat-stack">/)
  assert.match(compatibility, /name:\s*'premium'[\s\S]*source:\s*'compatibility_lock'/)
  assert.match(compatibility, /watch\(\s*\(\) => hasPremiumAccess\.value,\s*\(next\) => \{/s)

  const horoscope = readSource('src/components/main/HoroscopeComponent.vue')
  assert.match(horoscope, /watch:\s*\{[\s\S]*hasPremiumAccess\(next\)/)
  assert.match(horoscope, /if \(!next && this\.themeTab !== FREE_HOROSCOPE_THEME\)/)
  assert.match(horoscope, /isThemeLocked\(tab\)\s*\{[\s\S]*if \(this\.hasPremiumAccess\) return false/s)

  const tarotOracle = readSource('src/components/TarotOraclePage.vue')
  assert.match(tarotOracle, /if \(spread === 1 && !hasPremiumAccess\.value && hasUsedFreeTarotToday\(\)\)/)
  assert.match(tarotOracle, /if \(!hasPremiumAccess\.value && hasUsedFreeTarotToday\(\)\)/)
  assert.match(tarotOracle, /if \(!hasPremiumAccess\.value\) \{\s*const data = buildBasicInterpretation\(payload\)/s)

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
  assert.match(tarotInterpretation, /analytics\.logEvent\('paywall_entry_primary'/)
  assert.match(tarotInterpretation, /source:\s*'tarot_post_session'/)
  assert.match(tarotInterpretation, /entry:\s*'interpretation_aha'/)
  assert.match(tarotInterpretation, /name:\s*'premium'[\s\S]*source:\s*'tarot_post_session'/)

  const tarotOracle = readSource('src/components/TarotOraclePage.vue')
  assert.match(tarotOracle, /analytics\.logEvent\('paywall_entry_secondary'/)
  assert.match(tarotOracle, /entry:\s*'notify_action'/)

  const savedReadings = readSource('src/pages/SavedReadingsPage.vue')
  assert.match(savedReadings, /name:\s*'premium'[\s\S]*source:\s*'readings_lock'[\s\S]*entry:\s*'secondary'/)

  const compatibility = readSource('src/pages/CompatibilityPage.vue')
  assert.match(compatibility, /name:\s*'premium'[\s\S]*source:\s*'compatibility_lock'[\s\S]*entry:\s*'secondary'/)

  const horoscope = readSource('src/components/main/HoroscopeComponent.vue')
  assert.match(horoscope, /name:\s*'premium'[\s\S]*source:\s*'horoscope_lock'[\s\S]*entry:\s*'secondary'/)

  const menu = readSource('src/components/main/MenuComponent.vue')
  assert.match(menu, /name:\s*item\.routeName[\s\S]*source:\s*'menu_premium'[\s\S]*entry:\s*'secondary'/)
})
