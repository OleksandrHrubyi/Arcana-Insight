import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule, installBrowserEnv } from './utils/testEnv.js'

test('resolveRewardState returns expected state by completion and claimability', async () => {
  const { resolveRewardState, ENERGY_REWARD_STATES } = await importModule(
    'src/helpers/energySheetState.js',
  )

  assert.equal(
    resolveRewardState({
      ritualDoneCount: 1,
      canClaimReward: false,
      hasClaimedToday: false,
    }),
    ENERGY_REWARD_STATES.inProgress,
  )

  assert.equal(
    resolveRewardState({
      ritualDoneCount: 3,
      canClaimReward: true,
      hasClaimedToday: false,
    }),
    ENERGY_REWARD_STATES.readyToClaim,
  )

  assert.equal(
    resolveRewardState({
      ritualDoneCount: 3,
      canClaimReward: false,
      hasClaimedToday: true,
    }),
    ENERGY_REWARD_STATES.claimedToday,
  )
})

test('resolveNextRitualRoute picks first incomplete ritual route', async () => {
  const { resolveNextRitualRoute } = await importModule('src/helpers/energySheetState.js')

  assert.equal(
    resolveNextRitualRoute({
      hasDailyCardToday: false,
      hasHoroscopeToday: false,
      hasTarotToday: false,
    }),
    'arcana',
  )
  assert.equal(
    resolveNextRitualRoute({
      hasDailyCardToday: true,
      hasHoroscopeToday: false,
      hasTarotToday: false,
    }),
    'horoscope',
  )
  assert.equal(
    resolveNextRitualRoute({
      hasDailyCardToday: true,
      hasHoroscopeToday: true,
      hasTarotToday: false,
    }),
    'tarot',
  )
  assert.equal(
    resolveNextRitualRoute({
      hasDailyCardToday: true,
      hasHoroscopeToday: true,
      hasTarotToday: true,
    }),
    'arcana',
  )
})

test('computeRewardProgress clamps percent to 0..100', async () => {
  const { computeRewardProgress } = await importModule('src/helpers/energySheetState.js')

  assert.deepEqual(
    computeRewardProgress({
      pointsBalance: 10,
      targetPoints: 20,
    }),
    { points: 10, target: 20, percent: 50 },
  )

  assert.deepEqual(
    computeRewardProgress({
      pointsBalance: 999,
      targetPoints: 20,
    }),
    { points: 999, target: 20, percent: 100 },
  )
})

test('resolveEnergySheetVariant uses explicit value, storage value, then fallback', async () => {
  const env = installBrowserEnv({
    arcana_energy_sheet_variant: 'premium-lite',
  })
  try {
    const {
      resolveEnergySheetVariant,
      DEFAULT_ENERGY_SHEET_VARIANT,
    } = await importModule('src/constants/energySheetVariants.js')

    assert.equal(resolveEnergySheetVariant('premium'), 'premium')
    assert.equal(resolveEnergySheetVariant('unknown'), 'premium-lite')

    env.localStorage.setItem('arcana_energy_sheet_variant', 'invalid-value')
    assert.equal(resolveEnergySheetVariant('invalid'), DEFAULT_ENERGY_SHEET_VARIANT)
  } finally {
    env.restore()
  }
})
