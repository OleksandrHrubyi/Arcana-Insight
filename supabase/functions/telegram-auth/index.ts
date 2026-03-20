// @ts-nocheck
import { createHmac } from 'node:crypto'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

interface TelegramAuthData {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method Not Allowed' }, 405)
  }

  try {
    const telegramData: TelegramAuthData = await req.json()

    console.log('[TelegramAuth] Received data:', { id: telegramData.id, username: telegramData.username })

    // Validate required fields
    if (!telegramData.id || !telegramData.first_name || !telegramData.auth_date || !telegramData.hash) {
      return json({ error: 'Missing required fields' }, 400)
    }

    // Get bot token from env
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!botToken) {
      console.error('[TelegramAuth] TELEGRAM_BOT_TOKEN not configured')
      return json({ error: 'Server configuration error' }, 500)
    }

    // Verify Telegram data authenticity
    const isValid = verifyTelegramAuth(telegramData, botToken)
    if (!isValid) {
      console.error('[TelegramAuth] Invalid hash - data may be forged')
      return json({ error: 'Invalid authentication data' }, 401)
    }

    // Check if auth is not too old (24 hours)
    const now = Math.floor(Date.now() / 1000)
    const authAge = now - telegramData.auth_date
    if (authAge > 86400) { // 24 hours
      console.error('[TelegramAuth] Auth data is too old:', authAge, 'seconds')
      return json({ error: 'Authentication expired, please try again' }, 401)
    }

    console.log('[TelegramAuth] Data verified successfully')

    // Get Supabase credentials
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[TelegramAuth] Supabase credentials not configured')
      return json({ error: 'Server configuration error' }, 500)
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Create or get user
    // Since Telegram doesn't provide email, we create a fake email based on Telegram ID
    const fakeEmail = `telegram_${telegramData.id}@arcana-insight.app`
    const displayName = telegramData.username
      ? `@${telegramData.username}`
      : `${telegramData.first_name}${telegramData.last_name ? ' ' + telegramData.last_name : ''}`

    console.log('[TelegramAuth] Creating/updating user:', fakeEmail)

    // Try to find existing user by telegram_id in app_users
    const { data: existingUser } = await supabase
      .from('app_users')
      .select('id')
      .eq('telegram_id', telegramData.id)
      .single()

    let userId: string

    if (existingUser) {
      // User exists, get their auth user
      console.log('[TelegramAuth] Found existing user:', existingUser.id)
      userId = existingUser.id

      // Update their profile
      await supabase
        .from('app_users')
        .update({
          name: displayName,
          telegram_username: telegramData.username || null,
          telegram_photo_url: telegramData.photo_url || null,
        })
        .eq('id', userId)

    } else {
      // Create new user in auth
      console.log('[TelegramAuth] Creating new auth user')

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: fakeEmail,
        email_confirm: true,
        user_metadata: {
          telegram_id: telegramData.id,
          telegram_username: telegramData.username,
          name: displayName,
          first_name: telegramData.first_name,
          last_name: telegramData.last_name,
          photo_url: telegramData.photo_url,
        }
      })

      if (authError) {
        console.error('[TelegramAuth] Failed to create auth user:', authError)
        return json({ error: authError.message || 'Failed to create user' }, 400)
      }

      userId = authData.user.id
      console.log('[TelegramAuth] Created auth user:', userId)

      // Create profile in app_users
      const { error: profileError } = await supabase
        .from('app_users')
        .insert({
          id: userId,
          email: fakeEmail,
          name: displayName,
          telegram_id: telegramData.id,
          telegram_username: telegramData.username || null,
          telegram_photo_url: telegramData.photo_url || null,
        })

      if (profileError) {
        console.error('[TelegramAuth] Failed to create profile:', profileError)
        // Don't fail the whole request if profile creation fails
      } else {
        console.log('[TelegramAuth] Created user profile')
      }
    }

    // Generate session token for the user
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: fakeEmail,
    })

    if (sessionError || !sessionData) {
      console.error('[TelegramAuth] Failed to generate session:', sessionError)
      return json({ error: 'Failed to create session' }, 500)
    }

    console.log('[TelegramAuth] Session created successfully')

    // Return session data to client
    return json({
      success: true,
      access_token: sessionData.properties.action_link.split('#access_token=')[1]?.split('&')[0],
      refresh_token: sessionData.properties.action_link.split('&refresh_token=')[1]?.split('&')[0],
      user_id: userId,
    })

  } catch (err) {
    console.error('[TelegramAuth] Unexpected error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})

function verifyTelegramAuth(data: TelegramAuthData, botToken: string): boolean {
  // Create data-check-string
  const checkArr: string[] = []

  Object.keys(data).forEach(key => {
    if (key !== 'hash') {
      checkArr.push(`${key}=${data[key]}`)
    }
  })

  checkArr.sort()
  const dataCheckString = checkArr.join('\n')

  // Create secret key
  const secretKey = createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest()

  // Create hash
  const hash = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')

  // Compare hashes
  return hash === data.hash
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS,
      'content-type': 'application/json'
    }
  })
}
