import { json, resolveAuthUserId, restRequest, rpcRequest } from '../_shared/ritual.ts'

type ClaimBody = {
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

const readSingleRow = <T>(value: unknown): T | null => {
  if (!Array.isArray(value)) return (value as T) || null
  return (value[0] as T) || null
}

const toInt = (value: unknown): number => {
  const num = Number(value)
  return Number.isFinite(num) ? Math.max(0, Math.trunc(num)) : 0
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const anonKey = Deno.env.get('ANON_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || ''
    if (!supabaseUrl || !serviceRole) return json({ ok: false, error: 'Missing env' }, 500)

    const body: ClaimBody = await req.json().catch(() => ({}))
    const rewardKey = normalizeRewardKey(body.rewardKey)
    if (!rewardKey) return json({ ok: false, error: 'Invalid rewardKey' }, 400)

    const source = String(body.source || 'app').trim().slice(0, 64) || 'app'

    const userId = await resolveAuthUserId({
      supabaseUrl,
      anonKey,
      authHeader: req.headers.get('Authorization'),
    })
    if (!userId) return json({ ok: false, error: 'Unauthorized' }, 401)

    const claimRes = await rpcRequest({
      supabaseUrl,
      serviceRole,
      name: 'ritual_claim_reward',
      body: {
        p_user_id: userId,
        p_reward_key: rewardKey,
        p_metadata: {
          source,
          claimed_at: new Date().toISOString(),
        },
      },
    })
    if (!claimRes.ok) {
      console.error('[ritual-claim] claim rpc failed', claimRes.status, claimRes.data)
      return json({ ok: false, error: 'claim_rpc_failed', status: claimRes.status }, 500)
    }

    const claimRow = readSingleRow<{
      ok?: boolean
      claim_id?: number
      points_balance?: number
      lifetime_points?: number
      error_code?: string
    }>(claimRes.data)

    if (!claimRow?.ok) {
      const errorCode = String(claimRow?.error_code || 'claim_failed')
      const status =
        errorCode === 'insufficient_points' || errorCode === 'reward_not_found'
          ? 400
          : 409
      return json(
        {
          ok: false,
          error: errorCode,
          points: {
            balance: toInt(claimRow?.points_balance),
            lifetime: toInt(claimRow?.lifetime_points),
          },
        },
        status,
      )
    }

    const rewardQuery = new URLSearchParams()
    rewardQuery.set('select', 'key,title_en,title_uk,description_en,description_uk,cost_points')
    rewardQuery.set('key', `eq.${rewardKey}`)
    rewardQuery.set('limit', '1')

    const rewardRes = await restRequest({
      supabaseUrl,
      serviceRole,
      path: 'ritual_reward_catalog',
      method: 'GET',
      query: rewardQuery,
    })
    const rewardRow = readSingleRow<{
      key?: string
      title_en?: string
      title_uk?: string
      description_en?: string
      description_uk?: string
      cost_points?: number
    }>(rewardRes.data)

    const inventoryQuery = new URLSearchParams()
    inventoryQuery.set('select', 'reward_key,quantity,expires_at,updated_at')
    inventoryQuery.set('user_id', `eq.${userId}`)
    inventoryQuery.set('reward_key', `eq.${rewardKey}`)
    inventoryQuery.set('limit', '1')

    const inventoryRes = await restRequest({
      supabaseUrl,
      serviceRole,
      path: 'ritual_reward_inventory',
      method: 'GET',
      query: inventoryQuery,
    })
    const inventoryRow = readSingleRow<{
      reward_key?: string
      quantity?: number
      expires_at?: string
      updated_at?: string
    }>(inventoryRes.data)

    return json({
      ok: true,
      data: {
        claimId: toInt(claimRow.claim_id),
        reward: {
          key: String(rewardRow?.key || rewardKey),
          titleEn: String(rewardRow?.title_en || ''),
          titleUk: String(rewardRow?.title_uk || ''),
          descriptionEn: String(rewardRow?.description_en || ''),
          descriptionUk: String(rewardRow?.description_uk || ''),
          costPoints: toInt(rewardRow?.cost_points),
        },
        points: {
          balance: toInt(claimRow.points_balance),
          lifetime: toInt(claimRow.lifetime_points),
        },
        inventory: {
          rewardKey: String(inventoryRow?.reward_key || rewardKey),
          quantity: toInt(inventoryRow?.quantity),
          expiresAt: String(inventoryRow?.expires_at || ''),
          updatedAt: String(inventoryRow?.updated_at || ''),
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
