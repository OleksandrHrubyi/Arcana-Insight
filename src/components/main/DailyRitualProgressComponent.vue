<template>
  <div v-if="isStreaksOnly" :class="['energy-sheet-streaks', variantClass]">
    <div class="energy-chip">
      <span class="energy-chip__icon">🔥</span>
      <span class="energy-chip__value">{{ currentStreakShort }}</span>
      <span class="energy-chip__label">{{ tt('dailyPage.streakCurrent') }}</span>
    </div>
    <div class="energy-chip energy-chip--best">
      <span class="energy-chip__icon">🏆</span>
      <span class="energy-chip__value">{{ bestStreakShort }}</span>
      <span class="energy-chip__label">{{ tt('dailyPage.streakBest') }}</span>
    </div>
  </div>

  <div
    v-else
    :class="[
      'energy-sheet-dock',
      variantClass,
      {
        'energy-sheet-dock--lite-motion': shouldUseLiteMotion,
        'energy-sheet-dock--compact': props.compact,
      },
    ]"
  >
    <section class="energy-hero">
      <div class="energy-hero__top">
        <div class="energy-hero__intro">
          <div class="energy-hero__eyebrow">{{ tt('dailyPage.energySheet.eyebrow') }}</div>
          <h2 class="energy-hero__title">{{ heroTitle }}</h2>
          <p class="energy-hero__subtitle">{{ heroSubtitle }}</p>
        </div>
        <div class="energy-orb">
          <span class="energy-orb__ring-glow" aria-hidden="true"></span>
          <span class="energy-orb__spark energy-orb__spark--one" aria-hidden="true"></span>
          <span class="energy-orb__spark energy-orb__spark--two" aria-hidden="true"></span>
          <div class="energy-orb__inner">
            <span class="energy-orb__label">{{ tt('dailyPage.energySheet.pointsLabel') }}</span>
            <strong class="energy-orb__value">{{ pointsBalance }}</strong>
          </div>
        </div>
      </div>
      <div class="energy-hero__reward">
        <div class="energy-hero__reward-row">
          <span>{{ tt('dailyPage.energySheet.rewardProgressLabel') }}</span>
          <strong>{{ pointsBalance }} / {{ totalCatalogPoints }} pts</strong>
        </div>
        <div class="energy-hero__reward-track" aria-hidden="true">
          <span :style="{ width: `${rewardProgress.percent}%` }"></span>
        </div>
      </div>

      <div class="energy-stat-grid">
        <article class="energy-stat-card">
          <span class="energy-stat-card__icon">🔥</span>
          <span class="energy-stat-card__label">{{ tt('dailyPage.streakCurrent') }}</span>
          <strong class="energy-stat-card__value">{{ currentStreakShort }}</strong>
        </article>
        <article class="energy-stat-card">
          <span class="energy-stat-card__icon">🏆</span>
          <span class="energy-stat-card__label">{{ tt('dailyPage.streakBest') }}</span>
          <strong class="energy-stat-card__value">{{ bestStreakShort }}</strong>
        </article>
      </div>
    </section>

    <div class="energy-sheet-scroll">
      <section class="energy-block">
        <header class="energy-block__head">
          <div class="energy-block__title">{{ tt('dailyPage.loopLabel') }}</div>
          <div class="energy-block__meta">{{ ritualDoneCount }} / 3</div>
        </header>

        <div class="energy-steps-list">
          <button
            v-for="item in ritualItems"
            :key="item.key"
            type="button"
            :class="[
              'energy-step',
              {
                'energy-step--done': item.done,
                'energy-step--next': item.routeName === nextRouteName && !item.done,
              },
            ]"
            @click="onStepClick(item)"
          >
            <span class="energy-step__lead">
              <span class="energy-step__icon">{{ item.emoji }}</span>
              <span class="energy-step__text">
                <span class="energy-step__label">{{ tt(item.labelKey) }}</span>
                <span v-if="resolveStepStatusLabel(item)" class="energy-step__status">
                  {{ resolveStepStatusLabel(item) }}
                </span>
              </span>
            </span>
            <q-icon :name="item.done ? 'check_circle' : 'radio_button_unchecked'" size="18px" />
          </button>
        </div>
      </section>

      <section class="energy-block">
        <header class="energy-block__head">
          <div class="energy-block__head-copy">
            <div class="energy-block__title">{{ tt('dailyPage.progressLabel') }}</div>
            <p v-if="!authStore.state.user?.id" class="energy-block__hint">
              {{ guestSyncHint }}
            </p>
          </div>
          <div class="energy-block__meta">{{ activeDaysCount }} / 7</div>
        </header>

        <div class="energy-week-grid">
          <div
            v-for="day in weeklyJourney"
            :key="day.dateKey"
            :class="[
              'energy-week-day',
              {
                'energy-week-day--active': day.total > 0,
                'energy-week-day--full': day.total >= 3,
                'energy-week-day--today': day.isToday,
              },
            ]"
          >
            <span class="energy-week-day__label">{{ day.weekdayShort }}</span>
            <span class="energy-week-day__dot"></span>
          </div>
        </div>
      </section>

      <section v-if="showClaimRewardButton" class="energy-actions">
        <button
          type="button"
          class="energy-actions__primary"
          @click="onClaimRewardClick"
        >
          {{ chooseBonusLabel }}
        </button>
      </section>
    </div>

    <section v-if="showCloseButton" class="energy-sheet-close-dock">
      <div class="energy-actions__close-wrap energy-actions__close-wrap--dock">
        <button
          type="button"
          class="arcana-btn arcana-btn--secondary"
          @click.stop.prevent="onCloseClick"
        >
          {{ tt('common.close') }}
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { t, currentLocale } from 'src/i18n'
import {
  computeLocalRitualPoints,
  DAILY_ACTIVITY_KEYS,
  getLocalDateKey,
  getRecentDailyJourney,
  hasDailyActivityToday,
  readDailyStreak,
} from 'src/helpers/dailyRitual'
import {
  loadRitualDashboard,
  syncGuestRitualState,
} from 'src/helpers/ritualRewardsBackend.js'
import {
  computeGuestRewardBalance,
  getGuestRewardRecentClaims,
  getRitualRewardCatalog,
  readGuestRewardInventory,
  RITUAL_REWARD_KEYS,
} from 'src/helpers/ritualRewardInventory'
import {
  computeRewardProgress,
  resolveNextRitualRoute,
  resolvePrimaryActionType,
  resolveRewardState,
  ENERGY_REWARD_STATES,
} from 'src/helpers/energySheetState'
import {
  ENERGY_SHEET_VARIANTS,
  resolveEnergySheetVariant,
} from 'src/constants/energySheetVariants'
import { analytics } from 'src/services/analytics'
import { suppressNavigationHaptics } from 'src/helpers/navigationHaptics'
import { impactLight } from 'src/helpers/haptics'
import { useAuthStore } from 'stores/authStore.js'

