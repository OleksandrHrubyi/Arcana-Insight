export const normalizeDailyCards = (payload) => {
  if (!payload || !Array.isArray(payload.cards)) return []
  return payload.cards
}

const xmur3 = (value) => {
  const raw = String(value || '')
  let hash = 1779033703 ^ raw.length

  for (let i = 0; i < raw.length; i += 1) {
    hash = Math.imul(hash ^ raw.charCodeAt(i), 3432918353)
    hash = (hash << 13) | (hash >>> 19)
  }

  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507)
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909)
    return (hash ^ (hash >>> 16)) >>> 0
  }
}

const mulberry32 = (seed) => () => {
  let value = (seed += 0x6d2b79f5)
  value = Math.imul(value ^ (value >>> 15), value | 1)
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296
}

export const getDeterministicDailyCardSelection = ({ dateKey, identity, cardsLength }) => {
  if (!cardsLength) {
    return {
      index: 0,
      orientation: 'upright',
    }
  }

  const seedFactory = xmur3(`${dateKey}::${identity}::daily-card`)
  const random = mulberry32(seedFactory())

  return {
    index: Math.floor(random() * cardsLength),
    orientation: random() < 0.5 ? 'upright' : 'reversed',
  }
}

export const loadDailyCardsSnapshot = async ({ loadTarotData }) => {
  try {
    const payload = await loadTarotData()
    return {
      cards: normalizeDailyCards(payload),
      error: null,
    }
  } catch (error) {
    return {
      cards: [],
      error,
    }
  }
}
