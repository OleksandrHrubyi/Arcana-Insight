// @ts-nocheck
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method Not Allowed' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json({ error: 'Missing Authorization header' }, 401)
  }

  const url = Deno.env.get('URL')
  const anon = Deno.env.get('ANON_KEY')
  const serviceRole = Deno.env.get('SERVICE_ROLE_KEY')
  if (!url || !anon || !serviceRole) {
    return json({ error: 'Function env is not configured' }, 500)
  }

  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } }
  })

  const {
    data: { user }
  } = await userClient.auth.getUser()

  if (!user) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const admin = createClient(url, serviceRole)

  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) {
    return json({ error: error.message || 'Failed to delete user' }, 400)
  }

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
