export const normalizeDailyCards = (payload) => {
  if (!payload || !Array.isArray(payload.cards)) return []
  return payload.cards
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
