import {
  json,
  resolveAuthUserId,
  restRequest,
  rpcRequest,
} from '../_shared/ritual.ts'

type InventoryItem = {
  rewardKey?: string
  quantity?: number
  expiresAt?: string
  owned?: boolean
}

type SyncBody = {
  migrationKey?: string
  inventory?: InventoryItem[]
  source?: string
}

const normalizeMigrationKey = (value: unknown): string => {
  const key = String(value || '').trim()
  if (!/^[a-z0-9:_-]{8,128}$/i.test(key)) return ''
  return key
}

const normalizeRewardKey = (value: unknown): string => {
  const key = String(value || '')
    .trim()
    .toLowerCase()
  if (!/^[a-z0-9_:-]{2,64}$/.test(key)) return ''
  return key
}

const normalizeExpiresAt = (value: unknown): string => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString()
}

const normalizeInventoryItems = (value: unknown): Array<Record<string, unknown>> => {
  if (!Array.isArray(value)) return []
  return value
    .slice(0, 64)
    .map((item) => {
      const rewardKey = normalizeRewardKey(item?.rewardKey)
      if (!rewardKey) return null
      const quantity = Math.max(0, Number(item?.quantity || 0) || 0)
      const expiresAt = normalizeExpiresAt(item?.expiresAt)
      const owned = Boolean(item?.owned)
      return {
        rewardKey,
        quantity,
        expiresAt,
        owned,
      }
    })
    .filter((item) => Boolean(item))
}

const readSingleRow = <T>(value: unknown): T | null => {
  if (!Array.isArray(value)) return (value as T) || null
  return (value[0] as T) || null
}

const toRows = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const anonKey = Deno.env.get('ANON_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || ''
    if (!supabaseUrl || !serviceRole) return json({ ok: false, error: 'Missing env' }, 500)

    const body: SyncBody = await req.json().catch(() => ({}))
    const migrationKey = normalizeMigrationKey(body.migrationKey)
    if (!migrationKey) {
      return json({ ok: false, error: 'Invalid migrationKey' }, 400)
    }

    const source = String(body.source || 'app').trim().slice(0, 64) || 'app'
    const inventory = normalizeInventoryItems(body.inventory)

    const userId = await resolveAuthUserId({
      supabaseUrl,
      anonKey,
      authHeader: req.headers.get('Authorization'),
    })
    if (!userId) return json({ ok: false, error: 'Unauthorized' }, 401)

    const applyRes = await rpcRequest({
      supabaseUrl,
      serviceRole,
      name: 'ritual_apply_inventory_migration',
      body: {
        p_user_id: userId,
        p_migration_key: migrationKey,
        p_items: inventory,
        p_source: source,
      },
    })
    if (!applyRes.ok) {
      return json(
        {
          ok: false,
          error: 'apply_inventory_migration_failed',
          status: applyRes.status,
          details: applyRes.data,
        },
        500,
      )
    }

    const applyRow = readSingleRow<{ ok?: boolean; applied?: boolean; error_code?: string }>(
      applyRes.data,
    )
    if (!applyRow?.ok) {
      const errorCode = String(applyRow?.error_code || 'migration_failed')
      return json({ ok: false, error: errorCode }, 400)
    }

    const inventoryQuery = new URLSearchParams()
    inventoryQuery.set('select', 'reward_key,quantity,expires_at,updated_at')
    inventoryQuery.set('user_id', `eq.${userId}`)
    inventoryQuery.set('order', 'updated_at.desc')

    const inventoryRes = await restRequest({
      supabaseUrl,
      serviceRole,
      path: 'ritual_reward_inventory',
      method: 'GET',
      query: inventoryQuery,
    })
    if (!inventoryRes.ok) {
      return json(
        {
          ok: false,
          error: 'inventory_query_failed',
          status: inventoryRes.status,
          details: inventoryRes.data,
        },
        500,
      )
    }

    const rows = toRows<{
      reward_key?: string
      quantity?: number
      expires_at?: string
      updated_at?: string
    }>(inventoryRes.data).map((row) => ({
      rewardKey: String(row.reward_key || ''),
      quantity: Math.max(0, Number(row.quantity || 0) || 0),
      expiresAt: normalizeExpiresAt(row.expires_at),
      updatedAt: normalizeExpiresAt(row.updated_at),
    }))

    return json({
      ok: true,
      data: {
        migrationKey,
        applied: Boolean(applyRow.applied),
        inventory: rows,
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