const props = defineProps({
  compact: {
    type: Boolean,
    default: false,
  },
  mode: {
    type: String,
    default: 'full',
  },
  variant: {
    type: String,
    default: 'saved',
  },
  isVisible: {
    type: Boolean,
    default: false,
  },
  experienceVariant: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['request-close', 'navigate-to'])
const authStore = useAuthStore()
const locale = computed(() => currentLocale.value || 'en')
const tt = (key) => t(locale.value, key)

const ALLOWED_REMOTE_ACTIVITIES = new Set(Object.values(DAILY_ACTIVITY_KEYS))
const isStreaksOnly = computed(() => props.mode === 'streaks')
const nowTick = ref(Date.now())
const remoteDashboard = ref(null)
const localPoints = ref({
  balance: 0,
  lifetime: 0,
})
const localRewardInventory = ref(readGuestRewardInventory())
const prefersReducedMotion = ref(false)

let nowTickTimer = null
let reducedMotionMedia = null
let reducedMotionListener = null

const normalizedVariant = computed(() => resolveEnergySheetVariant(props.experienceVariant))
const variantClass = computed(() => `energy-sheet-dock--${normalizedVariant.value}`)
const shouldUseLiteMotion = computed(
  () =>
    normalizedVariant.value === ENERGY_SHEET_VARIANTS.premiumLite ||
    prefersReducedMotion.value,
)
const showCloseButton = computed(() => props.compact && !isStreaksOnly.value)

const syncReducedMotion = () => {
  prefersReducedMotion.value = Boolean(reducedMotionMedia?.matches)
}

const normalizeRemoteActivities = (value) => {
  if (!Array.isArray(value)) return []
  const out = []
  for (const entry of value) {
    const key = String(entry || '').trim()
    if (!ALLOWED_REMOTE_ACTIVITIES.has(key)) continue
    if (out.includes(key)) continue
    out.push(key)
  }
  return out
}

const refreshLocalPoints = () => {
  localPoints.value = computeLocalRitualPoints(new Date(nowTick.value))
  localRewardInventory.value = readGuestRewardInventory()
}

const refreshRemoteDashboard = async (force = false) => {
  if (!authStore.state.user?.id) {
    remoteDashboard.value = null
    return
  }

  const result = await loadRitualDashboard({
    days: 7,
    force,
    dateKey: getLocalDateKey(new Date(nowTick.value)),
    userId: authStore.state.user?.id || '',
  })
  if (!result.ok) return
  const dashboard = result.data?.dashboard || null
  if (!dashboard || typeof dashboard !== 'object') return
  remoteDashboard.value = dashboard
}

const logEnergyEvent = (eventName, params = {}) => {
  void analytics.logEvent(eventName, {
    source: 'energy_sheet',
    locale: locale.value,
    variant: normalizedVariant.value,
    ...params,
  })
}

watch(
  () => props.isVisible,
  (isVisible, wasVisible) => {
    if (!isVisible || wasVisible) return
    refreshLocalPoints()
    void refreshRemoteDashboard(true)
    logEnergyEvent('energy_sheet_opened', {
      ritual_done_count: ritualDoneCount.value,
    })
    logEnergyEvent('energy_sheet_variant_exposed')
  },
)

watch(
  () => authStore.state.user?.id || '',
  async (userId) => {
    if (!userId) {
      remoteDashboard.value = null
      return
    }
    await syncGuestRitualState({
      userId,
      source: 'energy_sheet_auth_sync',
    })
    await refreshRemoteDashboard(true)
  },
  { immediate: true },
)

onMounted(() => {
  refreshLocalPoints()
  nowTickTimer = window.setInterval(() => {
    nowTick.value = Date.now()
  }, 60000)

  if (window?.matchMedia) {
    reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)')
    syncReducedMotion()
    reducedMotionListener = () => syncReducedMotion()
    if (reducedMotionMedia.addEventListener) {
      reducedMotionMedia.addEventListener('change', reducedMotionListener)
    } else if (reducedMotionMedia.addListener) {
      reducedMotionMedia.addListener(reducedMotionListener)
    }
  }
})

