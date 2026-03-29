import { invokeFunction } from 'src/services/supabaseNative'
import { requestTarotReading } from './tarotOracleCore.js'

export async function getTarotReading(payload) {
  return requestTarotReading({
    enabled: import.meta.env.VITE_ENABLE_TAROT_AI === 'true',
    payload,
    invokeFunction,
  })
}
