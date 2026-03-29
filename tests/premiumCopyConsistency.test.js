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
  assert.match(horoscope, /premiumAccess\.model\.labels\.free/)
  assert.match(horoscope, /premiumAccess\.model\.labels\.premium/)
  assert.match(horoscope, /premiumAccess\.model\.labels\.purchase/)
  assert.match(horoscope, /premiumAccess\.model\.\$\{featureKey\}\.free/)
  assert.match(horoscope, /premiumAccess\.model\.\$\{featureKey\}\.premium/)
  assert.match(horoscope, /premiumAccess\.model\.\$\{featureKey\}\.purchase/)

  const premiumPaywall = readSource('src/components/main/PremiumInfoComponent.vue')
  assert.match(premiumPaywall, /premiumPage\.accessModel\.title/)
  assert.match(premiumPaywall, /premiumPage\.accessModel\.free/)
  assert.match(premiumPaywall, /premiumPage\.accessModel\.premium/)
  assert.match(premiumPaywall, /premiumPage\.accessModel\.purchasePrefix/)
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
})
