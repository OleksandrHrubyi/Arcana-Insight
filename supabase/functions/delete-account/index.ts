// @ts-nocheck
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
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

  const url = Deno.env.get('URL')
  const anon = Deno.env.get('ANON_KEY')
  const serviceRole = Deno.env.get('SERVICE_ROLE_KEY')
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
    }
  })

  const {
    data: { user },
    error: userErr
  } = await userClient.auth.getUser()

  if (userErr) {
    console.error('[DeleteAccount] getUser error:', userErr)
  }

  if (!user) {
    return json({ error: 'Unauthorized', detail: userErr?.message || null }, 401)
  }

  const admin = createClient(url, serviceRole)

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

  // Delete saved readings
  const { error: readingsError } = await admin
    .from('saved_readings')
    .delete()
    .eq('user_id', user.id)

  if (readingsError) {
    console.error('[DeleteAccount] Failed to delete readings:', readingsError)
    // Continue anyway
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
