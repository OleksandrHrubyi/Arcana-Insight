const resolveAiProvider = (data) => {
  const provider = String(data?.meta?.provider || '').trim().toLowerCase()
  return provider
}

export const requestTarotReading = async ({ enabled, payload, invokeFunction }) => {
  if (!enabled) {
    return null
  }

  const { data, error } = await invokeFunction('tarot-reading', payload, 15000)

  if (error) {
    throw error
  }

  const provider = resolveAiProvider(data)
  if (!provider || provider === 'fallback') {
    throw new Error('AI interpretation unavailable')
  }

  return data
}
