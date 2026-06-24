import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { importModule } from './utils/testEnv.js'

const readSource = (relativePath) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')

test('premium copy model keys exist for both locales', async () => {
  const { messages } = await importModule('src/i18n/messages.bundle.js')

  for (const locale of ['en', 'uk']) {
    const premiumAccess = messages[locale]?.premiumAccess
    const premiumPage = messages[locale]?.premiumPage

    assert.equal(typeof premiumAccess?.model?.labels?.free, 'string')
    assert.equal(typeof premiumAccess?.model?.labels?.premium, 'string')
    assert.equal(typeof premiumAccess?.model?.labels?.purchase, 'string')

    assert.equal(typeof premiumAccess?.model?.readings?.free, 'string')
    assert.equal(typeof premiumAccess?.model?.readings?.premium, 'string')
    assert.equal(typeof premiumAccess?.model?.readings?.purchase, 'string')

    assert.equal(typeof premiumAccess?.model?.compatibility?.free, 'string')
    assert.equal(typeof premiumAccess?.model?.compatibility?.premium, 'string')
    assert.equal(typeof premiumAccess?.model?.compatibility?.purchase, 'string')

    assert.equal(typeof premiumAccess?.model?.horoscopeLove?.free, 'string')
    assert.equal(typeof premiumAccess?.model?.horoscopeLove?.premium, 'string')
    assert.equal(typeof premiumAccess?.model?.horoscopeLove?.purchase, 'string')

    assert.equal(typeof premiumAccess?.model?.horoscopeCareer?.free, 'string')
    assert.equal(typeof premiumAccess?.model?.horoscopeCareer?.premium, 'string')
    assert.equal(typeof premiumAccess?.model?.horoscopeCareer?.purchase, 'string')

    assert.equal(typeof premiumPage?.accessModel?.title, 'string')
    assert.equal(typeof premiumPage?.accessModel?.free, 'string')
    assert.equal(typeof premiumPage?.accessModel?.premium, 'string')
    assert.equal(typeof premiumPage?.accessModel?.purchasePrefix, 'string')
    assert.equal(typeof premiumPage?.outcome?.title, 'string')
    assert.equal(typeof premiumPage?.outcome?.text, 'string')
    assert.equal(typeof premiumPage?.outcome?.note, 'string')
    assert.equal(typeof premiumPage?.outcome?.points?.depth?.title, 'string')
    assert.equal(typeof premiumPage?.outcome?.points?.depth?.text, 'string')
    assert.equal(typeof premiumPage?.outcome?.points?.continuity?.title, 'string')
    assert.equal(typeof premiumPage?.outcome?.points?.continuity?.text, 'string')
    assert.equal(typeof premiumPage?.outcome?.points?.range?.title, 'string')
    assert.equal(typeof premiumPage?.outcome?.points?.range?.text, 'string')
    assert.equal(typeof premiumPage?.billing?.results?.activated, 'string')
    assert.equal(typeof premiumPage?.billing?.results?.updated, 'string')
    assert.equal(typeof premiumPage?.billing?.results?.cancelled, 'string')
    assert.equal(typeof premiumPage?.billing?.results?.restored, 'string')
    assert.equal(typeof premiumPage?.billing?.results?.noActive, 'string')
    assert.equal(typeof premiumPage?.notifications, 'undefined')
  }
})

test('premium lock/paywall screens use shared copy model keys', () => {
  const savedReadings = readSource('src/pages/SavedReadingsPage.vue')
  assert.match(savedReadings, /premiumAccess\.model\.labels\.free/)
  assert.match(savedReadings, /premiumAccess\.model\.labels\.premium/)
  assert.match(savedReadings, /premiumAccess\.model\.labels\.purchase/)
  assert.match(savedReadings, /premiumAccess\.model\.readings\.free/)
  assert.match(savedReadings, /premiumAccess\.model\.readings\.premium/)
  assert.match(savedReadings, /premiumAccess\.model\.readings\.purchase/)

  const compatibility = readSource('src/pages/CompatibilityPage.vue')
  assert.match(compatibility, /premiumAccess\.model\.labels\.free/)
  assert.match(compatibility, /premiumAccess\.model\.labels\.premium/)
  assert.match(compatibility, /premiumAccess\.model\.labels\.purchase/)
  assert.match(compatibility, /premiumAccess\.model\.compatibility\.free/)
  assert.match(compatibility, /premiumAccess\.model\.compatibility\.premium/)
  assert.match(compatibility, /premiumAccess\.model\.compatibility\.purchase/)

  const horoscope = readSource('src/components/main/HoroscopeComponent.vue')
  assert.match(horoscope, /premiumAccess\.cta/)
  assert.match(horoscope, /premiumAccess\.horoscope\.\$\{themeKey\}\.title/)
  assert.match(horoscope, /premiumAccess\.horoscope\.\$\{themeKey\}\.text/)

  const premiumPaywall = readSource('src/components/main/PremiumInfoComponent.vue')
  assert.match(premiumPaywall, /premiumPage\.accessModel\.title/)
  assert.match(premiumPaywall, /premiumPage\.accessModel\.free/)
  assert.match(premiumPaywall, /premiumPage\.accessModel\.premium/)
  assert.match(premiumPaywall, /premiumPage\.accessModel\.purchasePrefix/)
  assert.match(premiumPaywall, /premiumPage\.outcome\.title/)
  assert.match(premiumPaywall, /premiumPage\.outcome\.text/)
  assert.match(premiumPaywall, /premiumPage\.outcome\.note/)
  assert.match(premiumPaywall, /premiumPage\.outcome\.points\.depth\.title/)
  assert.match(premiumPaywall, /premiumPage\.outcome\.points\.continuity\.title/)
  assert.match(premiumPaywall, /premiumPage\.outcome\.points\.range\.title/)
  assert.match(premiumPaywall, /premiumAccess\.model\.labels\.free/)
  assert.match(premiumPaywall, /premiumAccess\.model\.labels\.premium/)
  assert.match(premiumPaywall, /premiumAccess\.model\.labels\.purchase/)
  assert.match(premiumPaywall, /premiumPage\.billing\.results\.activated/)
  assert.match(premiumPaywall, /premiumPage\.billing\.results\.updated/)
  assert.match(premiumPaywall, /premiumPage\.billing\.results\.cancelled/)
  assert.match(premiumPaywall, /premiumPage\.billing\.results\.restored/)
  assert.match(premiumPaywall, /premiumPage\.billing\.results\.noActive/)
  assert.doesNotMatch(premiumPaywall, /premiumPage\.notifications\./)
  assert.doesNotMatch(premiumPaywall, /Premium unlocked\./)
  assert.doesNotMatch(premiumPaywall, /Premium plan updated\./)
  assert.doesNotMatch(premiumPaywall, /Purchase cancelled\./)
  assert.doesNotMatch(premiumPaywall, /Purchase restored\./)
  assert.doesNotMatch(premiumPaywall, /No active purchases found\./)
  assert.doesNotMatch(premiumPaywall, /feat-scroll__track/)
})

