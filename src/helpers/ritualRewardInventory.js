const GUEST_REWARD_INVENTORY_KEY = 'arcana_guest_reward_inventory_v1'
const GUEST_REWARD_MIGRATION_STATE_KEY = 'arcana_guest_reward_inventory_migration_v1'
const GUEST_REWARD_CLAIMS_KEY = 'arcana_guest_reward_claims_v1'
const AUTH_REWARD_INVENTORY_CACHE_KEY = 'arcana_auth_reward_inventory_cache_v1'
const MAX_GUEST_CLAIMS = 240
const DAY_24_HOURS_MS = 24 * 60 * 60 * 1000

export const RITUAL_REWARD_KEYS = Object.freeze({
  extraTarotSpread: 'extra_tarot_spread',
  horoscopeLoveUnlock24h: 'horoscope_love_unlock_24h',
  horoscopeCareerUnlock24h: 'horoscope_career_unlock_24h',
  mysticBadge: 'mystic_badge',
})

export const RITUAL_REWARD_CATALOG_V1 = Object.freeze([
  {
    key: RITUAL_REWARD_KEYS.extraTarotSpread,
    titleEn: 'Extra Tarot Spread',
    titleUk: 'Додатковий розклад Таро',
    descriptionEn: 'Unlock one premium-gated tarot spread start.',
    descriptionUk: 'Відкриває один старт преміум-розкладу Таро.',
    costPoints: 60,
    sortOrder: 10,
  },
  {
    key: RITUAL_REWARD_KEYS.horoscopeLoveUnlock24h,
    titleEn: 'Love Unlock 24h',
    titleUk: 'Доступ до Кохання на 24г',
    descriptionEn: 'Unlocks Love horoscope tab for 24 hours.',
    descriptionUk: 'Відкриває вкладку Кохання в гороскопі на 24 години.',
    costPoints: 35,
    sortOrder: 20,
  },
  {
    key: RITUAL_REWARD_KEYS.horoscopeCareerUnlock24h,
    titleEn: 'Career Unlock 24h',
    titleUk: 'Доступ до Кар’єри на 24г',
    descriptionEn: 'Unlocks Career horoscope tab for 24 hours.',
    descriptionUk: 'Відкриває вкладку Кар’єра в гороскопі на 24 години.',
    costPoints: 35,
    sortOrder: 30,
  },
  {
    key: RITUAL_REWARD_KEYS.mysticBadge,
    titleEn: 'Mystic Badge',
    titleUk: 'Містичний бейдж',
    descriptionEn: 'One-time collectible ritual identity badge.',
    descriptionUk: 'Одноразовий колекційний бейдж ритуалу.',
    costPoints: 45,
    sortOrder: 40,
  },
])

export const INVENTORY_MIGRATION_STATES = Object.freeze({
  localOnly: 'local_only',
  syncing: 'syncing',
  migrated: 'migrated',
})

const ALL_REWARD_KEYS = new Set(Object.values(RITUAL_REWARD_KEYS))
const CATALOG_BY_KEY = new Map(RITUAL_REWARD_CATALOG_V1.map((item) => [item.key, item]))
const TIMED_UNLOCK_KEYS = new Set([
  RITUAL_REWARD_KEYS.horoscopeLoveUnlock24h,
  RITUAL_REWARD_KEYS.horoscopeCareerUnlock24h,
])

const nowIso = () => new Date().toISOString()

const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value)

const safeReadJson = (storageKey, fallback) => {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed == null ? fallback : parsed
  } catch {
    return fallback
  }
}

const safeWriteJson = (storageKey, value) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(storageKey, JSON.stringify(value))
  } catch {
    // ignore storage failures
  }
}

const normalizeRewardKey = (value) => {
  const key = String(value || '')
    .trim()
    .toLowerCase()
  return ALL_REWARD_KEYS.has(key) ? key : ''
}

const normalizeExpiresAt = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString()
}