onBeforeUnmount(() => {
  if (nowTickTimer) {
    window.clearInterval(nowTickTimer)
    nowTickTimer = null
  }
  if (reducedMotionMedia && reducedMotionListener) {
    if (reducedMotionMedia.removeEventListener) {
      reducedMotionMedia.removeEventListener('change', reducedMotionListener)
    } else if (reducedMotionMedia.removeListener) {
      reducedMotionMedia.removeListener(reducedMotionListener)
    }
  }
})

const localHasDailyCardToday = computed(() =>
  hasDailyActivityToday(DAILY_ACTIVITY_KEYS.dailyCard, new Date(nowTick.value)),
)
const localHasHoroscopeToday = computed(() =>
  hasDailyActivityToday(DAILY_ACTIVITY_KEYS.horoscope, new Date(nowTick.value)),
)
const localHasTarotToday = computed(() =>
  hasDailyActivityToday(DAILY_ACTIVITY_KEYS.tarot, new Date(nowTick.value)),
)

const hasDailyCardToday = computed(() => localHasDailyCardToday.value)
const hasHoroscopeToday = computed(() => localHasHoroscopeToday.value)
const hasTarotToday = computed(() => localHasTarotToday.value)

const ritualItems = computed(() => [
  {
    key: 'daily-card',
    done: hasDailyCardToday.value,
    emoji: '🃏',
    routeName: 'daily',
    labelKey: 'dailyPage.ritualItems.dailyCard',
  },
  {
    key: 'horoscope',
    done: hasHoroscopeToday.value,
    emoji: '🌙',
    routeName: 'horoscope',
    labelKey: 'dailyPage.ritualItems.horoscope',
  },
  {
    key: 'tarot',
    done: hasTarotToday.value,
    emoji: '🔮',
    routeName: 'tarot',
    labelKey: 'dailyPage.ritualItems.tarot',
  },
])

const ritualDoneCount = computed(() => ritualItems.value.filter((item) => item.done).length)
const nextRouteName = computed(() =>
  resolveNextRitualRoute({
    hasDailyCardToday: hasDailyCardToday.value,
    hasHoroscopeToday: hasHoroscopeToday.value,
    hasTarotToday: hasTarotToday.value,
  }),
)

const remoteStreak = computed(() => {
  const streak = remoteDashboard.value?.streak
  if (!streak || typeof streak !== 'object') return { current: 0, best: 0 }
  const current = Math.max(0, Number(streak.current || 0) || 0)
  const best = Math.max(current, Number(streak.best || 0) || 0)
  return { current, best }
})

const currentStreakShort = computed(() => {
  nowTick.value
  const localCurrent = Math.max(
    0,
    Number(readDailyStreak(DAILY_ACTIVITY_KEYS.dailyCard).current || 0) || 0,
  )
  const current = authStore.state.user?.id
    ? Math.max(localCurrent, remoteStreak.value.current)
    : localCurrent
  return locale.value === 'uk' ? `${current} д` : `${current}d`
})

const bestStreakShort = computed(() => {
  nowTick.value
  const localBest = Math.max(
    0,
    Number(readDailyStreak(DAILY_ACTIVITY_KEYS.dailyCard).best || 0) || 0,
  )
  const best = authStore.state.user?.id
    ? Math.max(localBest, remoteStreak.value.best)
    : localBest
  return locale.value === 'uk' ? `${best} д` : `${best}d`
})

const weeklyJourney = computed(() => {
  nowTick.value
  const localRows = getRecentDailyJourney(7, new Date(nowTick.value))
  const remoteRows = Array.isArray(remoteDashboard.value?.week)
    ? remoteDashboard.value.week
    : []
  const remoteMap = new Map(remoteRows.map((row) => [String(row?.dateKey || ''), row || {}]))
  const weekdayLocale = locale.value === 'uk' ? 'uk-UA' : 'en-US'
  const formatter = new Intl.DateTimeFormat(weekdayLocale, { weekday: 'short' })
  const todayKeyLocal = getLocalDateKey(new Date(nowTick.value))

  return localRows.map((row) => {
    const remoteRow = remoteMap.get(row.dateKey)
    const mergedActivities = new Set(row.activities || [])
    const remoteActivities = normalizeRemoteActivities(remoteRow?.activities)
    for (const key of remoteActivities) {
      mergedActivities.add(key)
    }
    const remoteTotal = Math.max(0, Number(remoteRow?.total || 0) || 0)
    const mergedTotal = Math.max(row.total || 0, remoteTotal, mergedActivities.size)
    const raw = formatter.format(row.date)
    return {
      ...row,
      activities: [...mergedActivities],
      total: mergedTotal,
      weekdayShort: raw.slice(0, 2).toUpperCase(),
      isToday: row.dateKey === todayKeyLocal,
    }
  })
})

