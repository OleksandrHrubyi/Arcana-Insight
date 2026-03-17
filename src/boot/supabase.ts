import { boot } from 'quasar/wrappers'
import { supabase } from 'src/services/supabaseClient'

export default boot(({ app }) => {
  app.config.globalProperties.$supabase = supabase
})
