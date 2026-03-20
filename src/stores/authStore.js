import { reactive, computed } from 'vue'
import { supabase } from 'src/services/supabaseClient'

const state = reactive({
  user: null,
  sessionLoaded: false,
})

async function initAuth() {
  if (state.sessionLoaded) return

  const { data } = await supabase.auth.getSession()
  state.user = data.session?.user ?? null
  state.sessionLoaded = true

  // Create profile if user exists but profile doesn't
  if (state.user) {
    await ensureUserProfile(state.user)
  }

  supabase.auth.onAuthStateChange(async (event, session) => {
    state.user = session?.user ?? null

    // Create profile on sign in (especially for OAuth callbacks)
    if (event === 'SIGNED_IN' && session?.user) {
      await ensureUserProfile(session.user)
    }
  })
}

async function ensureUserProfile(user) {
  if (!user) return

  try {
    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('app_users')
      .select('id')
      .eq('id', user.id)
      .single()

    // Create profile if it doesn't exist
    if (!existingProfile) {
      console.log('[AuthStore] Creating user profile for:', user.id)

      const { error } = await supabase
        .from('app_users')
        .insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.user_metadata?.full_name || null
        })

      if (error && error.code !== '23505') { // Ignore duplicate key errors
        console.error('[AuthStore] Failed to create profile:', error)
      } else {
        console.log('[AuthStore] User profile created successfully')
      }
    }
  } catch (err) {
    console.error('[AuthStore] Error checking/creating profile:', err)
  }
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
