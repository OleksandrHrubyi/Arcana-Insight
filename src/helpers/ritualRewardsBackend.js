import { invokeFunction } from 'src/services/supabaseNative'
import { computeLocalRitualPoints, getLocalDateKey } from './dailyRitual'
import {
  applyAuthInventoryRowsToCache,
  buildGuestInventoryMigrationKey,
  claimGuestReward,
  clearGuestRewardClaims,
  clearGuestRewardInventory,
  consumeGuestReward,
  getRitualRewardInventorySnapshot,
  exportGuestRewardInventorySnapshot,
  INVENTORY_MIGRATION_STATES,
  readGuestRewardMigrationState,
  setGuestRewardMigrationState,
  upsertAuthInventoryRowInCache,
} from './ritualRewardInventory'

const ALLOWED_ACTIVITIES = new Set(['daily_card', 'horoscope', 'tarot'])
const trackedKeys = new Set()
const pendingTrackRequests = new Map()
const GUEST_QUEUE_STORAGE_KEY = 'arcana_guest_ritual_queue_v1'
const GUEST_QUEUE_MAX_ITEMS = 180

const DASHBOARD_TTL_MS = 45000
let dashboardCache = null
let dashboardCacheAt = 0
// Cache must be scoped to (userId, days, dateKey): a single global blob otherwise
// served a 7-day payload to a 30-day request and (worse) one account's dashboard to
// the next account on a fast switch within the TTL. A-20.
let dashboardCacheKey = ''
let guestSyncInFlight = null
let guestInventorySyncInFlight = null
let guestStateSyncInFlight = null

const normalizeUserId = (value) => String(value || '').trim()
const normalizeRewardKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

const normalizeActivity = (value) => {
  const key = String(value || '')
    .trim()
    .toLowerCase()
  return ALLOWED_ACTIVITIES.has(key) ? key : ''
}

const normalizeDateKey = (value) => {
  const key = String(value || '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(key)) return key
  return getLocalDateKey()
}

const readGuestQueue = () => {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(GUEST_QUEUE_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((row) => ({
        activity: normalizeActivity(row?.activity),
        dateKey: normalizeDateKey(row?.dateKey),
      }))
      .filter((row) => !!row.activity)
  } catch {
    return []
  }
}

const writeGuestQueue = (items) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(GUEST_QUEUE_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // ignore storage failures
  }
}

