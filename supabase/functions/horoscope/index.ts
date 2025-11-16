// GET /horoscope?sign=aries&date=2025-10-20&scope=daily&lang=uk
// @ts-nocheck
Deno.serve(async (req: Request) => {
  const url = new URL(req.url)
  const sign  = url.searchParams.get('sign') ?? 'aries'
  const scope = url.searchParams.get('scope') ?? 'daily'
  const date  = url.searchParams.get('date') ?? new Date().toISOString().slice(0,10)
  const lang  = url.searchParams.get('lang') ?? 'uk'

  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
  const supabase = createClient(
    Deno.env.get('URL')!,
    Deno.env.get('ANON_KEY')!
  )

  const { data, error } = await supabase
    .from('zodiac_texts')
    .select('*')
    .eq('sign', sign)
    .eq('scope', scope)
    .eq('for_date', date)
    .eq('lang', lang)
    .maybeSingle()

  if (error || !data) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' }
    })
  }

  return new Response(JSON.stringify(data), {
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, max-age=3600'
    }
  })
})
