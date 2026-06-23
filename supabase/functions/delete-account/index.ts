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

  console.log(`[DeleteAccount] Deleting user data for: ${user.id}`)

  // Delete user profile data first
  const { error: profileError } = await admin
    .from('app_users')
    .delete()
    .eq('id', user.id)

  if (profileError) {
    console.error('[DeleteAccount] Failed to delete profile:', profileError)
    // Continue anyway - auth deletion is more important
  }

  // Delete tarot reading history stored by the current app.
  const { error: tarotReadingsError } = await admin
    .from('tarot_readings')
    .delete()
    .eq('user_id', user.id)

  if (tarotReadingsError) {
    console.error('[DeleteAccount] Failed to delete tarot readings:', tarotReadingsError)
    // Continue anyway - auth deletion remains the priority.
  }

  // Best-effort cleanup for legacy schema/table name if it still exists in some environments.
  const { error: legacyReadingsError } = await admin
    .from('saved_readings')
    .delete()
    .eq('user_id', user.id)

  if (legacyReadingsError) {
    const details = String(legacyReadingsError?.message || '').toLowerCase()
    const missingTable =
      details.includes('relation') ||
      details.includes('does not exist') ||
      details.includes('not found')

    if (!missingTable) {
      console.error('[DeleteAccount] Failed to delete legacy saved readings:', legacyReadingsError)
    }
  }

  // Delete auth user (this will cascade to other tables if configured)
  const { error: authError } = await admin.auth.admin.deleteUser(user.id)
  if (authError) {
    console.error('[DeleteAccount] Failed to delete auth user:', authError)
    return json({ error: authError.message || 'Failed to delete user' }, 400)
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