const activeDaysCount = computed(() => weeklyJourney.value.filter((row) => row.total > 0).length)

const rewardCatalog = computed(() => {
  if (authStore.state.user?.id) {
    const rows = Array.isArray(remoteDashboard.value?.rewards) ? remoteDashboard.value.rewards : []
    return rows
      .map((row) => ({
        key: String(row?.key || ''),
        titleEn: String(row?.titleEn || ''),
        titleUk: String(row?.titleUk || ''),
        descriptionEn: String(row?.descriptionEn || ''),
        descriptionUk: String(row?.descriptionUk || ''),
        costPoints: Math.max(0, Number(row?.costPoints || 0) || 0),
        canClaim: Boolean(row?.canClaim),
      }))
      .filter((row) => !!row.key)
      .sort((a, b) => a.costPoints - b.costPoints)
  }

  const guestInventory = localRewardInventory.value?.items || {}
  return getRitualRewardCatalog()
    .map((row) => {
      const key = String(row?.key || '')
      const costPoints = Math.max(0, Number(row?.costPoints || 0) || 0)
      const isMysticBadge = key === RITUAL_REWARD_KEYS.mysticBadge
      const alreadyOwned = isMysticBadge && Boolean(guestInventory[key]?.owned)
      return {
        key,
        titleEn: String(row?.titleEn || ''),
        titleUk: String(row?.titleUk || ''),
        descriptionEn: String(row?.descriptionEn || ''),
        descriptionUk: String(row?.descriptionUk || ''),
        costPoints,
        canClaim: !alreadyOwned && pointsBalance.value >= costPoints,
      }
    })
    .filter((row) => !!row.key)
    .sort((a, b) => a.costPoints - b.costPoints)
})

const pointsBalance = computed(() => {
  if (!authStore.state.user?.id) {
    return computeGuestRewardBalance({
      earnedBalance: Math.max(0, Number(localPoints.value?.balance || 0) || 0),
    })
  }
  return Math.max(0, Number(remoteDashboard.value?.points?.balance || 0) || 0)
})
const totalCatalogPoints = computed(() => {
  const total = rewardCatalog.value.reduce(
    (sum, row) => sum + (Math.max(0, Number(row?.costPoints || 0) || 0)),
    0,
  )
  return Math.max(total, 20)
})

const hasClaimedToday = computed(() => {
  const todayKey = getLocalDateKey(new Date(nowTick.value))
  if (!authStore.state.user?.id) {
    const claims = getGuestRewardRecentClaims(20)
    return claims.some((row) => String(row?.dateKey || '') === todayKey)
  }

  const claims = Array.isArray(remoteDashboard.value?.recentClaims)
    ? remoteDashboard.value.recentClaims
    : []
  return claims.some((row) => {
    const createdAt = String(row?.createdAt || '')
    if (!createdAt) return false
    const date = new Date(createdAt)
    if (Number.isNaN(date.getTime())) return false
    return getLocalDateKey(date) === todayKey
  })
})

const claimableRewards = computed(() =>
  rewardCatalog.value.filter((row) => row.canClaim && row.costPoints > 0),
)
const selectedReward = computed(() => claimableRewards.value[0] || null)

const rewardProgress = computed(() =>
  computeRewardProgress({
    pointsBalance: pointsBalance.value,
    targetPoints: totalCatalogPoints.value,
  }),
)

const rewardState = computed(() =>
  resolveRewardState({
    ritualDoneCount: ritualDoneCount.value,
    canClaimReward:
      ritualDoneCount.value >= 3 &&
      Boolean(selectedReward.value),
    hasClaimedToday: hasClaimedToday.value,
  }),
)

const primaryActionType = computed(() => resolvePrimaryActionType(rewardState.value))
const showClaimRewardButton = computed(() => primaryActionType.value === 'claim')
const guestSyncHint = computed(() =>
  locale.value === 'uk'
    ? 'Прогрес збережено локально. Увійди, щоб синхронізувати бали та нагороди.'
    : 'Progress is saved locally. Sign in to sync points and rewards.',
)
const chooseBonusLabel = computed(() =>
  locale.value === 'uk' ? 'Обрати бонус' : 'Choose bonus',
)

const heroSubtitle = computed(() => {
  if (rewardState.value === ENERGY_REWARD_STATES.readyToClaim) {
    return tt('dailyPage.energySheet.heroReadySubtitle')
  }
  if (rewardState.value === ENERGY_REWARD_STATES.claimedToday) {
    return tt('dailyPage.energySheet.heroClaimedSubtitle')
  }
  return tt('dailyPage.energySheet.heroInProgressSubtitle')
})

const heroTitle = computed(() => {
  if (rewardState.value === ENERGY_REWARD_STATES.readyToClaim) {
    return tt('dailyPage.energySheet.heroReadyTitle')
  }
  if (rewardState.value === ENERGY_REWARD_STATES.claimedToday) {
    return tt('dailyPage.energySheet.heroClaimedTitle')
  }
  return tt('dailyPage.energySheet.heroInProgressTitle')
})