const dedupeGuestQueue = (items) => {
  const unique = []
  const seen = new Set()
  for (const row of items) {
    const activity = normalizeActivity(row?.activity)
    if (!activity) continue
    const dateKey = normalizeDateKey(row?.dateKey)
    const dedupeKey = `${activity}:${dateKey}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    unique.push({ activity, dateKey })
  }
  return unique
    .sort((left, right) =>
      left.dateKey === right.dateKey
        ? left.activity.localeCompare(right.activity)
        : left.dateKey.localeCompare(right.dateKey),
    )
    .slice(-GUEST_QUEUE_MAX_ITEMS)
}

const toResult = (data, error) => ({
  ok: !error,
  data: error ? null : data,
  error: error || null,
})

const unwrapPayload = (value) => {
  if (value && typeof value === 'object' && value.data && typeof value.data === 'object') {
    return value.data
  }
  return value
}

const extractInventoryRows = (value) => {
  const payload = unwrapPayload(value)
  if (Array.isArray(payload?.inventory)) return payload.inventory
  if (Array.isArray(payload?.dashboard?.inventory)) return payload.dashboard.inventory
  return []
}

export const trackRitualActivity = async (activity, options = {}) => {
  const activityKey = normalizeActivity(activity)
  if (!activityKey) return { ok: false, data: null, error: new Error('Invalid activity') }

  const dateKey = normalizeDateKey(options.dateKey)
  const source = String(options.source || 'app').trim().slice(0, 64) || 'app'
  const dedupeKey = `${activityKey}:${dateKey}`

  if (!options.force && trackedKeys.has(dedupeKey)) {
    return { ok: true, data: { ok: true, deduped: true }, error: null }
  }
  if (!options.force && pendingTrackRequests.has(dedupeKey)) {
    return pendingTrackRequests.get(dedupeKey)
  }

  const request = (async () => {
    try {
      const { data, error } = await invokeFunction(
        'ritual-track',
        {
          activity: activityKey,
          dateKey,
          source,
        },
        8000,
      )
      if (!error) trackedKeys.add(dedupeKey)
      return toResult(data, error)
    } catch (error) {
      return toResult(null, error)
    } finally {
      pendingTrackRequests.delete(dedupeKey)
    }
  })()

  pendingTrackRequests.set(dedupeKey, request)
  return request
}

export const queueGuestRitualActivity = (activity, options = {}) => {
  const activityKey = normalizeActivity(activity)
  if (!activityKey) return { ok: false, data: null, error: new Error('Invalid activity') }

  const dateKey = normalizeDateKey(options.dateKey)
  const queue = readGuestQueue()
  queue.push({ activity: activityKey, dateKey })
  writeGuestQueue(dedupeGuestQueue(queue))

  return {
    ok: true,
    data: {
      queued: true,
      activity: activityKey,
      dateKey,
    },
    error: null,
  }
}

export const trackRitualActivityWithGuestFallback = async (activity, options = {}) => {
  const isAuthenticated = Boolean(options.userId || options.isAuthenticated)
  if (!isAuthenticated) {
    return queueGuestRitualActivity(activity, options)
  }

  const result = await trackRitualActivity(activity, options)
  if (!result.ok) {
    queueGuestRitualActivity(activity, options)
  }
  return result
}

export const syncQueuedGuestRitualActivities = async (options = {}) => {
  const force = Boolean(options.force)
  if (guestSyncInFlight && !force) return guestSyncInFlight

  const run = (async () => {
    const queue = dedupeGuestQueue(readGuestQueue())
    if (!queue.length) {
      return { ok: true, data: { total: 0, synced: 0, failed: 0 }, error: null }
    }

    let synced = 0
    let failed = 0
    const remaining = []

    for (const row of queue) {
      const result = await trackRitualActivity(row.activity, {
        dateKey: row.dateKey,
        source: 'guest_sync',
        force: true,
      })
      if (result.ok) {
        synced += 1
      } else {
        failed += 1
        remaining.push(row)
      }
    }

    writeGuestQueue(remaining)
    if (synced > 0) {
      invalidateRitualDashboardCache()
    }

    return {
      ok: failed === 0,
      data: {
        total: queue.length,
        synced,
        failed,
      },
      error: failed > 0 ? new Error('Some guest ritual activities failed to sync') : null,
    }
  })()

  guestSyncInFlight = run
  try {
    return await run
  } finally {
    guestSyncInFlight = null
  }
}

export const syncGuestRewardInventory = async (options = {}) => {
  const force = Boolean(options.force)
  const userId = normalizeUserId(options.userId)
  if (!userId) {
    return {
      ok: true,
      data: { skipped: true, reason: 'unauthenticated', migrationState: INVENTORY_MIGRATION_STATES.localOnly },
      error: null,
    }
  }

  if (guestInventorySyncInFlight && !force) return guestInventorySyncInFlight

  const run = (async () => {
    const snapshot = exportGuestRewardInventorySnapshot(new Date())
    const currentState = readGuestRewardMigrationState()

    if (!snapshot.hasData) {
      clearGuestRewardClaims()
      setGuestRewardMigrationState({
        status: INVENTORY_MIGRATION_STATES.migrated,
        userId,
        migrationKey: 'ritual_inv_v1:empty',
      })
      return {
        ok: true,
        data: {
          skipped: true,
          reason: 'empty_inventory',
          migrationState: INVENTORY_MIGRATION_STATES.migrated,
        },
        error: null,
      }
    }

    const migrationKey = buildGuestInventoryMigrationKey({
      userId,
      items: snapshot.items,
      updatedAt: snapshot.updatedAt,
    })

    if (
      !force &&
      currentState.status === INVENTORY_MIGRATION_STATES.migrated &&
      currentState.userId === userId &&
      currentState.migrationKey === migrationKey
    ) {
      return {
        ok: true,
        data: {
          skipped: true,
          reason: 'already_migrated',
          migrationState: INVENTORY_MIGRATION_STATES.migrated,
          migrationKey,
        },
        error: null,
      }
    }

    setGuestRewardMigrationState({
      status: INVENTORY_MIGRATION_STATES.syncing,
      userId,
      migrationKey,
    })

    try {
      const { data, error } = await invokeFunction(
        'ritual-inventory-sync',
        {
          migrationKey,
          inventory: snapshot.items,
          source: String(options.source || 'guest_sync').trim().slice(0, 64) || 'guest_sync',
        },
        8000,
      )

      if (error) {
        setGuestRewardMigrationState({
          status: INVENTORY_MIGRATION_STATES.localOnly,
          userId,
          migrationKey: '',
        })
        return { ok: false, data: null, error }
      }

      clearGuestRewardInventory()
      clearGuestRewardClaims()
      setGuestRewardMigrationState({
        status: INVENTORY_MIGRATION_STATES.migrated,
        userId,
        migrationKey,
      })
      const serverInventoryRows = extractInventoryRows(data)
      if (serverInventoryRows.length) {
        applyAuthInventoryRowsToCache({
          userId,
          rows: serverInventoryRows,
        })
      }
      invalidateRitualDashboardCache()

      return {
        ok: true,
        data: {
          synced: true,
          migrationKey,
          migrationState: INVENTORY_MIGRATION_STATES.migrated,
          server: data || null,
        },
        error: null,
      }
    } catch (error) {
      setGuestRewardMigrationState({
        status: INVENTORY_MIGRATION_STATES.localOnly,
        userId,
        migrationKey: '',
      })
      return { ok: false, data: null, error }
    }
  })()

  guestInventorySyncInFlight = run
  try {
    return await run
  } finally {
    guestInventorySyncInFlight = null
  }
}

export const syncGuestRitualState = async (options = {}) => {
  const force = Boolean(options.force)
  if (guestStateSyncInFlight && !force) return guestStateSyncInFlight

  const run = (async () => {
    const userId = normalizeUserId(options.userId)
    const activity = await syncQueuedGuestRitualActivities(options)
    const inventory = await syncGuestRewardInventory({
      ...options,
      userId,
    })

    return {
      ok: Boolean(activity?.ok) && Boolean(inventory?.ok),
      data: {
        activity: activity?.data || null,
        inventory: inventory?.data || null,
      },
      error: activity?.error || inventory?.error || null,
    }
  })()

  guestStateSyncInFlight = run
  try {
    return await run
  } finally {
    guestStateSyncInFlight = null
  }
}

export const loadRitualDashboard = async (options = {}) => {
  const force = Boolean(options.force)
  const now = Date.now()
  const userId = normalizeUserId(options.userId)
  const days = options.days || 7
  const dateKey = normalizeDateKey(options.dateKey)
  const requestKey = `${userId}|${days}|${dateKey}`
  if (
    !force &&
    dashboardCache &&
    dashboardCacheKey === requestKey &&
    now - dashboardCacheAt < DASHBOARD_TTL_MS
  ) {
    return { ok: true, data: dashboardCache, error: null, cached: true }
  }

  try {
    const { data, error } = await invokeFunction('ritual-dashboard', { days, dateKey }, 8000)
    const out = toResult(data, error)
    if (out.ok && data) {
      dashboardCache = data
      dashboardCacheAt = now
      dashboardCacheKey = requestKey
      const inventoryRows = extractInventoryRows(data)
      if (userId && inventoryRows.length) {
        applyAuthInventoryRowsToCache({
          userId,
          rows: inventoryRows,
        })
      }
    }
    return out
  } catch (error) {
    return toResult(null, error)
  }
}

export const claimRitualReward = async (rewardKey, options = {}) => {
  const normalizedRewardKey = normalizeRewardKey(rewardKey)
  if (!normalizedRewardKey) {
    return { ok: false, data: null, error: new Error('Missing reward key') }
  }

  const userId = normalizeUserId(options.userId)
  const source = String(options.source || 'app').trim().slice(0, 64) || 'app'

  if (!userId) {
    const localPoints = computeLocalRitualPoints(new Date())
    const guestClaim = claimGuestReward({
      rewardKey: normalizedRewardKey,
      source,
      earnedBalance: localPoints.balance,
      lifetimePoints: localPoints.lifetime,
      now: new Date(),
    })
    if (!guestClaim.ok) {
      return {
        ok: false,
        data: null,
        error: new Error(guestClaim.errorCode || 'guest_claim_failed'),
      }
    }
    dashboardCache = null
    dashboardCacheAt = 0
    return {
      ok: true,
      data: guestClaim.data,
      error: null,
    }
  }

  try {
    const { data, error } = await invokeFunction(
      'ritual-claim',
      {
        rewardKey: normalizedRewardKey,
        source,
      },
      8000,
    )

    const out = toResult(data, error)
    if (out.ok) {
      const payload = unwrapPayload(out.data)
      if (payload?.inventory) {
        upsertAuthInventoryRowInCache({
          userId,
          row: payload.inventory,
        })
      }
      dashboardCache = null
      dashboardCacheAt = 0
    }
    return out
  } catch (error) {
    return toResult(null, error)
  }
}

export const consumeRitualReward = async (rewardKey, options = {}) => {
  const normalizedRewardKey = normalizeRewardKey(rewardKey)
  if (!normalizedRewardKey) {
    return { ok: false, data: null, error: new Error('Missing reward key') }
  }

  const userId = normalizeUserId(options.userId)
  const source = String(options.source || 'app').trim().slice(0, 64) || 'app'

  if (!userId) {
    const guestConsume = consumeGuestReward({
      rewardKey: normalizedRewardKey,
      now: new Date(),
    })
    if (!guestConsume.ok) {
      return {
        ok: false,
        data: null,
        error: new Error(guestConsume.errorCode || 'guest_consume_failed'),
      }
    }
    return {
      ok: true,
      data: guestConsume.data,
      error: null,
    }
  }

  try {
    const { data, error } = await invokeFunction(
      'ritual-consume',
      {
        rewardKey: normalizedRewardKey,
        source,
      },
      8000,
    )

    const out = toResult(data, error)
    if (out.ok) {
      const payload = unwrapPayload(out.data)
      if (payload?.inventory) {
        upsertAuthInventoryRowInCache({
          userId,
          row: payload.inventory,
        })
      }
      dashboardCache = null
      dashboardCacheAt = 0
    }
    return out
  } catch (error) {
    return toResult(null, error)
  }
}

export const getRitualRewardInventory = (options = {}) =>
  getRitualRewardInventorySnapshot({
    userId: normalizeUserId(options.userId),
  })

export const ensureRitualRewardInventory = async (options = {}) => {
  const userId = normalizeUserId(options.userId)
  if (!userId) {
    return {
      ok: true,
      data: getRitualRewardInventory({ userId }),
      error: null,
    }
  }

  const current = getRitualRewardInventory({ userId })
  if (!options.force && current?.mode === 'auth') {
    return { ok: true, data: current, error: null, cached: true }
  }

  const dashboard = await loadRitualDashboard({
    days: Number(options.days || 7) || 7,
    dateKey: normalizeDateKey(options.dateKey),
    force: Boolean(options.force),
    userId,
  })

  if (!dashboard.ok) {
    return {
      ok: false,
      data: getRitualRewardInventory({ userId }),
      error: dashboard.error || new Error('dashboard_load_failed'),
    }
  }

  return {
    ok: true,
    data: getRitualRewardInventory({ userId }),
    error: null,
  }
}

export const invalidateRitualDashboardCache = () => {
  dashboardCache = null
  dashboardCacheAt = 0
  dashboardCacheKey = ''
}
