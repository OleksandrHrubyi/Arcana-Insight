import {
  computeStreakFromDateKeys,
  json,
  normalizeActivityKey,
  normalizeDateKey,
  resolveAuthUserId,
  restRequest,
  shiftDateKey,
} from '../_shared/ritual.ts'

type DashboardBody = {
  days?: number
  dateKey?: string
  date?: string
}

const clampDays = (value: unknown): number => {
  const raw = Number(value)
  if (!Number.isFinite(raw)) return 7
  return Math.max(1, Math.min(31, Math.trunc(raw)))
}

const toRows = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])

const toInt = (value: unknown): number => {
  const num = Number(value)
  return Number.isFinite(num) ? Math.max(0, Math.trunc(num)) : 0
}

const readSingleRow = <T>(value: unknown): T | null => {
  if (!Array.isArray(value)) return (value as T) || null
  return (value[0] as T) || null
}

const normalizeIso = (value: unknown): string => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString()
}

const buildWeeklyRows = ({
  startDateKey,
  days,
  todayDateKey,
  activityMap,
}: {
  startDateKey: string
  days: number
  todayDateKey: string
  activityMap: Map<string, Set<string>>
}) => {
  const rows = []
  for (let i = 0; i < days; i += 1) {
    const dateKey = shiftDateKey(startDateKey, i)
    const activities = [...(activityMap.get(dateKey) || new Set<string>())]
    rows.push({
      dateKey,
      activities,
      total: activities.length,
      isFull: activities.length >= 3,
      isToday: dateKey === todayDateKey,
    })
  }
  return rows
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const anonKey = Deno.env.get('ANON_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || ''
    if (!supabaseUrl || !serviceRole) return json({ ok: false, error: 'Missing env' }, 500)

    const body: DashboardBody = await req.json().catch(() => ({}))
    const days = clampDays(body.days)
    const todayDateKey = normalizeDateKey(body.dateKey || body.date)
    const startDateKey = shiftDateKey(todayDateKey, -(days - 1))

    const userId = await resolveAuthUserId({
      supabaseUrl,
      anonKey,
      authHeader: req.headers.get('Authorization'),
    })
    if (!userId) return json({ ok: false, error: 'Unauthorized' }, 401)

    const [balanceRes, streakRes, eventsRes, rewardsRes, claimsRes, inventoryRes, fullBonusRes, fullDaysRes] =
      await Promise.all([
        (() => {
          const query = new URLSearchParams()
          query.set('select', 'points_balance,lifetime_points')
          query.set('user_id', `eq.${userId}`)
          query.set('limit', '1')
          return restRequest({
            supabaseUrl,
            serviceRole,
            path: 'ritual_points_balance',
            method: 'GET',
            query,
          })
        })(),
        (() => {
          const query = new URLSearchParams()
          query.set('select', 'current_streak,best_streak,last_full_day')
          query.set('user_id', `eq.${userId}`)
          query.set('limit', '1')
          return restRequest({
            supabaseUrl,
            serviceRole,
            path: 'ritual_streaks',
            method: 'GET',
            query,
          })
        })(),
        (() => {
          const query = new URLSearchParams()
          query.set('select', 'event_date,activity')
          query.set('user_id', `eq.${userId}`)
          query.set('and', `(event_date.gte.${startDateKey},event_date.lte.${todayDateKey})`)
          query.set('order', 'event_date.asc')
          return restRequest({
            supabaseUrl,
            serviceRole,
            path: 'ritual_activity_events',
            method: 'GET',
            query,
          })
        })(),
        (() => {
          const query = new URLSearchParams()
          query.set(
            'select',
            'key,title_en,title_uk,description_en,description_uk,cost_points,sort_order,is_active',
          )
          query.set('is_active', 'eq.true')
          query.set('order', 'sort_order.asc,cost_points.asc')
          return restRequest({
            supabaseUrl,
            serviceRole,
            path: 'ritual_reward_catalog',
            method: 'GET',
            query,
          })
        })(),
        (() => {
          const query = new URLSearchParams()
          query.set('select', 'id,reward_key,cost_points,status,created_at,metadata')
          query.set('user_id', `eq.${userId}`)
          query.set('order', 'created_at.desc')
          query.set('limit', '5')
          return restRequest({
            supabaseUrl,
            serviceRole,
            path: 'ritual_reward_claims',
            method: 'GET',
            query,
          })
        })(),
        (() => {
          const query = new URLSearchParams()
          query.set('select', 'reward_key,quantity,expires_at,updated_at')
          query.set('user_id', `eq.${userId}`)
          query.set('order', 'updated_at.desc')
          return restRequest({
            supabaseUrl,
            serviceRole,
            path: 'ritual_reward_inventory',
            method: 'GET',
            query,
          })
        })(),
        (() => {
          const query = new URLSearchParams()
          query.set('select', 'id')
          query.set('user_id', `eq.${userId}`)
          query.set('reason', 'eq.full_day_bonus')
          query.set('event_date', `eq.${todayDateKey}`)
          query.set('limit', '1')
          return restRequest({
            supabaseUrl,
            serviceRole,
            path: 'ritual_points_ledger',
            method: 'GET',
            query,
          })
        })(),
        (() => {
          const query = new URLSearchParams()
          query.set('select', 'event_date')
          query.set('user_id', `eq.${userId}`)
          query.set('order', 'event_date.desc')
          query.set('limit', '365')
          return restRequest({
            supabaseUrl,
            serviceRole,
            path: 'ritual_full_days',
            method: 'GET',
            query,
          })
        })(),
      ])

    if (!eventsRes.ok) {
      return json(
        {
          ok: false,
          error: 'events_query_failed',
          status: eventsRes.status,
          details: eventsRes.data,
        },
        500,
      )
    }
    if (!rewardsRes.ok) {
      return json(
        {
          ok: false,
          error: 'rewards_query_failed',
          status: rewardsRes.status,
          details: rewardsRes.data,
        },
        500,
      )
    }
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

    const balanceRow = readSingleRow<{ points_balance?: number; lifetime_points?: number }>(balanceRes.data)
    const pointsBalance = toInt(balanceRow?.points_balance)
    const lifetimePoints = toInt(balanceRow?.lifetime_points)

    const fullDays = toRows<{ event_date?: string }>(fullDaysRes.data)
      .map((row) => normalizeDateKey(row?.event_date))
      .filter((value) => !!value)
    const computedStreak = computeStreakFromDateKeys(fullDays)

    const streakRow = readSingleRow<{ current_streak?: number; best_streak?: number; last_full_day?: string }>(
      streakRes.data,
    )
    const streak = {
      current: toInt(streakRow?.current_streak) || computedStreak.current,
      best: Math.max(toInt(streakRow?.best_streak), computedStreak.best),
      lastDate: String(streakRow?.last_full_day || computedStreak.lastDate || ''),
    }

    const activityMap = new Map<string, Set<string>>()
    for (const row of toRows<{ event_date?: string; activity?: string }>(eventsRes.data)) {
      const dateKey = normalizeDateKey(row?.event_date)
      const activity = normalizeActivityKey(row?.activity)
      if (!activity) continue
      if (!activityMap.has(dateKey)) activityMap.set(dateKey, new Set<string>())
      activityMap.get(dateKey)?.add(activity)
    }

    const week = buildWeeklyRows({
      startDateKey,
      days,
      todayDateKey,
      activityMap,
    })
    const today = week[week.length - 1] || {
      dateKey: todayDateKey,
      activities: [],
      total: 0,
      isFull: false,
      isToday: true,
    }

    const activeDaysCount = week.filter((item) => item.total > 0).length
    const fullDaysCount = week.filter((item) => item.isFull).length
    const fullBonusGranted = toRows(fullBonusRes.data).length > 0

    const inventory = toRows<{
      reward_key?: string
      quantity?: number
      expires_at?: string
      updated_at?: string
    }>(inventoryRes.data).map((row) => ({
      rewardKey: String(row.reward_key || ''),
      quantity: toInt(row.quantity),
      expiresAt: normalizeIso(row.expires_at),
      updatedAt: normalizeIso(row.updated_at),
    }))
    const inventoryMap = new Map(inventory.map((row) => [row.rewardKey, row]))

    const rewards = toRows<{
      key?: string
      title_en?: string
      title_uk?: string
      description_en?: string
      description_uk?: string
      cost_points?: number
      sort_order?: number
      is_active?: boolean
    }>(rewardsRes.data).map((row) => ({
      key: String(row.key || ''),
      titleEn: String(row.title_en || ''),
      titleUk: String(row.title_uk || ''),
      descriptionEn: String(row.description_en || ''),
      descriptionUk: String(row.description_uk || ''),
      costPoints: toInt(row.cost_points),
      sortOrder: toInt(row.sort_order),
      isActive: Boolean(row.is_active),
      canClaim:
        pointsBalance >= toInt(row.cost_points) &&
        !(
          String(row.key || '') === 'mystic_badge' &&
          toInt(inventoryMap.get('mystic_badge')?.quantity) >= 1
        ),
    }))

    const nextRewardCost =
      rewards
        .map((reward) => reward.costPoints)
        .filter((cost) => cost > pointsBalance)
        .sort((a, b) => a - b)[0] || 0

    const recentClaims = toRows<{
      id?: number
      reward_key?: string
      cost_points?: number
      status?: string
      created_at?: string
      metadata?: Record<string, unknown>
    }>(claimsRes.data).map((row) => ({
      id: toInt(row.id),
      rewardKey: String(row.reward_key || ''),
      costPoints: toInt(row.cost_points),
      status: String(row.status || ''),
      createdAt: String(row.created_at || ''),
      metadata: row.metadata || {},
    }))

    return json({
      ok: true,
      dashboard: {
        dateKey: todayDateKey,
        points: {
          balance: pointsBalance,
          lifetime: lifetimePoints,
          nextRewardCost,
        },
        streak,
        week,
        today: {
          dateKey: today.dateKey,
          activities: today.activities,
          total: today.total,
          isFull: today.isFull,
          fullBonusGranted,
        },
        summary: {
          activeDaysCount,
          fullDaysCount,
        },
        rewards,
        recentClaims,
        inventory,
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
