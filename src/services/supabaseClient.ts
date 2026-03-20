import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || ''

const baseClient = createClient(supabaseUrl, supabaseAnonKey)

// Wrapper to clean auth tokens before making requests
class SupabaseClientWrapper {
  private client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  get auth() {
    return this.client.auth
  }

  get from() {
    return this.client.from.bind(this.client)
  }

  get storage() {
    return this.client.storage
  }

  get functions() {
    const originalFunctions = this.client.functions
    return {
      invoke: async (functionName: string, options?: any) => {
        // Get the current session and clean the token
        const { data: { session } } = await this.client.auth.getSession()

        if (session?.access_token) {
          // If token has newlines, refresh the session
          if (session.access_token.includes('\n')) {
            console.warn('[Supabase] Detected corrupted token, refreshing session...')
            const { data: { session: newSession }, error } = await this.client.auth.refreshSession()

            if (error) {
              console.error('[Supabase] Failed to refresh session:', error)
              // Continue with corrupted token, let the server handle it
            } else if (newSession) {
              console.log('[Supabase] Session refreshed successfully')
            }
          }
        }

        return originalFunctions.invoke(functionName, options)
      },
      setAuth: originalFunctions.setAuth?.bind(originalFunctions),
    }
  }
}

export const supabase = new SupabaseClientWrapper(baseClient) as any