const closeSheet = () => {
  emit('request-close')
}

const onCloseClick = () => {
  void impactLight()
  suppressNavigationHaptics(550)
  closeSheet()
}

const closeThenNavigate = (routeName, source) => {
  if (!routeName) return
  void impactLight()
  emit('navigate-to', routeName)
  logEnergyEvent('energy_sheet_cta_clicked', {
    action: 'navigate',
    target_route: routeName,
    trigger: source,
    reward_state: rewardState.value,
    ritual_done_count: ritualDoneCount.value,
  })
}

const onClaimRewardClick = () => {
  if (!showClaimRewardButton.value) return
  closeThenNavigate('ritualRewards', 'claim_choose')
}

const onStepClick = (item) => {
  if (!item?.routeName) return
  closeThenNavigate(item.routeName, 'step')
}

const resolveStepStatusLabel = (item) => {
  if (!item) return ''
  if (item.done) return tt('dailyPage.statusDone')
  if (item.routeName === nextRouteName.value) return tt('dailyPage.statusNext')
  return ''
}
</script>

<style scoped lang="scss">
.energy-sheet-dock {
  --es-text-high: rgba(243, 248, 255, 0.98);
  --es-text-mid: rgba(196, 214, 236, 0.9);
  --es-text-low: rgba(154, 177, 207, 0.82);
  --es-border: rgba(146, 214, 255, 0.3);
  --es-card-bg:
    linear-gradient(162deg, rgba(10, 16, 25, 0.94), rgba(5, 10, 18, 0.98)),
    radial-gradient(130% 96% at 0% 0%, rgba(76, 196, 255, 0.2) 0%, rgba(76, 196, 255, 0) 58%),
    radial-gradient(140% 110% at 100% 100%, rgba(115, 246, 215, 0.12) 0%, rgba(115, 246, 215, 0) 65%);
  --es-card-shadow:
    0 16px 34px rgba(0, 0, 0, 0.42),
    inset 0 1px 0 rgba(241, 249, 255, 0.16),
    inset 0 -1px 0 rgba(74, 205, 255, 0.2);
  --es-ring-track: rgba(109, 147, 188, 0.28);
  --es-ring-fill-a: rgba(101, 223, 255, 0.96);
  --es-ring-fill-b: rgba(255, 210, 145, 0.96);
  --es-cta-border: rgba(148, 232, 255, 0.54);
  --es-cta-bg:
    linear-gradient(180deg, rgba(34, 189, 224, 0.88), rgba(14, 114, 166, 0.92)),
    radial-gradient(130% 80% at 0% 0%, rgba(161, 245, 224, 0.26) 0%, rgba(161, 245, 224, 0) 60%);
  --es-cta-shadow:
    0 10px 20px rgba(8, 52, 76, 0.44),
    inset 0 1px 0 rgba(229, 251, 255, 0.3);
  --es-done-bg:
    linear-gradient(160deg, rgba(26, 118, 138, 0.56), rgba(14, 70, 104, 0.62)),
    radial-gradient(130% 90% at 0% 0%, rgba(108, 244, 207, 0.24) 0%, rgba(108, 244, 207, 0) 64%);
  --es-done-border: rgba(142, 245, 221, 0.62);
  --es-next-border: rgba(255, 211, 140, 0.72);
  --es-next-shadow: 0 0 0 1px rgba(255, 211, 140, 0.2), 0 0 18px rgba(255, 199, 122, 0.24);
  --es-week-full-bg: rgba(81, 209, 255, 0.2);
  --es-week-full-border: rgba(143, 229, 255, 0.34);
  --es-week-full-dot: rgba(182, 239, 255, 0.98);
  --es-week-active-dot: rgba(119, 225, 255, 0.9);

  max-width: 620px;
  margin: 0 auto;
  display: grid;
  gap: 10px;
  color: var(--es-text-high);
}

.energy-sheet-scroll {
  display: grid;
  gap: 10px;
}

.energy-sheet-close-dock {
  padding: 0 8px;
  position: relative;
  z-index: 3;
}

.energy-sheet-dock--premium-lite {
  --es-border: rgba(123, 167, 207, 0.24);
  --es-card-bg:
    linear-gradient(162deg, rgba(10, 15, 23, 0.94), rgba(7, 11, 19, 0.97)),
    radial-gradient(130% 96% at 0% 0%, rgba(111, 170, 224, 0.14) 0%, rgba(111, 170, 224, 0) 62%);
  --es-card-shadow:
    0 12px 26px rgba(0, 0, 0, 0.34),
    inset 0 1px 0 rgba(241, 249, 255, 0.1);
  --es-ring-track: rgba(112, 144, 181, 0.24);
  --es-ring-fill-a: rgba(122, 197, 238, 0.9);
  --es-ring-fill-b: rgba(222, 205, 170, 0.88);
  --es-cta-border: rgba(134, 197, 232, 0.4);
  --es-cta-bg:
    linear-gradient(180deg, rgba(65, 129, 181, 0.75), rgba(34, 78, 121, 0.9)),
    radial-gradient(130% 80% at 0% 0%, rgba(155, 210, 240, 0.2) 0%, rgba(155, 210, 240, 0) 60%);
  --es-cta-shadow:
    0 8px 16px rgba(11, 34, 55, 0.36),
    inset 0 1px 0 rgba(229, 251, 255, 0.18);
}

