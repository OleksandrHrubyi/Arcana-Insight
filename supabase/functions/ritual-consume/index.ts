import { json, resolveAuthUserId, rpcRequest } from '../_shared/ritual.ts'

type ConsumeBody = {
  rewardKey?: string
  source?: string
}

const normalizeRewardKey = (value: unknown): string => {
  const key = String(value || '')
    .trim()
    .toLowerCase()
  if (!/^[a-z0-9_:-]{2,64}$/.test(key)) return ''
  return key
}

const normalizeIso = (value: unknown): string => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString()
}

const toInt = (value: unknown): number => {
  const num = Number(value)
  return Number.isFinite(num) ? Math.max(0, Math.trunc(num)) : 0
}

const readSingleRow = <T>(value: unknown): T | null => {
  if (!Array.isArray(value)) return (value as T) || null
  return (value[0] as T) || null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const anonKey = Deno.env.get('ANON_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || ''
    if (!supabaseUrl || !serviceRole) return json({ ok: false, error: 'Missing env' }, 500)

    const body: ConsumeBody = await req.json().catch(() => ({}))
    const rewardKey = normalizeRewardKey(body.rewardKey)
    if (!rewardKey) return json({ ok: false, error: 'Invalid rewardKey' }, 400)

    const source = String(body.source || 'app').trim().slice(0, 64) || 'app'

    const userId = await resolveAuthUserId({
      supabaseUrl,
      anonKey,
      authHeader: req.headers.get('Authorization'),
    })
    if (!userId) return json({ ok: false, error: 'Unauthorized' }, 401)

    const consumeRes = await rpcRequest({
      supabaseUrl,
      serviceRole,
      name: 'ritual_consume_reward',
      body: {
        p_user_id: userId,
        p_reward_key: rewardKey,
        p_metadata: {
          source,
          consumed_at: new Date().toISOString(),
        },
      },
    })
    if (!consumeRes.ok) {
      return json(
        {
          ok: false,
          error: 'consume_rpc_failed',
          status: consumeRes.status,
          details: consumeRes.data,
        },
        500,
      )
    }

    const consumeRow = readSingleRow<{
      ok?: boolean
      reward_key?: string
      quantity?: number
      expires_at?: string
      error_code?: string
    }>(consumeRes.data)

    if (!consumeRow?.ok) {
      return json(
        {
          ok: false,
          error: String(consumeRow?.error_code || 'consume_failed'),
          inventory: {
            rewardKey,
            quantity: toInt(consumeRow?.quantity),
            expiresAt: normalizeIso(consumeRow?.expires_at),
          },
        },
        409,
      )
    }

    return json({
      ok: true,
      data: {
        rewardKey: String(consumeRow.reward_key || rewardKey),
        inventory: {
          rewardKey: String(consumeRow.reward_key || rewardKey),
          quantity: toInt(consumeRow.quantity),
          expiresAt: normalizeIso(consumeRow.expires_at),
          updatedAt: new Date().toISOString(),
        },
      },
    })
  } catch (error) {
    return json(
      {
        ok: false,
        error: String((error as Error)?.message || error),
      },
      500,
    )
  }
})
