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
      console.error('[ritual-track] event_upsert_failed:', eventUpsert.status, eventUpsert.data)
      return json({ ok: false, error: 'internal_error' }, 500)
    }

    const insertedEvent = toRows(eventUpsert.data).length > 0

    // Atomic: ledger insert (dedupe) + balance bump in one transaction. Replaces
    // the old two-step (REST ledger insert → separate ritual_apply_points), which
    // could lose points if the function died between the steps.
    const activityAward = await rpcRequest({
      supabaseUrl,
      serviceRole,
      name: 'ritual_award_points',
      body: {
        p_user_id: userId,
        p_reason: 'activity',
        p_points: ACTIVITY_POINTS,
        p_uniq_key: `activity:${activity}:${dateKey}`,
        p_activity: activity,
        p_event_date: dateKey,
        p_metadata: { source },
      },
    })
    if (!activityAward.ok) {
      console.error('[ritual-track] activity_award_failed:', activityAward.status, activityAward.data)
      return json({ ok: false, error: 'internal_error' }, 500)
    }
    const awardedActivityPoints = Boolean(readSingleRow<{ awarded?: boolean }>(activityAward.data)?.awarded)

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
      console.error('[ritual-track] today_events_failed:', todayEventsRes.status, todayEventsRes.data)
      return json({ ok: false, error: 'internal_error' }, 500)
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
      const bonusAward = await rpcRequest({
        supabaseUrl,
        serviceRole,
        name: 'ritual_award_points',
        body: {
          p_user_id: userId,
          p_reason: 'full_day_bonus',
          p_points: FULL_DAY_BONUS_POINTS,
          p_uniq_key: `full:${dateKey}`,
          p_activity: null,
          p_event_date: dateKey,
          p_metadata: { source },
        },
      })
      if (!bonusAward.ok) {
        console.error('[ritual-track] bonus_award_failed:', bonusAward.status, bonusAward.data)
        return json({ ok: false, error: 'internal_error' }, 500)
      }

      if (readSingleRow<{ awarded?: boolean }>(bonusAward.data)?.awarded) {
        awardedFullBonus = true

        const streakUpsert = await upsertStreakAfterFullDay({
          supabaseUrl,
          serviceRole,
          userId,
          fullDateKey: dateKey,
        })
        if (!streakUpsert.ok) {
          console.error('[ritual-track] streak_upsert_failed:', streakUpsert.error?.status, streakUpsert.error?.details)
          return json({ ok: false, error: 'internal_error' }, 500)
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
