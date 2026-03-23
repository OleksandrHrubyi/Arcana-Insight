import { invokeFunction } from 'src/services/supabaseNative'

export async function getTarotReading(payload) {
  if (import.meta.env.VITE_ENABLE_TAROT_AI !== 'true') {
    return null
  }

  const { data, error } = await invokeFunction('tarot-reading', payload, 15000)

  if (error) {
    throw error
  }

  return data
}
