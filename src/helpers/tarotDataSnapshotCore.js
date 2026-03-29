export const normalizeTarotCards = (payload) => {
  if (!payload || !Array.isArray(payload.cards)) return []
  return payload.cards
}

export const loadTarotCardsSnapshot = async ({ loadTarotData }) => {
  try {
    const payload = await loadTarotData()
    return {
      cards: normalizeTarotCards(payload),
      error: null,
    }
  } catch (error) {
    return {
      cards: [],
      error,
    }
  }
}

export const findTarotCardById = (cards, cardId) => {
  const normalizedId = String(cardId || '').trim()
  if (!normalizedId) return null
  if (!Array.isArray(cards)) return null
  return cards.find((card) => String(card?.id || '') === normalizedId) || null
}