.energy-sheet-streaks {
  max-width: 360px;
  margin: 0 auto;
  display: grid;
  gap: 8px;
}

.energy-chip {
  min-height: 44px;
  border-radius: 14px;
  border: 1px solid var(--es-border);
  background: var(--es-card-bg);
  box-shadow: var(--es-card-shadow);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
}

.energy-chip__icon {
  font-size: 17px;
}

.energy-chip__value {
  font-size: 16px;
  font-weight: 700;
}

.energy-chip__label {
  margin-left: auto;
  font-size: 12px;
  color: var(--es-text-low);
}

//.energy-hero,
//.energy-block,
//.energy-actions {
//  border-radius: 18px;
//  border: 1px solid var(--es-border);
//  background: var(--es-card-bg);
//  box-shadow: var(--es-card-shadow);
//}

.energy-hero {
  padding: 16px 14px;
}

.energy-hero__top {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.energy-hero__intro {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.energy-hero__eyebrow {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--es-text-low);
}

.energy-hero__title {
  margin: 0;
  font-size: clamp(19px, 5vw, 25px);
  line-height: 1.14;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.energy-hero__subtitle {
  margin: 0;
  font-size: clamp(14px, 3.6vw, 16px);
  line-height: 1.34;
  color: var(--es-text-mid);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.energy-orb {
  position: relative;
  width: clamp(126px, 34vw, 156px);
  aspect-ratio: 1;
  border-radius: 999px;
  padding: 9px;
  display: grid;
  place-items: center;
  isolation: isolate;
  border: 1px solid rgba(170, 216, 247, 0.28);
  background:
    radial-gradient(120% 120% at 30% 20%, rgba(160, 231, 255, 0.2), rgba(160, 231, 255, 0) 60%),
    linear-gradient(160deg, rgba(9, 18, 29, 0.88), rgba(5, 10, 18, 0.95));
  box-shadow:
    0 0 0 1px rgba(170, 216, 247, 0.24),
    0 16px 28px rgba(0, 0, 0, 0.4),
    0 0 24px rgba(97, 184, 239, 0.3);
}

.energy-orb::before {
  content: '';
  position: absolute;
  inset: 9px;
  border-radius: inherit;
  z-index: 1;
  background:
    radial-gradient(110% 110% at 32% 24%, rgba(181, 236, 255, 0.18), rgba(181, 236, 255, 0) 62%),
    linear-gradient(170deg, rgba(8, 16, 27, 0.96), rgba(5, 10, 19, 0.98));
}

.energy-orb__inner {
  position: relative;
  z-index: 2;
  display: grid;
  justify-items: center;
  gap: 2px;
}

.energy-orb__label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--es-text-low);
}

.energy-orb__value {
  font-size: clamp(28px, 8.2vw, 38px);
  line-height: 1;
  font-weight: 800;
  color: var(--es-text-high);
  text-shadow: 0 0 18px rgba(136, 220, 255, 0.32);
}

.energy-orb__ring-glow {
  position: absolute;
  inset: -10px;
  border-radius: inherit;
  z-index: 0;
  pointer-events: none;
  opacity: 0.9;
  background:
    radial-gradient(circle at 30% 20%, rgba(201, 241, 255, 0.22), rgba(201, 241, 255, 0) 58%),
    radial-gradient(circle at 70% 75%, rgba(115, 246, 215, 0.16), rgba(115, 246, 215, 0) 66%);
  box-shadow:
    0 0 26px rgba(97, 184, 239, 0.3),
    0 0 42px rgba(97, 184, 239, 0.18);
  filter: blur(4px);
}

.energy-orb__spark {
  position: absolute;
  z-index: 3;
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: rgba(216, 244, 255, 0.96);
  box-shadow: 0 0 9px rgba(127, 206, 255, 0.76);
}

.energy-orb__spark--one {
  top: 16px;
  right: 22px;
}

.energy-orb__spark--two {
  bottom: 18px;
  left: 20px;
}

.energy-hero__reward {
  margin-top: 10px;
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(176, 232, 255, 0.34);
  background:
    linear-gradient(165deg, rgba(8, 14, 22, 0.8), rgba(5, 10, 16, 0.88)),
    radial-gradient(120% 80% at 100% 0%, rgba(255, 208, 137, 0.16) 0%, rgba(255, 208, 137, 0) 62%);
  padding: 9px 10px;
}

.energy-hero__reward-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
  color: var(--es-text-mid);
}

.energy-hero__reward-row strong {
  color: var(--es-text-high);
  font-weight: 700;
}

.energy-hero__reward-track {
  margin-top: 7px;
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: rgba(120, 177, 224, 0.24);
  overflow: hidden;
}

.energy-hero__reward-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--es-ring-fill-a), var(--es-ring-fill-b));
  box-shadow: 0 0 12px rgba(106, 213, 255, 0.32);
  transition: width 320ms ease;
}