test('premium copy stays aligned on compatibility preview and energy-theme wording', async () => {
  const { messages } = await importModule('src/i18n/messages.bundle.js')

  assert.equal(
    messages.en.premiumAccess.model.compatibility.free,
    'Preview only. Full compatibility report is in Premium.',
  )
  assert.equal(
    messages.en.premiumAccess.compatibility.text,
    'Free includes only a compatibility preview. Premium unlocks the full pair analysis with score breakdown and clear guidance.',
  )
  assert.equal(messages.uk.premiumAccess.model.horoscopeLove.free, 'Доступна лише щоденна тема енергії.')
  assert.equal(messages.uk.premiumAccess.model.horoscopeCareer.free, 'Доступна лише щоденна тема енергії.')
  assert.equal(messages.uk.premiumPage.free.horoscope, 'Щоденний гороскоп: тема енергії')
  assert.equal(messages.en.premiumAccess.model.readings.free, 'Today’s reading is not saved to history.')
  assert.equal(
    messages.en.premiumAccess.readings.text,
    'Free still gives you today’s tarot value, but it does not save reading history. Premium keeps every tarot session in one timeline.',
  )
  assert.equal(
    messages.en.premiumAccess.horoscope.love.text,
    'Free includes the daily energy theme. Premium adds a daily Love view with deeper relationship context.',
  )
  assert.equal(
    messages.en.premiumAccess.horoscope.career.text,
    'Free includes the daily energy theme. Premium adds daily Career guidance and practical next steps.',
  )
  assert.equal(messages.uk.premiumAccess.model.readings.free, 'Сьогоднішній розклад не зберігається в історії.')
  assert.equal(
    messages.uk.premiumAccess.readings.text,
    'Free все ще дає цінність сьогоднішнього таро, але не зберігає історію розкладів. Premium зберігає кожну сесію таро в єдину стрічку.',
  )

  // Compare-table copy now lives in i18n (premiumPage.compareTable.*), not hardcoded
  // in the component. Assert the compatibility-row "free" wording there.
  assert.equal(messages.en.premiumPage.compareTable.compatibility.free, 'Preview only')
  assert.equal(messages.uk.premiumPage.compareTable.compatibility.free, 'Лише preview')
  assert.equal(
    messages.en.premiumPage.outcome.title,
    'One deeper daily reflection practice',
  )
  assert.equal(
    messages.uk.premiumPage.outcome.title,
    'Одна глибша щоденна практика рефлексії',
  )

  const compatibility = readSource('src/pages/CompatibilityPage.vue')
  // The redesigned compatibility page renders its premium copy from the shared
  // i18n keys (no hardcoded copy strings in the source).
  assert.match(compatibility, /premiumAccess\.compatibility\.title/)
  assert.match(compatibility, /premiumAccess\.compatibility\.text/)
})

test('signup keeps birth date out of the first account step', async () => {
  const { messages } = await importModule('src/i18n/messages.bundle.js')
  const signUpScene = readSource('src/components/auth/SignUpScene.vue')

  assert.equal(
    messages.en.auth.signUpHelper,
    'Start with your email. You can add your birth date later for personal horoscope.',
  )
  assert.equal(
    messages.uk.auth.signUpHelper,
    'Почни з email. Дату народження додаси пізніше для персонального гороскопу.',
  )
  assert.match(signUpScene, /tt\('auth\.signUpHelper'\)/)
  assert.doesNotMatch(signUpScene, /id="signup-dob"/)
  assert.doesNotMatch(signUpScene, /dateOfBirth:\s*this\.trimmedDateOfBirth/)
  assert.doesNotMatch(signUpScene, /query:[\s\S]*dateOfBirth:/)
})
