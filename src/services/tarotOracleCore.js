export const requestTarotReading = async ({ enabled, payload, invokeFunction }) => {
  if (!enabled) {
    return null
  }

  const { data, error } = await invokeFunction('tarot-reading', payload, 15000)

  if (error) {
    throw error
  }

  return data
}