.energy-stat-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.energy-stat-card {
  border-radius: 12px;
  border: 1px solid rgba(151, 206, 243, 0.28);
  background:
    linear-gradient(158deg, rgba(10, 18, 30, 0.78), rgba(6, 11, 19, 0.86)),
    radial-gradient(120% 100% at 0% 0%, rgba(85, 210, 255, 0.12), rgba(85, 210, 255, 0) 64%);
  padding: 10px 11px;
  display: grid;
  gap: 4px;
}

.energy-stat-card__icon {
  font-size: 15px;
}

.energy-stat-card__label {
  font-size: 12px;
  color: var(--es-text-low);
}

.energy-stat-card__value {
  font-size: clamp(18px, 4.6vw, 24px);
  line-height: 1.1;
  font-weight: 700;
  color: var(--es-text-high);
}

.energy-block {
  padding: 12px;
}

.energy-block__head {
  margin-bottom: 10px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.energy-block__head-copy {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.energy-block__title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: var(--es-text-high);
}

.energy-block__hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.3;
  color: var(--es-text-mid);
}

.energy-block__meta {
  min-height: 28px;
  border-radius: 999px;
  border: 1px solid rgba(155, 216, 250, 0.32);
  background: rgba(8, 14, 22, 0.66);
  color: var(--es-text-mid);
  padding: 4px 10px;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}

.energy-steps-list {
  display: grid;
  gap: 8px;
}

.energy-step {
  min-height: 62px;
  border-radius: 13px;
  border: 1px solid rgba(165, 224, 255, 0.3);
  background:
    linear-gradient(160deg, rgba(10, 19, 31, 0.72), rgba(6, 12, 20, 0.88)),
    radial-gradient(130% 88% at 0% 0%, rgba(87, 211, 255, 0.14) 0%, rgba(87, 211, 255, 0) 62%);
  color: var(--es-text-mid);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  text-align: left;
}

.energy-step__lead {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 11px;
}

.energy-step__icon {
  font-size: 20px;
}

.energy-step__text {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.energy-step__label {
  font-size: 15px;
  line-height: 1.2;
  color: var(--es-text-high);
}

.energy-step__status {
  font-size: 12px;
  color: var(--es-text-low);
}

.energy-step--done {
  border-color: var(--es-done-border);
  background: var(--es-done-bg);
}

.energy-step--next {
  border-color: var(--es-next-border);
  box-shadow: var(--es-next-shadow);
}

.energy-week-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
}

.energy-week-day {
  border-radius: 11px;
  border: 1px solid rgba(124, 177, 214, 0.24);
  background: rgba(7, 14, 23, 0.66);
  min-height: 56px;
  padding: 6px 4px;
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 7px;
}

.energy-week-day__label {
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--es-text-low);
}

.energy-week-day__dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: rgba(170, 196, 223, 0.38);
}

.energy-week-day--active .energy-week-day__dot {
  background: var(--es-week-active-dot);
}

.energy-week-day--full {
  border-color: var(--es-week-full-border);
  background: var(--es-week-full-bg);
}

.energy-week-day--full .energy-week-day__dot {
  background: var(--es-week-full-dot);
  box-shadow: 0 0 10px rgba(159, 216, 246, 0.36);
}

.energy-week-day--today {
  box-shadow:
    inset 0 0 0 1px rgba(255, 220, 156, 0.58),
    0 0 10px rgba(255, 210, 146, 0.26);
}

.energy-actions {
  padding: 8px;
  display: grid;
  gap: 8px;
}

.energy-actions__primary {
  width: 100%;
  min-height: 52px;
  border-radius: 14px;
  border: 1px solid var(--es-cta-border);
  background: var(--es-cta-bg);
  color: rgba(242, 251, 255, 0.99);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.01em;
  box-shadow: var(--es-cta-shadow);
}

.energy-actions__primary:disabled {
  opacity: 0.72;
}

.energy-actions__close-wrap {
  margin-top: 0;
  padding: 8px;
  border-radius: 16px;
  border: 1px solid rgba(106, 126, 164, 0.22);
  background:
    linear-gradient(180deg, rgba(9, 13, 21, 0.88), rgba(3, 6, 11, 0.95)),
    linear-gradient(90deg, rgba(83, 112, 170, 0.1), rgba(83, 112, 170, 0));
  box-shadow:
    inset 0 1px 0 rgba(186, 207, 247, 0.08),
    0 10px 24px rgba(0, 0, 0, 0.3);
}


.energy-actions__close-wrap--dock {
  background:
    linear-gradient(180deg, rgba(9, 13, 21, 0.92), rgba(3, 6, 11, 0.98)),
    radial-gradient(120% 120% at 50% 0%, rgba(74, 101, 151, 0.2), rgba(74, 101, 151, 0) 70%);
}

@keyframes energyOrbPulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow:
      0 0 0 1px rgba(170, 216, 247, 0.24),
      0 16px 28px rgba(0, 0, 0, 0.4),
      0 0 24px rgba(97, 184, 239, 0.3);
  }
  50% {
    transform: scale(1.02);
    box-shadow:
      0 0 0 1px rgba(170, 216, 247, 0.26),
      0 18px 30px rgba(0, 0, 0, 0.42),
      0 0 34px rgba(97, 184, 239, 0.36);
  }
}

@keyframes energySparkBlink {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.9);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

