// @ts-nocheck
// POST /tarot-draw  body: { seed?: string, count?: number }
// Працює з браузера: додаємо CORS + обробляємо OPTIONS
const ORIGIN = Deno.env.get('ORIGIN') ?? 'http://localhost:9000' // свій dev-домен

const CORS = {
  'Access-Control-Allow-Origin': ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Vary': 'Origin'
}

Deno.serve(async (req: Request) => {
  // preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS })
  }

  const auth = req.headers.get('Authorization')
  if (!auth) return new Response('Missing authorization header', { status: 401, headers: CORS })

  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
  const supabase = createClient(
    Deno.env.get('URL')!,
    Deno.env.get('ANON_KEY')!,                 // достатньо anon key
    { global: { headers: { Authorization: auth } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401, headers: CORS })

  const body = await req.json().catch(() => ({}))
  const seed: string = body.seed || crypto.randomUUID()
  const count: number = Math.max(1, Math.min(10, Number(body.count) || 3))

  const { data: all } = await supabase.from('tarot_cards').select('code')
  if (!all?.length) {
    return new Response(JSON.stringify({ error: 'Deck is empty' }), { status: 400, headers: CORS })
  }

  // простий seeded shuffle
  let s = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0) || 1
  const rand = () => (s = (s * 1664525 + 1013904223) % 2**32) / 2**32
  const deck = [...all.map(x => x.code)]
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  const picked = deck.slice(0, count).map(code => ({ code, pos: rand() > 0.5 ? 'upright' : 'reversed' }))

  const { data, error } = await supabase.from('tarot_spreads')
    .insert({ user_id: user.id, seed, cards: picked })
    .select('*').single()

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: CORS })
  return new Response(JSON.stringify(data), { headers: { ...CORS, 'content-type': 'application/json' } })
})
