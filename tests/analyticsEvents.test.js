import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { importModule } from './utils/testEnv.js'

test('paywall funnel analytics constants expose required event set', async () => {
  const { PAYWALL_FUNNEL_EVENTS, REQUIRED_PAYWALL_FUNNEL_EVENTS } = await importModule(
    'src/constants/analyticsEvents.js',
  )

  assert.deepEqual(PAYWALL_FUNNEL_EVENTS, {
    paywallView: 'paywall_view',
    paywallClose: 'paywall_close',
    purchaseClick: 'purchase_click',
    purchaseSuccess: 'purchase_success',
    purchaseError: 'purchase_error',
    restoreSuccess: 'restore_success',
    trialStart: 'trial_start',
  })

  assert.deepEqual(REQUIRED_PAYWALL_FUNNEL_EVENTS, [
    'paywall_view',
    'paywall_close',
    'purchase_click',
    'purchase_success',
    'purchase_error',
    'restore_success',
    'trial_start',
  ])

  assert.equal(new Set(REQUIRED_PAYWALL_FUNNEL_EVENTS).size, REQUIRED_PAYWALL_FUNNEL_EVENTS.length)
})

test('onboarding analytics constants expose required event set', async () => {
  const { ONBOARDING_EVENTS, REQUIRED_ONBOARDING_EVENTS } = await importModule(
    'src/constants/analyticsEvents.js',
  )

  assert.deepEqual(ONBOARDING_EVENTS, {
    onboardingView: 'onboarding_view',
    interestSelect: 'interest_select',
    continueClick: 'continue_click',
    skipClick: 'skip_click',
    firstActionClick: 'first_action_click',
    firstActionComplete: 'first_action_complete',
  })

  assert.deepEqual(REQUIRED_ONBOARDING_EVENTS, [
    'onboarding_view',
    'interest_select',
    'continue_click',
    'skip_click',
    'first_action_click',
    'first_action_complete',
  ])

  assert.equal(new Set(REQUIRED_ONBOARDING_EVENTS).size, REQUIRED_ONBOARDING_EVENTS.length)
})

test('PremiumInfoComponent uses paywall funnel constants and avoids hardcoded event strings', async () => {
  const componentPath = path.resolve(
    process.cwd(),
    'src/components/main/PremiumInfoComponent.vue',
  )
  const source = fs.readFileSync(componentPath, 'utf8')

  assert.match(source, /PAYWALL_FUNNEL_EVENTS\.paywallView/)
  assert.match(source, /PAYWALL_FUNNEL_EVENTS\.paywallClose/)
  assert.match(source, /PAYWALL_FUNNEL_EVENTS\.purchaseClick/)
  assert.match(source, /PAYWALL_FUNNEL_EVENTS\.purchaseSuccess/)
  assert.match(source, /PAYWALL_FUNNEL_EVENTS\.purchaseError/)
  assert.match(source, /PAYWALL_FUNNEL_EVENTS\.restoreSuccess/)
  assert.match(source, /PAYWALL_FUNNEL_EVENTS\.trialStart/)

  const rawEventStrings = [
    "'paywall_view'",
    "'paywall_close'",
    "'purchase_click'",
    "'purchase_success'",
    "'purchase_error'",
    "'restore_success'",
    "'trial_start'",
  ]

  for (const token of rawEventStrings) {
    assert.equal(source.includes(token), false, `hardcoded event remains in component: ${token}`)
  }
})

test('OnboardingComponent uses onboarding constants and avoids hardcoded onboarding event strings', async () => {
  const componentPath = path.resolve(
    process.cwd(),
    'src/components/main/OnboardingComponent.vue',
  )
  const source = fs.readFileSync(componentPath, 'utf8')

  assert.match(source, /ONBOARDING_EVENTS\.onboardingView/)
  assert.match(source, /ONBOARDING_EVENTS\.interestSelect/)
  assert.match(source, /ONBOARDING_EVENTS\.continueClick/)
  assert.match(source, /ONBOARDING_EVENTS\.skipClick/)

  const rawEventStrings = [
    "'onboarding_view'",
    "'interest_select'",
    "'continue_click'",
    "'skip_click'",
  ]

  for (const token of rawEventStrings) {
    assert.equal(source.includes(token), false, `hardcoded event remains in onboarding component: ${token}`)
  }
})
