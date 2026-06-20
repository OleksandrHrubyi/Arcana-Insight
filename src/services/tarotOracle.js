import { invokeFunction } from 'src/services/supabaseNative'
import { requestTarotReading, requestTarotClarify } from './tarotOracleCore.js'

export async function getTarotReading(payload) {
  return requestTarotReading({
    enabled: import.meta.env.VITE_ENABLE_TAROT_AI === 'true',
    payload,
    invokeFunction,
  })
}

export async function getTarotClarify(payload) {
  return requestTarotClarify({
    enabled: import.meta.env.VITE_ENABLE_TAROT_AI === 'true',
    payload,
    invokeFunction,
  })
}