const toLocalDateKey = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const normalizeInventory = (value) => {
  const raw = isObject(value) ? value : {}
  const items = isObject(raw.items) ? raw.items : {}

  const extraTarotSpread = Math.max(
    0,
    Number(items[RITUAL_REWARD_KEYS.extraTarotSpread]?.quantity || 0) || 0,
  )
  const loveExpiresAt = normalizeExpiresAt(items[RITUAL_REWARD_KEYS.horoscopeLoveUnlock24h]?.expiresAt)
  const careerExpiresAt = normalizeExpiresAt(
    items[RITUAL_REWARD_KEYS.horoscopeCareerUnlock24h]?.expiresAt,
  )
  const mysticBadgeOwned = Boolean(items[RITUAL_REWARD_KEYS.mysticBadge]?.owned)

  return {
    version: 1,
    updatedAt: normalizeExpiresAt(raw.updatedAt) || nowIso(),
    items: {
      [RITUAL_REWARD_KEYS.extraTarotSpread]: {
        quantity: extraTarotSpread,
      },
      [RITUAL_REWARD_KEYS.horoscopeLoveUnlock24h]: {
        expiresAt: loveExpiresAt,
      },
      [RITUAL_REWARD_KEYS.horoscopeCareerUnlock24h]: {
        expiresAt: careerExpiresAt,
      },
      [RITUAL_REWARD_KEYS.mysticBadge]: {
        owned: mysticBadgeOwned,
      },
    },
  }
}

const normalizeClaims = (value) => {
  const raw = isObject(value) ? value : {}
  const claims = Array.isArray(raw.claims) ? raw.claims : []
  const normalizedClaims = claims
    .map((row) => {
      const rewardKey = normalizeRewardKey(row?.rewardKey)
      if (!rewardKey) return null
      const costPoints = Math.max(0, Number(row?.costPoints || 0) || 0)
      if (!costPoints) return null
      const createdAt = normalizeExpiresAt(row?.createdAt) || nowIso()
      const createdDate = new Date(createdAt)
      return {
        id: String(row?.id || `claim_${createdAt}`),
        rewardKey,
        costPoints,
        source: String(row?.source || 'guest').trim().slice(0, 64) || 'guest',
        createdAt,
        dateKey: String(row?.dateKey || '').trim() || toLocalDateKey(createdDate),
      }
    })
    .filter(Boolean)
    .slice(-MAX_GUEST_CLAIMS)

  const computedSpent = normalizedClaims.reduce(
    (acc, row) => acc + (Math.max(0, Number(row?.costPoints || 0) || 0)),
    0,
  )
  const totalSpentRaw = Math.max(0, Number(raw.totalSpent || 0) || 0)

  return {
    version: 1,
    updatedAt: normalizeExpiresAt(raw.updatedAt) || nowIso(),
    totalSpent: Math.max(totalSpentRaw, computedSpent),
    claims: normalizedClaims,
  }
}

const normalizeAuthCache = (value) => {
  const raw = isObject(value) ? value : {}
  const normalizedInventory = normalizeInventory({
    updatedAt: raw.updatedAt,
    items: raw.items,
  })
  return {
    version: 1,
    userId: String(raw.userId || '').trim(),
    updatedAt: normalizedInventory.updatedAt,
    items: normalizedInventory.items,
  }
}

const normalizeMigrationState = (value) => {
  const raw = isObject(value) ? value : {}
  const status = String(raw.status || '').trim()
  const normalizedStatus = Object.values(INVENTORY_MIGRATION_STATES).includes(status)
    ? status
    : INVENTORY_MIGRATION_STATES.localOnly

  return {
    status: normalizedStatus,
    userId: String(raw.userId || '').trim(),
    migrationKey: String(raw.migrationKey || '').trim(),
    updatedAt: normalizeExpiresAt(raw.updatedAt) || nowIso(),
  }
}

const stableJson = (value) => JSON.stringify(value, Object.keys(value || {}).sort())

