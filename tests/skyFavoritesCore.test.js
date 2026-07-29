import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from './utils/testEnv.js'

const fav = await importModule('src/helpers/skyFavoritesCore.js')

test('favoriteId rounds coords so the same place is one id', () => {
  assert.equal(fav.favoriteId({ lat: 50.4501, lon: 30.5234 }), fav.favoriteId({ lat: 50.45009, lon: 30.52344 }))
  assert.notEqual(fav.favoriteId({ lat: 50.45, lon: 30.52 }), fav.favoriteId({ lat: 51.5, lon: -0.12 }))
})

test('normalizeFavorites filters invalid + dedupes by rounded coords', () => {
  const out = fav.normalizeFavorites([
    { lat: 50.4501, lon: 30.5234, cityKey: 'kyiv' },
    { lat: 50.45012, lon: 30.52338 }, // rounds to same id → dropped
    { lat: 'x', lon: 1 }, // invalid → dropped
    null,
    { lat: 51.5, lon: -0.12, cityKey: 'london' },
  ])
  assert.equal(out.length, 2)
  assert.equal(out[0].cityKey, 'kyiv')
  assert.equal(out[1].cityKey, 'london')
  assert.ok(out.every((f) => typeof f.id === 'string'))
})

test('free users are limited to FREE_FAVORITE_LIMIT; premium is unlimited', () => {
  assert.equal(fav.FREE_FAVORITE_LIMIT, 1)
  const one = [{ lat: 50.45, lon: 30.52 }]
  assert.equal(fav.canSaveFavorite([], false), true)
  assert.equal(fav.canSaveFavorite(one, false), false) // at free limit
  assert.equal(fav.canSaveFavorite(one, true), true) // premium bypasses
})

test('applyFavoriteToggle: add, remove, and block at the free limit (no mutation)', () => {
  const kyiv = { lat: 50.45, lon: 30.52, cityKey: 'kyiv' }
  const london = { lat: 51.5, lon: -0.12, cityKey: 'london' }

  const added = fav.applyFavoriteToggle([], kyiv, false)
  assert.equal(added.result, 'added')
  assert.equal(added.list.length, 1)

  // free user already has 1 → adding a second is blocked, list unchanged
  const blocked = fav.applyFavoriteToggle(added.list, london, false)
  assert.equal(blocked.result, 'blocked')
  assert.equal(blocked.list.length, 1)

  // premium user can add the second
  const second = fav.applyFavoriteToggle(added.list, london, true)
  assert.equal(second.result, 'added')
  assert.equal(second.list.length, 2)

  // toggling an existing favorite removes it (even for free users)
  const removed = fav.applyFavoriteToggle(added.list, kyiv, false)
  assert.equal(removed.result, 'removed')
  assert.equal(removed.list.length, 0)

  // input arrays are never mutated
  assert.equal(added.list.length, 1)
})