.energy-sheet-dock:not(.energy-sheet-dock--lite-motion) .energy-orb {
  animation: energyOrbPulse 2.6s ease-in-out infinite;
}

.energy-sheet-dock:not(.energy-sheet-dock--lite-motion) .energy-orb__spark--one {
  animation: energySparkBlink 1.7s ease-in-out infinite;
}

.energy-sheet-dock:not(.energy-sheet-dock--lite-motion) .energy-orb__spark--two {
  animation: energySparkBlink 1.7s ease-in-out 0.5s infinite;
}

.energy-sheet-dock--compact {
  max-width: min(680px, calc(100vw - 18px));
  gap: 8px;
  grid-template-rows: auto minmax(0, 1fr) auto;
  max-height: calc(100dvh - 152px - env(safe-area-inset-bottom, 0px));
}

.energy-sheet-dock--compact .energy-sheet-scroll {
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 2px;
  -webkit-overflow-scrolling: touch;
}

.energy-sheet-dock--compact .energy-hero {
  padding: 12px 11px;
}

.energy-sheet-dock--compact .energy-hero__top {
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) auto;
}

.energy-sheet-dock--compact .energy-hero__title {
  font-size: clamp(18px, 4.4vw, 22px);
}

.energy-sheet-dock--compact .energy-hero__subtitle {
  font-size: 13px;
  line-height: 1.28;
}

.energy-sheet-dock--compact .energy-orb {
  width: clamp(104px, 27vw, 122px);
  padding: 7px;
}

.energy-sheet-dock--compact .energy-orb::before {
  inset: 7px;
}

.energy-sheet-dock--compact .energy-orb__value {
  font-size: clamp(24px, 6vw, 31px);
}

.energy-sheet-dock--compact .energy-hero__reward {
  padding: 7px 8px;
}

.energy-sheet-dock--compact .energy-hero__reward-row {
  font-size: 12px;
}

.energy-sheet-dock--compact .energy-stat-grid {
  margin-top: 8px;
  gap: 6px;
}

.energy-sheet-dock--compact .energy-stat-card {
  padding: 8px 9px;
}

.energy-sheet-dock--compact .energy-stat-card__label {
  font-size: 11px;
}

.energy-sheet-dock--compact .energy-stat-card__value {
  font-size: clamp(16px, 4.2vw, 21px);
}

.energy-sheet-dock--compact .energy-block {
  padding: 10px;
}

.energy-sheet-dock--compact .energy-block__head {
  margin-bottom: 8px;
}

.energy-sheet-dock--compact .energy-block__title {
  font-size: 13px;
}

.energy-sheet-dock--compact .energy-block__hint {
  font-size: 11px;
}

.energy-sheet-dock--compact .energy-block__meta {
  min-height: 24px;
  font-size: 12px;
  padding: 3px 9px;
}

.energy-sheet-dock--compact .energy-steps-list {
  gap: 6px;
}

.energy-sheet-dock--compact .energy-step {
  min-height: 54px;
  padding: 8px 10px;
}

.energy-sheet-dock--compact .energy-step__icon {
  font-size: 18px;
}

.energy-sheet-dock--compact .energy-step__label {
  font-size: 14px;
}

.energy-sheet-dock--compact .energy-step__status {
  font-size: 11px;
}

.energy-sheet-dock--compact .energy-week-grid {
  gap: 5px;
}

.energy-sheet-dock--compact .energy-week-day {
  min-height: 45px;
  padding: 4px 3px;
  gap: 4px;
}

.energy-sheet-dock--compact .energy-week-day__label {
  font-size: 10px;
}

.energy-sheet-dock--compact .energy-week-day__dot {
  width: 8px;
  height: 8px;
}

.energy-sheet-dock--compact .energy-actions__primary {
  min-height: 48px;
  font-size: 15px;
}

.energy-sheet-dock--compact .energy-actions__close-wrap {
  margin-top: 6px;
  padding: 6px;
}

.energy-sheet-dock--compact .arcana-btn--secondary {
  min-height: 44px;
  padding: 10px 12px;
}

.energy-sheet-dock--compact .energy-sheet-close-dock {
  padding: 0 6px;
}

.energy-sheet-dock--compact .energy-actions__close-wrap--dock {
  margin-top: 0;
}

@media (max-height: 760px) {
  .energy-sheet-dock {
    gap: 8px;
  }

  .energy-hero {
    padding: 12px 11px;
  }

  .energy-hero__title {
    font-size: clamp(18px, 4.4vw, 21px);
  }

  .energy-hero__subtitle {
    font-size: 13px;
  }

  .energy-orb {
    width: 118px;
  }

  .energy-stat-card {
    padding: 8px 9px;
  }

  .energy-step {
    min-height: 56px;
    padding: 8px 10px;
  }

  .energy-step__label {
    font-size: 14px;
  }

  .energy-week-day {
    min-height: 48px;
  }
}

@media (min-width: 430px) {
  .energy-sheet-dock {
    gap: 12px;
  }

  .energy-hero {
    padding: 18px;
  }

  .energy-block {
    padding: 14px;
  }

  .energy-week-day {
    min-height: 60px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .energy-sheet-dock * {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
</style>
