import { boot } from 'quasar/wrappers'
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
)

export default boot(({ app }) => {
  app.config.globalProperties.$supabase = supabase
})
