// @ts-nocheck
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

const readEnv = (...keys: string[]) => {
  for (const key of keys) {
    const value = String(Deno.env.get(key) || '').trim()
    if (value) return value
  }
  return ''
}

Deno.serve(async (req: Request) => {
  console.log('[DeleteAccount] request', {
    method: req.method,
    hasAuth: !!req.headers.get('Authorization'),
    ua: req.headers.get('User-Agent')
  })
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method Not Allowed' }, 405)
  }

  let authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json({ error: 'Missing Authorization header' }, 401)
  }

  // Clean up the auth header - remove newlines and extra whitespace from the token
  authHeader = authHeader.replace(/\n/g, '').replace(/\r/g, '').trim()
  console.log('[DeleteAccount] Original header had newlines, cleaned')

  const url = readEnv('SUPABASE_URL', 'URL')
  const anon = readEnv('SUPABASE_ANON_KEY', 'ANON_KEY')
  const serviceRole = readEnv('SUPABASE_SERVICE_ROLE_KEY', 'SERVICE_ROLE_KEY')
  if (!url || !anon || !serviceRole) {
    return json({ error: 'Function env is not configured' }, 500)
  }

  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')

  // Extract just the token from "Bearer <token>"
  const token = authHeader.replace('Bearer ', '').trim()

  console.log('[DeleteAccount] Token length:', token.length)

  // Create user client with cleaned token
  const userClient = createClient(url, anon, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    auth: {
      persistSession: false,
    },
  })

  const {
    data: { user },
    error: userErr
  } = await userClient.auth.getUser()

  if (userErr) {
    console.error('[DeleteAccount] getUser error:', userErr)
  }

  if (!user) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const admin = createClient(url, serviceRole, {
    auth: {
      persistSession: false,
    },
  })

  console.log(`[DeleteAccount] Deleting user: ${user.id}`)

  // Delete the auth user FIRST. Every user-data table FK-references auth.users(id)
  // with ON DELETE CASCADE (app_users, tarot_readings, ritual_*, user_entitlements,
  // personal_horoscopes_cache), so this removes ALL of the user's data in a single
  // atomic transaction — we can never end up half-deleted. If it fails, nothing is
  // removed and the client can safely retry.
  const { error: authError } = await admin.auth.admin.deleteUser(user.id)
  if (authError) {
    console.error('[DeleteAccount] Failed to delete auth user:', authError)
    return json({ error: authError.message || 'Failed to delete user' }, 400)
  }

  // Belt-and-suspenders: best-effort cleanup for any environment whose schema is
  // missing a cascade FK. These are no-ops once the cascade has removed the rows,
  // and they never fail the request — the account itself is already gone.
  const cleanups: Array<readonly [string, Promise<{ error: unknown }>]> = [
    ['app_users', admin.from('app_users').delete().eq('id', user.id)],
    ['tarot_readings', admin.from('tarot_readings').delete().eq('user_id', user.id)],
    ['saved_readings', admin.from('saved_readings').delete().eq('user_id', user.id)],
  ]
  for (const [table, op] of cleanups) {
    try {
      const { error } = await op
      if (error) {
        const details = String((error as { message?: string })?.message || '').toLowerCase()
        const missingTable =
          details.includes('relation') ||
          details.includes('does not exist') ||
          details.includes('not found')
        if (!missingTable) {
          console.error(`[DeleteAccount] post-delete cleanup warning (${table}):`, error)
        }
      }
    } catch (cleanupErr) {
      console.error(`[DeleteAccount] post-delete cleanup threw (${table}):`, cleanupErr)
    }
  }

  console.log(`[DeleteAccount] Successfully deleted user: ${user.id}`)
  return json({ ok: true })
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS,
      'content-type': 'application/json'
    }
  })
}