const hashString = (value) => {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export const readGuestRewardInventory = () =>
  normalizeInventory(safeReadJson(GUEST_REWARD_INVENTORY_KEY, null))

export const writeGuestRewardInventory = (value) => {
  const normalized = normalizeInventory(value)
  normalized.updatedAt = nowIso()
  safeWriteJson(GUEST_REWARD_INVENTORY_KEY, normalized)
  return normalized
}

export const clearGuestRewardInventory = () => {
  writeGuestRewardInventory({})
}

export const readAuthRewardInventoryCache = () =>
  normalizeAuthCache(safeReadJson(AUTH_REWARD_INVENTORY_CACHE_KEY, null))

export const writeAuthRewardInventoryCache = (value) => {
  const normalized = normalizeAuthCache(value)
  normalized.updatedAt = nowIso()
  safeWriteJson(AUTH_REWARD_INVENTORY_CACHE_KEY, normalized)
  return normalized
}

export const getRitualRewardCatalog = () =>
  RITUAL_REWARD_CATALOG_V1
    .map((row) => ({ ...row }))
    .sort((left, right) => left.sortOrder - right.sortOrder || left.costPoints - right.costPoints)

export const readGuestRewardClaims = () =>
  normalizeClaims(safeReadJson(GUEST_REWARD_CLAIMS_KEY, null))

export const writeGuestRewardClaims = (value) => {
  const normalized = normalizeClaims(value)
  normalized.updatedAt = nowIso()
  safeWriteJson(GUEST_REWARD_CLAIMS_KEY, normalized)
  return normalized
}

export const clearGuestRewardClaims = () => {
  writeGuestRewardClaims({
    totalSpent: 0,
    claims: [],
  })
}

export const getGuestRewardSpentPoints = () =>
  Math.max(0, Number(readGuestRewardClaims().totalSpent || 0) || 0)

export const getGuestRewardRecentClaims = (limit = 5) => {
  const size = Math.max(1, Math.min(100, Number(limit) || 5))
  const rows = readGuestRewardClaims().claims || []
  return rows.slice(-size).reverse()
}

export const computeGuestRewardBalance = ({ earnedBalance = 0 } = {}) => {
  const earned = Math.max(0, Number(earnedBalance || 0) || 0)
  const spent = getGuestRewardSpentPoints()
  return Math.max(0, earned - spent)
}

const appendGuestRewardClaim = ({ rewardKey, costPoints, source = 'guest', now = new Date() } = {}) => {
  const normalizedRewardKey = normalizeRewardKey(rewardKey)
  const safeCost = Math.max(0, Number(costPoints || 0) || 0)
  if (!normalizedRewardKey || safeCost <= 0) return null

  const state = readGuestRewardClaims()
  const createdAt = normalizeExpiresAt(now) || nowIso()
  const claim = {
    id: `guest_claim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    rewardKey: normalizedRewardKey,
    costPoints: safeCost,
    source: String(source || 'guest').trim().slice(0, 64) || 'guest',
    createdAt,
    dateKey: toLocalDateKey(new Date(createdAt)),
  }
  const next = writeGuestRewardClaims({
    ...state,
    totalSpent: Math.max(0, Number(state.totalSpent || 0) || 0) + safeCost,
    claims: [...(state.claims || []), claim].slice(-MAX_GUEST_CLAIMS),
  })
  return { claim, next }
}

const buildInventoryRow = (inventory, rewardKey) => {
  const key = normalizeRewardKey(rewardKey)
  if (!key) return null
  const row = inventory?.items?.[key] || {}
  const quantity = Math.max(
    0,
    Number(
      key === RITUAL_REWARD_KEYS.mysticBadge
        ? (row?.owned ? 1 : 0)
        : row?.quantity || 0,
    ) || 0,
  )
  const expiresAt = normalizeExpiresAt(row?.expiresAt)
  return {
    rewardKey: key,
    quantity,
    expiresAt,
    updatedAt: normalizeExpiresAt(inventory?.updatedAt) || nowIso(),
  }
}

const addTimedUnlock24h = (currentExpiresAt, now = new Date()) => {
  const nowTs = now.getTime()
  const currentTs = new Date(normalizeExpiresAt(currentExpiresAt) || 0).getTime()
  const baseTs = Number.isFinite(currentTs) && currentTs > nowTs ? currentTs : nowTs
  return new Date(baseTs + DAY_24_HOURS_MS).toISOString()
}

const grantRewardToInventory = ({ rewardKey, now = new Date(), inventory }) => {
  const normalizedKey = normalizeRewardKey(rewardKey)
  if (!normalizedKey) return normalizeInventory(inventory)

  const next = normalizeInventory(inventory)
  if (normalizedKey === RITUAL_REWARD_KEYS.extraTarotSpread) {
    const prevQty = Math.max(
      0,
      Number(next.items[RITUAL_REWARD_KEYS.extraTarotSpread]?.quantity || 0) || 0,
    )
    next.items[RITUAL_REWARD_KEYS.extraTarotSpread] = { quantity: prevQty + 1 }
  } else if (
    normalizedKey === RITUAL_REWARD_KEYS.horoscopeLoveUnlock24h ||
    normalizedKey === RITUAL_REWARD_KEYS.horoscopeCareerUnlock24h
  ) {
    const prevExpiresAt = next.items[normalizedKey]?.expiresAt || ''
    next.items[normalizedKey] = {
      expiresAt: addTimedUnlock24h(prevExpiresAt, now),
    }
  } else if (normalizedKey === RITUAL_REWARD_KEYS.mysticBadge) {
    next.items[RITUAL_REWARD_KEYS.mysticBadge] = {
      owned: true,
    }
  }

  next.updatedAt = nowIso()
  return next
}

export const claimGuestReward = ({
  rewardKey,
  source = 'app',
  now = new Date(),
  earnedBalance = 0,
  lifetimePoints = 0,
} = {}) => {
  const key = normalizeRewardKey(rewardKey)
  const reward = CATALOG_BY_KEY.get(key)
  if (!key || !reward) {
    return {
      ok: false,
      errorCode: 'reward_not_found',
      data: null,
    }
  }

  const cost = Math.max(0, Number(reward.costPoints || 0) || 0)
  const balanceBeforeClaim = computeGuestRewardBalance({ earnedBalance })
  if (cost <= 0 || balanceBeforeClaim < cost) {
    return {
      ok: false,
      errorCode: 'insufficient_points',
      data: {
        points: {
          balance: balanceBeforeClaim,
          lifetime: Math.max(0, Number(lifetimePoints || 0) || 0),
        },
      },
    }
  }

  const currentInventory = readGuestRewardInventory()
  if (key === RITUAL_REWARD_KEYS.mysticBadge && currentInventory.items[RITUAL_REWARD_KEYS.mysticBadge]?.owned) {
    return {
      ok: false,
      errorCode: 'already_owned',
      data: {
        points: {
          balance: balanceBeforeClaim,
          lifetime: Math.max(0, Number(lifetimePoints || 0) || 0),
        },
      },
    }
  }

  const nextInventory = grantRewardToInventory({
    rewardKey: key,
    now,
    inventory: currentInventory,
  })
  const savedInventory = writeGuestRewardInventory(nextInventory)
  const claimState = appendGuestRewardClaim({
    rewardKey: key,
    costPoints: cost,
    source,
    now,
  })
  const claimed = claimState?.claim || null
  const balanceAfterClaim = Math.max(0, balanceBeforeClaim - cost)

  return {
    ok: true,
    errorCode: '',
    data: {
      claimId: claimed?.id || '',
      reward: {
        key,
        titleEn: reward.titleEn || '',
        titleUk: reward.titleUk || '',
        descriptionEn: reward.descriptionEn || '',
        descriptionUk: reward.descriptionUk || '',
        costPoints: cost,
      },
      points: {
        balance: balanceAfterClaim,
        lifetime: Math.max(0, Number(lifetimePoints || 0) || 0),
      },
      inventory: buildInventoryRow(savedInventory, key),
      mode: 'guest',
    },
  }
}

export const consumeGuestReward = ({ rewardKey, now = new Date() } = {}) => {
  const key = normalizeRewardKey(rewardKey)
  if (key !== RITUAL_REWARD_KEYS.extraTarotSpread) {
    return { ok: false, errorCode: 'unsupported_reward', data: null }
  }

  const inventory = readGuestRewardInventory()
  const quantity = Math.max(
    0,
    Number(inventory.items[RITUAL_REWARD_KEYS.extraTarotSpread]?.quantity || 0) || 0,
  )
  if (quantity <= 0) {
    return { ok: false, errorCode: 'insufficient_inventory', data: null }
  }

  const nextInventory = normalizeInventory(inventory)
  nextInventory.items[RITUAL_REWARD_KEYS.extraTarotSpread] = { quantity: quantity - 1 }
  nextInventory.updatedAt = normalizeExpiresAt(now) || nowIso()
  const saved = writeGuestRewardInventory(nextInventory)

  return {
    ok: true,
    errorCode: '',
    data: {
      rewardKey: key,
      quantity: Math.max(
        0,
        Number(saved.items[RITUAL_REWARD_KEYS.extraTarotSpread]?.quantity || 0) || 0,
      ),
      expiresAt: '',
      updatedAt: saved.updatedAt,
      mode: 'guest',
    },
  }
}

export const isRitualRewardActive = ({ rewardKey, userId = '', now = new Date() } = {}) => {
  const key = normalizeRewardKey(rewardKey)
  if (!key) return false
  const normalizedUserId = String(userId || '').trim()
  const authCache = readAuthRewardInventoryCache()
  const source = normalizedUserId
    ? authCache.userId === normalizedUserId
      ? authCache
      : normalizeInventory({})
    : readGuestRewardInventory()

  if (key === RITUAL_REWARD_KEYS.extraTarotSpread) {
    return Math.max(0, Number(source.items[key]?.quantity || 0) || 0) > 0
  }
  if (key === RITUAL_REWARD_KEYS.mysticBadge) {
    return Boolean(source.items[key]?.owned)
  }
  if (TIMED_UNLOCK_KEYS.has(key)) {
    const expiresAt = normalizeExpiresAt(source.items[key]?.expiresAt)
    if (!expiresAt) return false
    return new Date(expiresAt).getTime() > (now instanceof Date ? now : new Date(now)).getTime()
  }
  return false
}

export const getRitualRewardQuantity = ({ rewardKey, userId = '' } = {}) => {
  const key = normalizeRewardKey(rewardKey)
  if (!key) return 0
  const normalizedUserId = String(userId || '').trim()
  const authCache = readAuthRewardInventoryCache()
  const source = normalizedUserId
    ? authCache.userId === normalizedUserId
      ? authCache
      : normalizeInventory({})
    : readGuestRewardInventory()

  if (key === RITUAL_REWARD_KEYS.mysticBadge) {
    return source.items[key]?.owned ? 1 : 0
  }
  return Math.max(0, Number(source.items[key]?.quantity || 0) || 0)
}

export const getRitualRewardInventorySnapshot = ({ userId = '' } = {}) => {
  const normalizedUserId = String(userId || '').trim()
  const cache = readAuthRewardInventoryCache()
  if (normalizedUserId && cache.userId === normalizedUserId) {
    return {
      mode: 'auth',
      userId: cache.userId,
      inventory: cache,
    }
  }
  return {
    mode: 'guest',
    userId: '',
    inventory: readGuestRewardInventory(),
  }
}

export const applyAuthInventoryRowsToCache = ({ userId, rows } = {}) => {
  const normalizedUserId = String(userId || '').trim()
  if (!normalizedUserId) {
    return writeAuthRewardInventoryCache({
      userId: '',
      items: {},
    })
  }

  const nextItems = {}
  const safeRows = Array.isArray(rows) ? rows : []
  for (const row of safeRows) {
    const rewardKey = normalizeRewardKey(row?.rewardKey || row?.reward_key)
    if (!rewardKey) continue
    const quantity = Math.max(0, Number(row?.quantity || 0) || 0)
    const expiresAt = normalizeExpiresAt(row?.expiresAt || row?.expires_at)
    if (rewardKey === RITUAL_REWARD_KEYS.mysticBadge) {
      nextItems[rewardKey] = { owned: quantity >= 1 || Boolean(row?.owned) }
      continue
    }
    if (TIMED_UNLOCK_KEYS.has(rewardKey)) {
      nextItems[rewardKey] = { expiresAt }
      continue
    }
    nextItems[rewardKey] = { quantity }
  }

  return writeAuthRewardInventoryCache({
    userId: normalizedUserId,
    updatedAt: nowIso(),
    items: nextItems,
  })
}

export const upsertAuthInventoryRowInCache = ({ userId, row } = {}) => {
  const normalizedUserId = String(userId || '').trim()
  const rewardKey = normalizeRewardKey(row?.rewardKey || row?.reward_key)
  if (!normalizedUserId || !rewardKey) {
    return readAuthRewardInventoryCache()
  }

  const cache = readAuthRewardInventoryCache()
  const base =
    cache.userId === normalizedUserId
      ? normalizeAuthCache(cache)
      : normalizeAuthCache({ userId: normalizedUserId, items: {} })

  const quantity = Math.max(0, Number(row?.quantity || 0) || 0)
  const expiresAt = normalizeExpiresAt(row?.expiresAt || row?.expires_at)
  if (rewardKey === RITUAL_REWARD_KEYS.mysticBadge) {
    base.items[rewardKey] = { owned: quantity >= 1 || Boolean(row?.owned) }
  } else if (TIMED_UNLOCK_KEYS.has(rewardKey)) {
    base.items[rewardKey] = { expiresAt }
  } else {
    base.items[rewardKey] = { quantity }
  }

  return writeAuthRewardInventoryCache(base)
}

export const exportGuestRewardInventorySnapshot = (value = new Date()) => {
  const now = value instanceof Date ? value : new Date(value)
  const inventory = readGuestRewardInventory()
  const items = []

  const extraTarotSpreadQty = Math.max(
    0,
    Number(inventory.items[RITUAL_REWARD_KEYS.extraTarotSpread]?.quantity || 0) || 0,
  )
  if (extraTarotSpreadQty > 0) {
    items.push({
      rewardKey: RITUAL_REWARD_KEYS.extraTarotSpread,
      quantity: extraTarotSpreadQty,
    })
  }

  for (const rewardKey of TIMED_UNLOCK_KEYS) {
    const expiresAt = normalizeExpiresAt(inventory.items[rewardKey]?.expiresAt)
    if (!expiresAt) continue
    const expiresDate = new Date(expiresAt)
    if (Number.isNaN(expiresDate.getTime())) continue
    if (expiresDate <= now) continue
    items.push({
      rewardKey,
      expiresAt,
    })
  }

  if (inventory.items[RITUAL_REWARD_KEYS.mysticBadge]?.owned) {
    items.push({
      rewardKey: RITUAL_REWARD_KEYS.mysticBadge,
      quantity: 1,
      owned: true,
    })
  }

  items.sort((left, right) => String(left.rewardKey || '').localeCompare(String(right.rewardKey || '')))

  return {
    items,
    hasData: items.length > 0,
    updatedAt: inventory.updatedAt,
  }
}

export const readGuestRewardMigrationState = () =>
  normalizeMigrationState(safeReadJson(GUEST_REWARD_MIGRATION_STATE_KEY, null))

export const writeGuestRewardMigrationState = (value) => {
  const next = normalizeMigrationState(value)
  next.updatedAt = nowIso()
  safeWriteJson(GUEST_REWARD_MIGRATION_STATE_KEY, next)
  return next
}

export const setGuestRewardMigrationState = ({ status, userId = '', migrationKey = '' } = {}) =>
  writeGuestRewardMigrationState({
    status,
    userId,
    migrationKey,
  })

export const clearGuestRewardMigrationState = () => {
  writeGuestRewardMigrationState({
    status: INVENTORY_MIGRATION_STATES.localOnly,
    userId: '',
    migrationKey: '',
  })
}

export const buildGuestInventoryMigrationKey = ({ userId, items, updatedAt = '' } = {}) => {
  const safeUserId = String(userId || '').trim()
  const safeItems = Array.isArray(items) ? items : []
  const payload = {
    userId: safeUserId,
    updatedAt: String(updatedAt || '').trim(),
    items: safeItems.map((row) => ({
      rewardKey: normalizeRewardKey(row?.rewardKey),
      quantity: Math.max(0, Number(row?.quantity || 0) || 0),
      expiresAt: normalizeExpiresAt(row?.expiresAt),
      owned: Boolean(row?.owned),
    })),
  }
  const digest = hashString(stableJson(payload))
  return `ritual_inv_v1:${safeUserId || 'guest'}:${digest}`
}
