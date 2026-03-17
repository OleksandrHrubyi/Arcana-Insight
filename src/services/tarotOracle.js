import { supabase } from 'src/services/supabaseClient'

export async function getTarotReading(payload) {
  if (import.meta.env.VITE_ENABLE_TAROT_AI !== 'true') {
    return null
  }

  const { data, error } = await supabase.functions.invoke('tarot-reading', {
    body: payload
  })

  if (error) {
    throw error
  }

  return data
}
