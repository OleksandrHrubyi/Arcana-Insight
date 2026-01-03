import { reactive, computed } from 'vue'
import { supabase } from 'src/boot/supabase'

const state = reactive({
  user: null,
  sessionLoaded: false,
})

async function initAuth() {
  if (state.sessionLoaded) return

  const { data } = await supabase.auth.getSession()
  state.user = data.session?.user ?? null
  state.sessionLoaded = true

  supabase.auth.onAuthStateChange((_event, session) => {
    state.user = session?.user ?? null
  })
}

const isLoggedIn = computed(() => !!state.user)
const userState = computed(() => state.user || {})


const store = {
  state,
  initAuth,
  isLoggedIn,
  userState,
}

export function useAuthStore() {
  return store
}
