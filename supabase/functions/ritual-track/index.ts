import {
  ACTIVITY_POINTS,
  FULL_DAY_BONUS_POINTS,
  computeNextStreak,
  json,
  normalizeActivityKey,
  normalizeDateKey,
  resolveAuthUserId,
  restRequest,
  rpcRequest,
} from '../_shared/ritual.ts'

type TrackBody = {
  activity?: string
  dateKey?: string
  date?: string
  source?: string
}

const MAX_TRACK_PAST_DAYS = 45

const clampDateKeyToServerWindow = (value: string): string => {
  const normalized = normalizeDateKey(value)
  const today = normalizeDateKey('')
  const left = new Date(`${normalized}T00:00:00.000Z`)
  const right = new Date(`${today}T00:00:00.000Z`)
  const diffDays = Math.round((left.getTime() - right.getTime()) / 86400000)
  if (diffDays > 0) return today
  if (Math.abs(diffDays) > MAX_TRACK_PAST_DAYS) return today
  return normalized
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

const readBalance = async ({
  supabaseUrl,
  serviceRole,
  userId,
}: {
  supabaseUrl: string
  serviceRole: string
  userId: string
}) => {
  const query = new URLSearchParams()
  query.set('select', 'points_balance,lifetime_points')
  query.set('user_id', `eq.${userId}`)
  query.set('limit', '1')

  const res = await restRequest({
    supabaseUrl,
    serviceRole,
    path: 'ritual_points_balance',
    method: 'GET',
    query,
  })

  if (!res.ok) return { pointsBalance: 0, lifetimePoints: 0 }
  const row = readSingleRow<{ points_balance?: number; lifetime_points?: number }>(res.data)
  return {
    pointsBalance: toInt(row?.points_balance),
    lifetimePoints: toInt(row?.lifetime_points),
  }
}

const readStreak = async ({
  supabaseUrl,
  serviceRole,
  userId,
}: {
  supabaseUrl: string
  serviceRole: string
  userId: string
}) => {
  const query = new URLSearchParams()
  query.set('select', 'current_streak,best_streak,last_full_day')
  query.set('user_id', `eq.${userId}`)
  query.set('limit', '1')

  const res = await restRequest({
    supabaseUrl,
    serviceRole,
    path: 'ritual_streaks',
    method: 'GET',
    query,
  })
  if (!res.ok) return { current: 0, best: 0, lastDate: '' }

  const row = readSingleRow<{ current_streak?: number; best_streak?: number; last_full_day?: string }>(res.data)
  return {
    current: toInt(row?.current_streak),
    best: toInt(row?.best_streak),
    lastDate: String(row?.last_full_day || ''),
  }
}

const upsertStreakAfterFullDay = async ({
  supabaseUrl,
  serviceRole,
  userId,
  fullDateKey,
}: {
  supabaseUrl: string
  serviceRole: string
  userId: string
  fullDateKey: string
}) => {
  const prev = await readStreak({ supabaseUrl, serviceRole, userId })
  const next = computeNextStreak({
    previousCurrent: prev.current,
    previousBest: prev.best,
    previousLastDate: prev.lastDate,
    nextFullDate: fullDateKey,
  })

  const upsertRes = await restRequest({
    supabaseUrl,
    serviceRole,
    path: 'ritual_streaks',
    method: 'POST',
    query: { on_conflict: 'user_id' },
    prefer: 'resolution=merge-duplicates,return=representation',
    body: [
      {
        user_id: userId,
        current_streak: next.current,
        best_streak: next.best,
        last_full_day: next.lastDate,
        updated_at: new Date().toISOString(),
      },
    ],
  })

  if (!upsertRes.ok) {
    return {
      ok: false,
      error: { status: upsertRes.status, details: upsertRes.data },
      streak: next,
    }
  }

  return {
    ok: true,
    error: null,
    streak: next,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const anonKey = Deno.env.get('ANON_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || ''

    if (!supabaseUrl || !serviceRole) {
      return json({ ok: false, error: 'Missing env' }, 500)
    }

    const body: TrackBody = await req.json().catch(() => ({}))
    const activity = normalizeActivityKey(body.activity)
    if (!activity) {
      return json({ ok: false, error: 'Invalid activity' }, 400)
    }

    const dateKey = clampDateKeyToServerWindow(normalizeDateKey(body.dateKey || body.date))
    const source = String(body.source || 'app').trim().slice(0, 64) || 'app'

    const userId = await resolveAuthUserId({
      supabaseUrl,
      anonKey,
      authHeader: req.headers.get('Authorization'),
    })
    if (!userId) return json({ ok: false, error: 'Unauthorized' }, 401)

    const eventUpsert = await restRequest({
      supabaseUrl,
      serviceRole,
      path: 'ritual_activity_events',
      method: 'POST',
      query: { on_conflict: 'user_id,activity,event_date' },
      prefer: 'resolution=ignore-duplicates,return=representation',
      body: [
        {
          user_id: userId,
          activity,
          event_date: dateKey,
          source,
        },
      ],
    })
    if (!eventUpsert.ok) {
      return json(
        {
          ok: false,
          error: 'event_upsert_failed',
          status: eventUpsert.status,
          details: eventUpsert.data,
        },
        500,
      )
    }

    const insertedEvent = toRows(eventUpsert.data).length > 0
    let awardedActivityPoints = false

    const activityLedgerUpsert = await restRequest({
      supabaseUrl,
      serviceRole,
      path: 'ritual_points_ledger',
      method: 'POST',
      query: { on_conflict: 'user_id,uniq_key' },
      prefer: 'resolution=ignore-duplicates,return=representation',
      body: [
        {
          user_id: userId,
          reason: 'activity',
          points: ACTIVITY_POINTS,
          uniq_key: `activity:${activity}:${dateKey}`,
          activity,
          event_date: dateKey,
          metadata: { source },
        },
      ],
    })
    if (!activityLedgerUpsert.ok) {
      return json(
        {
          ok: false,
          error: 'activity_ledger_failed',
          status: activityLedgerUpsert.status,
          details: activityLedgerUpsert.data,
        },
        500,
      )
    }

    if (toRows(activityLedgerUpsert.data).length > 0) {
      const apply = await rpcRequest({
        supabaseUrl,
        serviceRole,
        name: 'ritual_apply_points',
        body: {
          p_user_id: userId,
          p_delta: ACTIVITY_POINTS,
        },
      })
      if (!apply.ok) {
        return json(
          {
            ok: false,
            error: 'apply_activity_points_failed',
            status: apply.status,
            details: apply.data,
          },
          500,
        )
      }
      awardedActivityPoints = true
    }

    const todayEventsQuery = new URLSearchParams()
    todayEventsQuery.set('select', 'activity')
    todayEventsQuery.set('user_id', `eq.${userId}`)
    todayEventsQuery.set('event_date', `eq.${dateKey}`)

    const todayEventsRes = await restRequest({
      supabaseUrl,
      serviceRole,
      path: 'ritual_activity_events',
      method: 'GET',
      query: todayEventsQuery,
    })
    if (!todayEventsRes.ok) {
      return json(
        {
          ok: false,
          error: 'today_events_failed',
          status: todayEventsRes.status,
          details: todayEventsRes.data,
        },
        500,
      )
    }

    const todayActivities = [
      ...new Set(
        toRows<{ activity?: string }>(todayEventsRes.data)
          .map((row) => normalizeActivityKey(row?.activity))
          .filter((value) => !!value),
      ),
    ]
    const todayTotal = todayActivities.length

    let awardedFullBonus = false
    let streakSnapshot = await readStreak({ supabaseUrl, serviceRole, userId })

    if (todayTotal >= 3) {
      const bonusLedgerUpsert = await restRequest({
        supabaseUrl,
        serviceRole,
        path: 'ritual_points_ledger',
        method: 'POST',
        query: { on_conflict: 'user_id,uniq_key' },
        prefer: 'resolution=ignore-duplicates,return=representation',
        body: [
          {
            user_id: userId,
            reason: 'full_day_bonus',
            points: FULL_DAY_BONUS_POINTS,
            uniq_key: `full:${dateKey}`,
            activity: null,
            event_date: dateKey,
            metadata: { source },
          },
        ],
      })
      if (!bonusLedgerUpsert.ok) {
        return json(
          {
            ok: false,
            error: 'bonus_ledger_failed',
            status: bonusLedgerUpsert.status,
            details: bonusLedgerUpsert.data,
          },
          500,
        )
      }

      if (toRows(bonusLedgerUpsert.data).length > 0) {
        const applyBonus = await rpcRequest({
          supabaseUrl,
          serviceRole,
          name: 'ritual_apply_points',
          body: {
            p_user_id: userId,
            p_delta: FULL_DAY_BONUS_POINTS,
          },
        })
        if (!applyBonus.ok) {
          return json(
            {
              ok: false,
              error: 'apply_bonus_points_failed',
              status: applyBonus.status,
              details: applyBonus.data,
            },
            500,
          )
        }
        awardedFullBonus = true

        const streakUpsert = await upsertStreakAfterFullDay({
          supabaseUrl,
          serviceRole,
          userId,
          fullDateKey: dateKey,
        })
        if (!streakUpsert.ok) {
          return json(
            {
              ok: false,
              error: 'streak_upsert_failed',
              status: streakUpsert.error?.status || 500,
              details: streakUpsert.error?.details || null,
            },
            500,
          )
        }
        streakSnapshot = streakUpsert.streak
      }
    }

    if (!awardedFullBonus && todayTotal >= 3) {
      streakSnapshot = await readStreak({ supabaseUrl, serviceRole, userId })
    }

    const balance = await readBalance({ supabaseUrl, serviceRole, userId })

    return json({
      ok: true,
      data: {
        activity,
        dateKey,
        insertedEvent,
        awardedActivityPoints,
        awardedFullBonus,
        today: {
          activities: todayActivities,
          total: todayTotal,
          isFull: todayTotal >= 3,
        },
        streak: {
          current: streakSnapshot.current,
          best: streakSnapshot.best,
          lastDate: streakSnapshot.lastDate,
        },
        points: {
          balance: balance.pointsBalance,
          lifetime: balance.lifetimePoints,
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
