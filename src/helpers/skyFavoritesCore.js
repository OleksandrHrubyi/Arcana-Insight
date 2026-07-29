// Pure logic for saved observing places (premium: unlimited favorites; free: 1).
// No Vue/Capacitor imports so it's unit-testable under node --test; the
// skyLocation store wires the ref + persistence around these.

export const FREE_FAVORITE_LIMIT = 1

// Stable id from rounded coords so the same place can't be saved twice.
export const favoriteId = (loc) =>
  `${Number(loc?.lat).toFixed(3)},${Number(loc?.lon).toFixed(3)}`

export const normalizeFavorites = (value) => {
  if (!Array.isArray(value)) return []
  const out = []
  const seen = new Set()
  for (const item of value) {
    if (typeof item?.lat !== 'number' || typeof item?.lon !== 'number') continue
    const id = favoriteId(item)
    if (seen.has(id)) continue
    seen.add(id)
    out.push({ id, lat: item.lat, lon: item.lon, cityKey: item.cityKey ?? null, label: item.label ?? null })
  }
  return out
}

export const isFavorite = (list, loc) => {
  const id = favoriteId(loc)
  return normalizeFavorites(list).some((f) => f.id === id)
}

// Whether another favorite may be added. Premium ⇒ always true.
export const canSaveFavorite = (list, hasPremium, limit = FREE_FAVORITE_LIMIT) =>
  hasPremium === true || normalizeFavorites(list).length < limit

// Pure toggle: returns { list, result } where result is
// 'added' | 'removed' | 'blocked' (free limit reached). Never mutates the input.
export const applyFavoriteToggle = (list, loc, hasPremium, limit = FREE_FAVORITE_LIMIT) => {
  const normalized = normalizeFavorites(list)
  const id = favoriteId(loc)
  if (normalized.some((f) => f.id === id)) {
    return { list: normalized.filter((f) => f.id !== id), result: 'removed' }
  }
  if (!canSaveFavorite(normalized, hasPremium, limit)) {
    return { list: normalized, result: 'blocked' }
  }
  return {
    list: normalizeFavorites([
      ...normalized,
      { lat: loc.lat, lon: loc.lon, cityKey: loc.cityKey ?? null, label: loc.label ?? null },
    ]),
    result: 'added',
  }
}
