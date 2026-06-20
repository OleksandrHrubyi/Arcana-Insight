const resolveAiProvider = (data) => {
  const provider = String(data?.meta?.provider || '').trim().toLowerCase()
  return provider
}

// Must stay above the edge function's AI_TIMEOUT_MS (default 60000ms). If the
// client aborts first, the server keeps running and pays for the OpenAI/OpenRouter
// completion the user will never receive. 65s gives a 5s buffer over the server default.
const TAROT_READING_TIMEOUT_MS = 65000

export const requestTarotReading = async ({ enabled, payload, invokeFunction }) => {
  if (!enabled) {
    return null
  }

  const { data, error } = await invokeFunction('tarot-reading', payload, TAROT_READING_TIMEOUT_MS)

  if (error) {
    throw error
  }

  const provider = resolveAiProvider(data)
  if (!provider || provider === 'fallback') {
    throw new Error('AI interpretation unavailable')
  }

  return data
}

// Clarify is a quick pre-draw call, so it uses a short timeout. Any failure throws
// and the caller falls back to the normal flow (skip the clarifier) — by design.
const TAROT_CLARIFY_TIMEOUT_MS = 12000

export const requestTarotClarify = async ({ enabled, payload, invokeFunction }) => {
  if (!enabled) {
    return null
  }

  const { data, error } = await invokeFunction(
    'tarot-reading',
    { ...payload, mode: 'clarify' },
    TAROT_CLARIFY_TIMEOUT_MS,
  )

  if (error) {
    throw error
  }

  const question = String(data?.question || '').trim()
  if (!question) {
    throw new Error('clarify unavailable')
  }

  const options = Array.isArray(data?.options)
    ? data.options.map((opt) => String(opt || '').trim()).filter(Boolean).slice(0, 3)
    : []

  return { question, options }
}
