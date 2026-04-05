import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PREMIUM_COMPARE_ROWS,
  PREMIUM_FREE_ITEM_KEYS,
  PREMIUM_MODEL_LIMITS,
  getPremiumBillingIncludeKeys,
  getPremiumDetailItems,
} from '../src/constants/premiumModel.js'

test('premium include keys switch between AI and structured interpretation labels', () => {
  const aiKeys = getPremiumBillingIncludeKeys({ tarotAiEnabled: true })
  const basicKeys = getPremiumBillingIncludeKeys({ tarotAiEnabled: false })

  assert.equal(aiKeys.includes('premiumPage.billing.includes.deepInterpretation'), true)
  assert.equal(aiKeys.includes('premiumPage.billing.includes.structuredInterpretation'), false)

  assert.equal(basicKeys.includes('premiumPage.billing.includes.deepInterpretation'), false)
  assert.equal(basicKeys.includes('premiumPage.billing.includes.structuredInterpretation'), true)
})

test('premium detail items switch between AI and structured interpretation blocks', () => {
  const aiItems = getPremiumDetailItems({ tarotAiEnabled: true })
  const basicItems = getPremiumDetailItems({ tarotAiEnabled: false })

  assert.equal(aiItems.some((item) => item.titleKey === 'premiumPage.premiumDetails.fullInterpretation.title'), true)
  assert.equal(aiItems.some((item) => item.titleKey === 'premiumPage.premiumDetails.structuredInterpretation.title'), false)

  assert.equal(basicItems.some((item) => item.titleKey === 'premiumPage.premiumDetails.fullInterpretation.title'), false)
  assert.equal(
    basicItems.some((item) => item.titleKey === 'premiumPage.premiumDetails.structuredInterpretation.title'),
    true,
  )
})

test('premium constants define stable free and compare lists', () => {
  assert.equal(PREMIUM_FREE_ITEM_KEYS.length >= 5, true)
  assert.equal(PREMIUM_COMPARE_ROWS.length, 3)
  assert.equal(PREMIUM_MODEL_LIMITS.freeTarotSessionsPerDay, 1)
  assert.equal(PREMIUM_MODEL_LIMITS.premiumTarotMaxCards, 5)
  assert.deepEqual(PREMIUM_MODEL_LIMITS.freeHoroscopeThemes, ['energy'])
})
