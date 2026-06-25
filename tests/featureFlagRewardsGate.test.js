import test from 'node:test'
import assert from 'node:assert/strict'
import { installBrowserEnv, importFresh } from './utils/testEnv.js'

// Guards the pre-launch decision to park the ritual rewards store behind
// REWARDS_ENABLED. The invariant under test: a real token/badge sitting in
// inventory must NOT unlock anything while the flag is off — otherwise a leftover
// reward would bypass the paywall (the premium-leak class found in the QA sweep).

test('rewards gate: held tokens/badges report empty through the gated readers', async () => {
  const env = installBrowserEnv()
  try {
    const flags = await importFresh('src/constants/featureFlags.js')
    const inv = await importFresh('src/helpers/ritualRewardInventory.js')

    // Seed genuine rewards via the (ungated) writer.
    inv.writeGuestRewardInventory({
      items: {
        [inv.RITUAL_REWARD_KEYS.extraTarotSpread]: { quantity: 2 },
        [inv.RITUAL_REWARD_KEYS.mysticBadge]: { owned: true },
      },
    })

    // Sanity: the seed really is in inventory (proves the gate, not a bad seed, zeroes it).
    const raw = inv.readGuestRewardInventory()
    assert.equal(raw.items[inv.RITUAL_REWARD_KEYS.extraTarotSpread].quantity, 2)
    assert.equal(raw.items[inv.RITUAL_REWARD_KEYS.mysticBadge].owned, true)

    const qty = inv.getRitualRewardQuantity({ rewardKey: inv.RITUAL_REWARD_KEYS.extraTarotSpread })
    const tokenActive = inv.isRitualRewardActive({ rewardKey: inv.RITUAL_REWARD_KEYS.extraTarotSpread })
    const badgeActive = inv.isRitualRewardActive({ rewardKey: inv.RITUAL_REWARD_KEYS.mysticBadge })

    if (flags.REWARDS_ENABLED) {
      // If rewards are re-enabled later, the readers must reflect real inventory.
      assert.equal(qty, 2)
      assert.equal(tokenActive, true)
      assert.equal(badgeActive, true)
    } else {
      // Parked: every reward reads as empty regardless of what's cached.
      assert.equal(qty, 0)
      assert.equal(tokenActive, false)
      assert.equal(badgeActive, false)
    }
  } finally {
    env.restore()
  }
})

// Tripwire: re-enabling rewards must be a deliberate act. If this fails because you
// flipped the flag on purpose, update it together with finishing the rewards economy.
test('rewards gate: REWARDS_ENABLED is parked off for the first App Store release', async () => {
  const flags = await importFresh('src/constants/featureFlags.js')
  assert.equal(flags.REWARDS_ENABLED, false)
})
