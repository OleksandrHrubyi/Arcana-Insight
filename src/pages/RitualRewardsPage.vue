<template>
  <q-page class="rewards-page">
    <div class="rewards-shell">
      <header class="rewards-hero rewards-hero--with-back">
        <button type="button" class="rewards-back hit-44" @click="onBackClick">
          <q-icon name="chevron_left" size="18px" />
        </button>
        <div class="rewards-hero__text">
          <div class="rewards-title">{{ heroTitle }}</div>
          <div class="rewards-kicker">{{ heroEyebrow }}</div>
        </div>
      </header>

      <section class="rewards-spotlight">
        <div class="rewards-orb" :style="{ '--reward-ring-percent': `${catalogProgressPercent}%` }">
          <span class="rewards-orb__glow" aria-hidden="true"></span>
          <span class="rewards-orb__spark rewards-orb__spark--one" aria-hidden="true"></span>
          <span class="rewards-orb__spark rewards-orb__spark--two" aria-hidden="true"></span>
          <div class="rewards-orb__inner">
            <span class="rewards-orb__balance">{{ pointsBalance }}</span>
          </div>
        </div>
        <div class="rewards-spotlight__copy">
          <p class="rewards-subtitle">{{ heroSubtitle }}</p>
          <p class="rewards-hero__progress-line">{{ progressLine }}</p>
        </div>
      </section>

      <section class="rewards-balance">
        <div class="rewards-balance__row">
          <span>{{ thresholdLabel }}</span>
          <strong>{{ thresholdLine }}</strong>
        </div>
        <div class="rewards-balance__track" aria-hidden="true">
          <span :style="{ width: `${catalogProgressPercent}%` }"></span>
        </div>
        <div class="rewards-balance__chips">
          <span>{{ unlockedByPointsLabel }}</span>
          <span>{{ claimableNowLabel }}</span>
        </div>
      </section>

      <section v-if="isInitialLoading" class="rewards-skeleton-list" aria-hidden="true">
        <article v-for="item in skeletonCards" :key="`sk-${item}`" class="reward-skeleton">
          <div class="reward-skeleton__top"></div>
          <div class="reward-skeleton__line"></div>
        </article>
      </section>

      <template v-else>
        <section class="rewards-filters" aria-label="Rewards category filters">
          <button
            v-for="item in filterOptions"
            :key="item.key"
            type="button"
            :class="['rewards-filter', { 'rewards-filter--active': rewardFilter === item.key }]"
            @click="rewardFilter = item.key"
          >
            {{ item.label }}
          </button>
        </section>

        <section v-if="availableRewards.length" class="rewards-group">
          <header class="rewards-group__head">
            <h3 class="rewards-group__title">{{ availableTitle }}</h3>
            <span class="rewards-group__count">{{ availableRewards.length }}</span>
          </header>
          <div class="rewards-list">
            <article
              v-for="reward in availableRewards"
              :key="reward.key"
              :class="[
                'reward-card',
                { 'reward-card--claimed': claimedRewardKey === String(reward.key) },
                `reward-card--${resolveRewardItemStatus(reward).tone}`,
                `reward-card--${resolveRewardAccent(reward)}`,
              ]"
            >
              <span class="reward-card__glow reward-card__glow--top" aria-hidden="true"></span>
              <span class="reward-card__glow reward-card__glow--side" aria-hidden="true"></span>
              <div class="reward-card__main">
                <div class="reward-card__identity">
                  <span class="reward-card__glyph">
                    <q-icon :name="resolveRewardIcon(reward)" size="18px" />
                  </span>
                  <div class="reward-card__titles">
                    <strong>{{ resolveRewardItemTitle(reward) }}</strong>
                    <span class="reward-card__category">{{ resolveRewardCategoryLabel(reward) }}</span>
                    <span class="reward-card__subtitle">{{ resolveRewardItemSubtitle(reward) }}</span>
                  </div>
                </div>
                <span class="reward-card__price">{{ reward.costPoints }} pts</span>
              </div>
              <div class="reward-card__foot">
                <p class="reward-card__state">
                  <span class="reward-card__state-dot" aria-hidden="true"></span>
                  {{ resolveRewardItemStatus(reward).label }}
                </p>
                <button
                  type="button"
                  class="reward-card__claim"
                  :disabled="isRewardClaimDisabled(reward)"
                  @click="onClaimRewardClick(reward)"
                >
                  <q-icon :name="resolveRewardActionIcon(reward)" size="14px" />
                  {{ resolveRewardActionLabel(reward) }}
                </button>
              </div>
              <p
                v-if="claimFeedback.key === reward.key && claimFeedback.message"
                :class="[
                  'reward-card__feedback',
                  claimFeedback.tone === 'success'
                    ? 'reward-card__feedback--success'
                    : 'reward-card__feedback--error',
                ]"
              >
                {{ claimFeedback.message }}
              </p>
            </article>
          </div>
        </section>

        <section v-if="lockedRewards.length" class="rewards-group">
          <header class="rewards-group__head">
            <h3 class="rewards-group__title">{{ lockedTitle }}</h3>
            <span class="rewards-group__count">{{ lockedRewards.length }}</span>
          </header>
          <div class="rewards-list">
            <article
              v-for="reward in lockedRewards"
              :key="reward.key"
              :class="[
                'reward-card',
                { 'reward-card--claimed': claimedRewardKey === String(reward.key) },
                `reward-card--${resolveRewardItemStatus(reward).tone}`,
                `reward-card--${resolveRewardAccent(reward)}`,
              ]"
            >
              <span class="reward-card__glow reward-card__glow--top" aria-hidden="true"></span>
              <span class="reward-card__glow reward-card__glow--side" aria-hidden="true"></span>
              <div class="reward-card__main">
                <div class="reward-card__identity">
                  <span class="reward-card__glyph">
                    <q-icon :name="resolveRewardIcon(reward)" size="18px" />
                  </span>
                  <div class="reward-card__titles">
                    <strong>{{ resolveRewardItemTitle(reward) }}</strong>
                    <span class="reward-card__category">{{ resolveRewardCategoryLabel(reward) }}</span>
                    <span class="reward-card__subtitle">{{ resolveRewardItemSubtitle(reward) }}</span>
                  </div>
                </div>
                <span class="reward-card__price">{{ reward.costPoints }} pts</span>
              </div>
              <div class="reward-card__foot">
                <p class="reward-card__state">
                  <span class="reward-card__state-dot" aria-hidden="true"></span>
                  {{ resolveRewardItemStatus(reward).label }}
                </p>
                <button
                  type="button"
                  class="reward-card__claim"
                  :disabled="isRewardClaimDisabled(reward)"
                  @click="onClaimRewardClick(reward)"
                >
                  <q-icon :name="resolveRewardActionIcon(reward)" size="14px" />
                  {{ resolveRewardActionLabel(reward) }}
                </button>
              </div>
              <p
                v-if="claimFeedback.key === reward.key && claimFeedback.message"
                :class="[
                  'reward-card__feedback',
                  claimFeedback.tone === 'success'
                    ? 'reward-card__feedback--success'
                    : 'reward-card__feedback--error',
                ]"
              >
                {{ claimFeedback.message }}
              </p>
            </article>
          </div>
        </section>

        <section v-if="!availableRewards.length && !lockedRewards.length" class="rewards-empty">
          {{ emptyFilterLabel }}
        </section>
      </template>
    </div>
    <div class="rewards-page__close-dock">
      <div class="rewards-actions__close-wrap">
        <button
          type="button"
          class="arcana-btn arcana-btn--secondary"
          @click.stop.prevent="onBackClick"
        >
          {{ closeButtonLabel }}
        </button>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { currentLocale, t } from 'src/i18n'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'stores/authStore.js'
import { computeLocalRitualPoints } from 'src/helpers/dailyRitual'
import { claimRitualReward, loadRitualDashboard } from 'src/helpers/ritualRewardsBackend.js'
import { suppressNavigationHaptics } from 'src/helpers/navigationHaptics'
import { impactLight } from 'src/helpers/haptics'
import {
  computeGuestRewardBalance,
  getRitualRewardCatalog,
  isRitualRewardActive,
  readGuestRewardInventory,
  RITUAL_REWARD_KEYS,
} from 'src/helpers/ritualRewardInventory'

const router = useRouter()
const authStore = useAuthStore()
const locale = computed(() => currentLocale.value || 'en')
const tt = (key) => t(locale.value, key)
const nowTick = ref(Date.now())
const remoteDashboard = ref(null)
const localPoints = ref(computeLocalRitualPoints(new Date()))
const localRewardInventory = ref(readGuestRewardInventory())
const isInitialLoading = ref(true)
const claimingRewardKey = ref('')
const claimedRewardKey = ref('')
const rewardFilter = ref('all')
const claimFeedback = ref({
  key: '',
  tone: 'success',
  message: '',
})

let tickTimer = null
let claimFxTimer = null

const TIMED_UNLOCK_KEYS = new Set([
  RITUAL_REWARD_KEYS.horoscopeLoveUnlock24h,
  RITUAL_REWARD_KEYS.horoscopeCareerUnlock24h,
])

const $q = useQuasar()

const refreshLocalState = () => {
  localPoints.value = computeLocalRitualPoints(new Date())
  localRewardInventory.value = readGuestRewardInventory()
}

const notifyDashboardSyncFailed = () => {
  $q.notify({
    type: 'warning',
    position: 'top',
    message: tt('ritualRewards.syncFailed'),
    actions: [
      {
        label: tt('common.retry'),
        color: 'white',
        handler: async () => {
          const ok = await refreshRemoteDashboard(true)
          if (!ok) notifyDashboardSyncFailed()
        },
      },
    ],
  })
}

// Returns true when synced (or no signed-in user), false when a logged-in sync
// failed — so callers can surface it instead of silently using local points.
const refreshRemoteDashboard = async (force = false) => {
  const userId = String(authStore.state.user?.id || '').trim()
  if (!userId) {
    remoteDashboard.value = null
    return true
  }

  try {
    const result = await loadRitualDashboard({ force, userId })
    if (result.ok && result.data) {
      remoteDashboard.value = result.data.dashboard || result.data
      return true
    }
    return false
  } catch (error) {
    console.warn('[RitualRewards] dashboard sync failed', error)
    return false
  }
}

onMounted(async () => {
  refreshLocalState()
  let synced = true
  try {
    synced = await refreshRemoteDashboard(true)
  } finally {
    isInitialLoading.value = false
    // Start the ticker regardless of sync outcome so a failed load can't leave
    // timed unlocks frozen.
    tickTimer = window.setInterval(() => {
      nowTick.value = Date.now()
    }, 30_000)
  }
  if (!synced) notifyDashboardSyncFailed()
})

onBeforeUnmount(() => {
  if (tickTimer) {
    window.clearInterval(tickTimer)
    tickTimer = null
  }
  if (claimFxTimer) {
    window.clearTimeout(claimFxTimer)
    claimFxTimer = null
  }
})

watch(
  () => authStore.state.user?.id || '',
  async () => {
    refreshLocalState()
    await refreshRemoteDashboard(true)
  },
)

const pointsBalance = computed(() => {
  const userId = String(authStore.state.user?.id || '').trim()
  if (!userId) {
    return computeGuestRewardBalance({
      earnedBalance: Math.max(0, Number(localPoints.value?.balance || 0) || 0),
    })
  }
  return Math.max(0, Number(remoteDashboard.value?.points?.balance || 0) || 0)
})

const rewardCatalog = computed(() => {
  const userId = String(authStore.state.user?.id || '').trim()
  if (userId) {
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

const nextRewardCost = computed(() => {
  const userId = String(authStore.state.user?.id || '').trim()
  if (userId) {
    return Math.max(0, Number(remoteDashboard.value?.points?.nextRewardCost || 0) || 0)
  }
  return (
    rewardCatalog.value
      .map((reward) => reward.costPoints)
      .filter((cost) => cost > pointsBalance.value)
      .sort((a, b) => a - b)[0] || 0
  )
})
const totalCatalogPoints = computed(() =>
  Math.max(
    rewardCatalog.value.reduce((sum, reward) => sum + (Number(reward.costPoints || 0) || 0), 0),
    1,
  ),
)
const catalogProgressPercent = computed(() =>
  Math.max(0, Math.min(100, Math.round((pointsBalance.value / totalCatalogPoints.value) * 100))),
)
const unlockedByPointsCount = computed(() =>
  rewardCatalog.value.filter((reward) => Math.max(0, Number(reward.costPoints || 0) || 0) <= pointsBalance.value).length,
)
const claimableCount = computed(() => rewardCatalog.value.filter((reward) => reward.canClaim).length)
const filterOptions = computed(() => [
  { key: 'all', label: tt('ritualRewards.filterAll') },
  { key: 'tarot', label: tt('ritualRewards.filterTarot') },
  { key: 'horoscope', label: tt('ritualRewards.filterHoroscope') },
  { key: 'profile', label: tt('ritualRewards.filterProfile') },
])

const filteredRewards = computed(() => {
  if (rewardFilter.value === 'all') return rewardCatalog.value
  return rewardCatalog.value.filter((reward) => resolveRewardFilterGroup(reward) === rewardFilter.value)
})
const availableRewards = computed(() => filteredRewards.value.filter((reward) => reward.canClaim))
const lockedRewards = computed(() =>
  filteredRewards.value
    .filter((reward) => !reward.canClaim)
    .slice()
    .sort(compareNonClaimableRewards),
)

const heroEyebrow = computed(() => tt('ritualRewards.heroEyebrow'))
const heroTitle = computed(() => tt('ritualRewards.heroTitle'))
const heroSubtitle = computed(() => tt('ritualRewards.heroSubtitle'))
const thresholdLine = computed(() => {
  if (nextRewardCost.value > 0) {
    return tt('ritualRewards.thresholdNext').replace('{points}', String(nextRewardCost.value))
  }
  return tt('ritualRewards.thresholdAllAffordable')
})
const thresholdLabel = computed(() => tt('ritualRewards.thresholdLabel'))
const progressLine = computed(() =>
  tt('ritualRewards.progressLine')
    .replace('{collected}', String(pointsBalance.value))
    .replace('{total}', String(totalCatalogPoints.value)),
)
const unlockedByPointsLabel = computed(() =>
  tt('ritualRewards.unlockedByPoints')
    .replace('{unlocked}', String(unlockedByPointsCount.value))
    .replace('{total}', String(rewardCatalog.value.length)),
)
const claimableNowLabel = computed(() =>
  tt('ritualRewards.claimableNow').replace('{count}', String(claimableCount.value)),
)
const availableTitle = computed(() => tt('ritualRewards.availableTitle'))
const lockedTitle = computed(() => tt('ritualRewards.lockedTitle'))
const emptyFilterLabel = computed(() => tt('ritualRewards.emptyFilter'))
const skeletonCards = [1, 2, 3]
const closeButtonLabel = computed(() => tt('common.close'))
const claimNowLabel = computed(() => tt('ritualRewards.claimNow'))
const claimInProgressLabel = computed(() => tt('ritualRewards.claimInProgress'))

const resolveRewardItemTitle = (reward) => {
  const titleUk = String(reward?.titleUk || '').trim()
  const titleEn = String(reward?.titleEn || '').trim()
  return locale.value === 'uk' ? titleUk || titleEn : titleEn || titleUk
}

const resolveRewardIcon = (reward) => {
  const key = String(reward?.key || '')
  if (key === RITUAL_REWARD_KEYS.extraTarotSpread) return 'style'
  if (key === RITUAL_REWARD_KEYS.horoscopeLoveUnlock24h) return 'favorite'
  if (key === RITUAL_REWARD_KEYS.horoscopeCareerUnlock24h) return 'trending_up'
  if (key === RITUAL_REWARD_KEYS.mysticBadge) return 'workspace_premium'
  return 'redeem'
}

const resolveRewardAccent = (reward) => {
  const key = String(reward?.key || '')
  if (key === RITUAL_REWARD_KEYS.extraTarotSpread) return 'tarot'
  if (key === RITUAL_REWARD_KEYS.horoscopeLoveUnlock24h) return 'love'
  if (key === RITUAL_REWARD_KEYS.horoscopeCareerUnlock24h) return 'career'
  if (key === RITUAL_REWARD_KEYS.mysticBadge) return 'badge'
  return 'default'
}

const resolveRewardFilterGroup = (reward) => {
  const key = String(reward?.key || '')
  if (key === RITUAL_REWARD_KEYS.extraTarotSpread) return 'tarot'
  if (
    key === RITUAL_REWARD_KEYS.horoscopeLoveUnlock24h ||
    key === RITUAL_REWARD_KEYS.horoscopeCareerUnlock24h
  ) {
    return 'horoscope'
  }
  if (key === RITUAL_REWARD_KEYS.mysticBadge) return 'profile'
  return 'all'
}

const resolveRewardCategoryLabel = (reward) => {
  const group = resolveRewardFilterGroup(reward)
  if (group === 'tarot') return tt('ritualRewards.filterTarot')
  if (group === 'horoscope') return tt('ritualRewards.filterHoroscope')
  if (group === 'profile') return tt('ritualRewards.filterProfile')
  return tt('ritualRewards.categoryFallback')
}

const resolveRewardItemSubtitle = (reward) => {
  const key = String(reward?.key || '')
  if (key === RITUAL_REWARD_KEYS.extraTarotSpread) return tt('ritualRewards.subtitleExtraTarotSpread')
  if (key === RITUAL_REWARD_KEYS.horoscopeLoveUnlock24h) return tt('ritualRewards.subtitleLoveUnlock')
  if (key === RITUAL_REWARD_KEYS.horoscopeCareerUnlock24h) return tt('ritualRewards.subtitleCareerUnlock')
  if (key === RITUAL_REWARD_KEYS.mysticBadge) return tt('ritualRewards.subtitleMysticBadge')
  return tt('ritualRewards.subtitleFallback')
}

const resolveRewardItemStatus = (reward) => {
  const shortfall = resolveRewardShortfall(reward)
  const userId = String(authStore.state.user?.id || '').trim()
  const isActive = isRitualRewardActive({
    rewardKey: reward?.key,
    userId,
    now: new Date(nowTick.value),
  })

  if (reward?.canClaim) {
    return {
      tone: 'available',
      label: tt('ritualRewards.statusReadyToClaim'),
    }
  }

  if (isActive) {
    if (TIMED_UNLOCK_KEYS.has(String(reward?.key || ''))) {
      return {
        tone: 'active',
        label: tt('ritualRewards.statusActive24h'),
      }
    }
    if (String(reward?.key || '') === RITUAL_REWARD_KEYS.extraTarotSpread) {
      return {
        tone: 'active',
        label: tt('ritualRewards.statusTokenInInventory'),
      }
    }
    return {
      tone: 'active',
      label: tt('ritualRewards.statusOwned'),
    }
  }

  if (shortfall > 0) {
    return {
      tone: 'locked',
      label: tt('ritualRewards.statusNeedMore').replace('{points}', String(shortfall)),
    }
  }

  return {
    tone: 'locked',
    label: tt('ritualRewards.statusUnavailable'),
  }
}

const resolveRewardShortfall = (reward) => {
  const cost = Math.max(0, Number(reward?.costPoints || 0) || 0)
  return Math.max(0, cost - pointsBalance.value)
}

const resolveNonClaimableRank = (reward) => {
  const status = resolveRewardItemStatus(reward)
  const shortfall = resolveRewardShortfall(reward)
  if (status.tone === 'locked' && shortfall > 0) return 0
  if (status.tone === 'locked') return 1
  if (status.tone === 'active') return 2
  return 3
}

const compareNonClaimableRewards = (a, b) => {
  const rankDelta = resolveNonClaimableRank(a) - resolveNonClaimableRank(b)
  if (rankDelta !== 0) return rankDelta
  const shortfallDelta = resolveRewardShortfall(a) - resolveRewardShortfall(b)
  if (shortfallDelta !== 0) return shortfallDelta
  return (Number(a?.costPoints || 0) || 0) - (Number(b?.costPoints || 0) || 0)
}

const isRewardClaimDisabled = (reward) => {
  const rewardKey = String(reward?.key || '')
  if (!rewardKey) return true
  if (claimingRewardKey.value && claimingRewardKey.value !== rewardKey) return true
  if (claimingRewardKey.value === rewardKey) return true
  return !reward?.canClaim
}

const resolveRewardActionLabel = (reward) => {
  const rewardKey = String(reward?.key || '')
  if (claimingRewardKey.value === rewardKey) return claimInProgressLabel.value
  if (reward?.canClaim) return claimNowLabel.value
  const status = resolveRewardItemStatus(reward)
  if (status.tone === 'active') {
    return tt('ritualRewards.actionActive')
  }
  return tt('ritualRewards.actionLocked')
}

const resolveRewardActionIcon = (reward) => {
  const rewardKey = String(reward?.key || '')
  if (claimingRewardKey.value === rewardKey) return 'hourglass_top'
  if (reward?.canClaim) return 'redeem'
  const status = resolveRewardItemStatus(reward)
  return status.tone === 'active' ? 'check_circle' : 'lock'
}

const resolveClaimErrorMessage = (error) => {
  const code = String(error?.message || error || '').toLowerCase()
  if (code.includes('insufficient_points')) {
    return tt('ritualRewards.claimErrorInsufficient')
  }
  if (code.includes('already_owned')) {
    return tt('ritualRewards.claimErrorAlreadyOwned')
  }
  return tt('ritualRewards.claimErrorGeneric')
}

const onClaimRewardClick = async (reward) => {
  if (!reward?.key || !reward?.canClaim) return
  if (claimingRewardKey.value) return

  void impactLight()
  claimingRewardKey.value = String(reward.key)
  claimFeedback.value = { key: '', tone: 'success', message: '' }
  try {
    const result = await claimRitualReward(String(reward.key), {
      source: 'rewards_page_card',
      userId: authStore.state.user?.id || '',
    })

    if (result.ok) {
      claimedRewardKey.value = String(reward.key)
      if (claimFxTimer) {
        window.clearTimeout(claimFxTimer)
      }
      claimFxTimer = window.setTimeout(() => {
        claimedRewardKey.value = ''
        claimFxTimer = null
      }, 720)
      claimFeedback.value = {
        key: String(reward.key),
        tone: 'success',
        message: tt('ritualRewards.claimSuccess'),
      }
      refreshLocalState()
      await refreshRemoteDashboard(true)
    } else {
      claimFeedback.value = {
        key: String(reward.key),
        tone: 'error',
        message: resolveClaimErrorMessage(result.error),
      }
    }
  } catch (error) {
    claimFeedback.value = {
      key: String(reward.key),
      tone: 'error',
      message: resolveClaimErrorMessage(error),
    }
  } finally {
    claimingRewardKey.value = ''
  }
}

const onBackClick = async () => {
  void impactLight()
  suppressNavigationHaptics(550)
  if (window?.history?.length > 1) {
    router.back()
    return
  }
  await router.push({ name: 'arcana' })
}

</script>

<style scoped lang="scss">
.rewards-page {
  --rw-text-high: rgba(244, 249, 255, 0.98);
  --rw-text-mid: rgba(192, 213, 236, 0.92);
  --rw-text-low: rgba(154, 180, 210, 0.88);
  --rw-ring-track: rgba(107, 144, 184, 0.28);
  --rw-ring-fill-a: rgba(106, 214, 255, 0.96);
  --rw-ring-fill-b: rgba(255, 206, 140, 0.94);

  min-height: 100%;
  padding: calc(90px + env(safe-area-inset-top)) 18px calc(132px + env(safe-area-inset-bottom, 0px) + 84px);
  background:
    radial-gradient(120% 80% at 50% -6%, rgba(79, 179, 235, 0.34), rgba(79, 179, 235, 0) 58%),
    radial-gradient(140% 100% at 0% 100%, rgba(43, 122, 190, 0.22), rgba(43, 122, 190, 0) 62%),
    linear-gradient(180deg, #06101a 0%, #040b14 42%, #030911 100%);
}

.rewards-shell {
  width: 100%;
  max-width: 540px;
  margin: 0 auto;
  display: grid;
  gap: 11px;
}

.rewards-page__close-dock {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 0 18px calc(env(safe-area-inset-bottom, 0px) + 8px);
  z-index: 30;
  pointer-events: none;
}

.rewards-actions__close-wrap {
  width: 100%;
  max-width: 540px;
  margin: 0 auto;
  padding: 8px;
  border-radius: 16px;
  border: 1px solid rgba(106, 126, 164, 0.22);
  background:
    linear-gradient(180deg, rgba(9, 13, 21, 0.88), rgba(3, 6, 11, 0.95)),
    linear-gradient(90deg, rgba(83, 112, 170, 0.1), rgba(83, 112, 170, 0));
  box-shadow:
    inset 0 1px 0 rgba(186, 207, 247, 0.08),
    0 10px 24px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
}


.rewards-hero {
  display: grid;
  gap: 3px;
}

.rewards-hero--with-back {
  position: relative;
  grid-template-columns: 1fr;
  align-items: center;
  justify-items: center;
  gap: 12px;
}

.rewards-back {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(10, 14, 22, 0.7);
  color: rgba(214, 225, 242, 0.8);
  display: grid;
  place-items: center;
}

.rewards-hero__text {
  text-align: center;
  display: grid;
  gap: 3px;
  justify-items: center;
  padding: 0 44px;
}

.rewards-title {
  margin: 0;
  font-size: 18px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--rw-text-high);
}

.rewards-kicker {
  font-size: 10px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.6);
}

.rewards-spotlight {
  border-radius: 18px;
  border: 1px solid rgba(145, 206, 242, 0.34);
  background:
    linear-gradient(162deg, rgba(10, 17, 27, 0.95), rgba(5, 10, 18, 0.98)),
    radial-gradient(130% 96% at 0% 0%, rgba(83, 198, 255, 0.2), rgba(83, 198, 255, 0) 58%),
    radial-gradient(130% 92% at 100% 100%, rgba(115, 247, 217, 0.11), rgba(115, 247, 217, 0) 70%);
  box-shadow:
    0 14px 30px rgba(0, 0, 0, 0.34),
    inset 0 1px 0 rgba(232, 245, 255, 0.11);
  padding: 14px 13px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 12px;
}

.rewards-spotlight__copy {
  min-width: 0;
}

.rewards-subtitle {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.35;
  color: var(--rw-text-mid);
}

.rewards-hero__progress-line {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.3;
  color: var(--rw-text-low);
}

.rewards-orb {
  --reward-ring-percent: 0%;
  position: relative;
  width: clamp(104px, 28vw, 126px);
  aspect-ratio: 1;
  border-radius: 999px;
  padding: 8px;
  display: grid;
  place-items: center;
  isolation: isolate;
  background: conic-gradient(
    from -90deg,
    var(--rw-ring-fill-a) 0 var(--reward-ring-percent),
    var(--rw-ring-track) var(--reward-ring-percent) 100%
  );
  box-shadow:
    0 0 0 1px rgba(170, 216, 247, 0.24),
    0 14px 24px rgba(0, 0, 0, 0.38),
    0 0 24px rgba(96, 183, 238, 0.24);
}

.rewards-orb::before {
  content: '';
  position: absolute;
  inset: 8px;
  border-radius: inherit;
  z-index: 1;
  background:
    radial-gradient(110% 110% at 32% 24%, rgba(180, 236, 255, 0.18), rgba(180, 236, 255, 0) 62%),
    linear-gradient(170deg, rgba(8, 16, 27, 0.96), rgba(5, 10, 19, 0.98));
}

.rewards-orb__glow {
  position: absolute;
  inset: -9px;
  border-radius: inherit;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 30% 20%, rgba(201, 241, 255, 0.2), rgba(201, 241, 255, 0) 58%),
    radial-gradient(circle at 70% 75%, rgba(115, 246, 215, 0.18), rgba(115, 246, 215, 0) 66%);
  box-shadow:
    0 0 24px rgba(96, 183, 238, 0.32),
    0 0 38px rgba(96, 183, 238, 0.18);
  filter: blur(4px);
}

.rewards-orb__spark {
  position: absolute;
  z-index: 3;
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: rgba(216, 244, 255, 0.96);
  box-shadow: 0 0 9px rgba(127, 206, 255, 0.76);
}

.rewards-orb__spark--one {
  top: 14px;
  right: 19px;
}

.rewards-orb__spark--two {
  bottom: 16px;
  left: 17px;
}

.rewards-orb__inner {
  position: relative;
  z-index: 2;
  display: grid;
  justify-items: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

.rewards-orb__balance {
  font-size: clamp(24px, 7vw, 34px);
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.015em;
  color: rgba(232, 247, 255, 0.98);
  text-shadow:
    0 0 12px rgba(123, 210, 255, 0.42),
    0 3px 14px rgba(0, 0, 0, 0.35);
}

.rewards-balance {
  border-radius: 14px;
  border: 1px solid rgba(149, 207, 242, 0.3);
  background:
    linear-gradient(165deg, rgba(8, 14, 22, 0.8), rgba(5, 10, 16, 0.9)),
    radial-gradient(120% 80% at 100% 0%, rgba(255, 208, 137, 0.14), rgba(255, 208, 137, 0) 62%);
  box-shadow:
    0 10px 22px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(233, 245, 255, 0.07);
  padding: 10px 11px;
}

.rewards-balance__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  color: var(--rw-text-mid);
}

.rewards-balance__row strong {
  color: var(--rw-text-high);
  font-size: 13px;
}

.rewards-balance__track {
  margin-top: 8px;
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: rgba(120, 177, 224, 0.24);
  overflow: hidden;
}

.rewards-balance__track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--rw-ring-fill-a), var(--rw-ring-fill-b));
  box-shadow: 0 0 12px rgba(106, 213, 255, 0.32);
  transition: width 320ms ease;
}

.rewards-balance__chips {
  margin-top: 7px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.rewards-balance__chips span {
  min-height: 24px;
  border-radius: 999px;
  border: 1px solid rgba(152, 214, 249, 0.28);
  background: rgba(8, 15, 24, 0.62);
  color: var(--rw-text-mid);
  padding: 3px 9px;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
}

.rewards-skeleton-list {
  display: grid;
  gap: 7px;
}

.reward-skeleton {
  border-radius: 16px;
  border: 1px solid rgba(140, 199, 233, 0.22);
  background: rgba(7, 14, 22, 0.78);
  padding: 10px;
  display: grid;
  gap: 8px;
}

.reward-skeleton__top,
.reward-skeleton__line {
  position: relative;
  overflow: hidden;
  border-radius: 10px;
  background: rgba(126, 168, 204, 0.2);
}

.reward-skeleton__top {
  height: 30px;
}

.reward-skeleton__line {
  height: 16px;
  width: 62%;
}

.reward-skeleton__top::after,
.reward-skeleton__line::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0),
    rgba(219, 239, 255, 0.28),
    rgba(255, 255, 255, 0)
  );
  animation: rewardsSkeletonShimmer 1.2s ease infinite;
}

.rewards-filters {
  position: sticky;
  top: calc(env(safe-area-inset-top) + 56px);
  z-index: 12;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 0 2px;
}

.rewards-filters::-webkit-scrollbar {
  display: none;
}

.rewards-filter {
  min-height: 30px;
  border-radius: 999px;
  border: 1px solid rgba(146, 202, 236, 0.3);
  background: rgba(7, 15, 24, 0.8);
  color: var(--rw-text-mid);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
  padding: 5px 11px;
}

.rewards-filter--active {
  border-color: rgba(127, 213, 255, 0.54);
  background:
    linear-gradient(180deg, rgba(29, 116, 168, 0.94), rgba(11, 62, 108, 0.98)),
    radial-gradient(120% 100% at 20% 0%, rgba(185, 240, 255, 0.2), rgba(185, 240, 255, 0) 70%);
  color: rgba(240, 249, 255, 0.99);
}

.rewards-group {
  display: grid;
  gap: 7px;
}

.rewards-group__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.rewards-group__title {
  margin: 0;
  font-size: 13px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--rw-text-high);
}

.rewards-group__count {
  min-width: 24px;
  height: 24px;
  border-radius: 999px;
  border: 1px solid rgba(153, 210, 244, 0.32);
  background: rgba(8, 16, 25, 0.72);
  color: var(--rw-text-mid);
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 7px;
}

.rewards-list {
  display: grid;
  gap: 9px;
}

.reward-card {
  --reward-accent: rgba(148, 204, 241, 0.62);
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  border: 1px solid rgba(147, 203, 238, 0.24);
  background:
    linear-gradient(152deg, rgba(11, 19, 31, 0.92), rgba(5, 11, 18, 0.98)),
    radial-gradient(130% 110% at 100% 0%, rgba(82, 196, 255, 0.13), rgba(82, 196, 255, 0) 72%);
  padding: 12px;
  box-shadow:
    0 11px 20px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(228, 241, 255, 0.07);
}

.reward-card::after {
  content: '';
  position: absolute;
  inset: 0 12px auto 12px;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0), var(--reward-accent), rgba(255, 255, 255, 0));
}

.reward-card__glow {
  position: absolute;
  pointer-events: none;
  z-index: 0;
}

.reward-card__glow--top {
  top: -58px;
  left: 18px;
  width: 132px;
  height: 84px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(125, 217, 255, 0.14), rgba(125, 217, 255, 0));
  filter: blur(8px);
}

.reward-card__glow--side {
  right: -48px;
  bottom: -50px;
  width: 112px;
  height: 112px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(255, 199, 134, 0.08), rgba(255, 199, 134, 0));
  filter: blur(10px);
}

.reward-card--available {
  --reward-accent: rgba(118, 239, 194, 0.92);
  border-color: rgba(119, 239, 194, 0.52);
}

.reward-card--active {
  --reward-accent: rgba(126, 216, 255, 0.88);
  border-color: rgba(126, 216, 255, 0.42);
}

.reward-card--locked {
  --reward-accent: rgba(148, 204, 241, 0.64);
  border-color: rgba(147, 203, 238, 0.23);
}

.reward-card--claimed {
  animation: rewardClaimPulse 720ms ease;
}

.reward-card__main {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.reward-card__identity {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.reward-card__glyph {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid rgba(160, 216, 246, 0.32);
  background:
    linear-gradient(162deg, rgba(8, 18, 28, 0.9), rgba(6, 13, 22, 0.96)),
    radial-gradient(120% 100% at 30% 20%, rgba(135, 220, 255, 0.2), rgba(135, 220, 255, 0) 68%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgba(232, 247, 255, 0.95);
  flex: 0 0 auto;
  box-shadow:
    inset 0 1px 0 rgba(233, 246, 255, 0.14),
    0 4px 10px rgba(0, 0, 0, 0.24);
}

.reward-card__titles {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.reward-card__titles strong {
  font-size: 13.5px;
  color: var(--rw-text-high);
  letter-spacing: 0.01em;
  line-height: 1.25;
}

.reward-card__category {
  width: fit-content;
  min-height: 20px;
  border-radius: 999px;
  border: 1px solid rgba(146, 202, 236, 0.34);
  background: rgba(8, 16, 25, 0.64);
  color: var(--rw-text-mid);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
}

.reward-card__subtitle {
  font-size: 11px;
  line-height: 1.2;
  color: var(--rw-text-low);
}

.reward-card__price {
  min-height: 24px;
  border-radius: 999px;
  border: 1px solid rgba(171, 224, 255, 0.48);
  background:
    linear-gradient(160deg, rgba(16, 83, 120, 0.92), rgba(10, 49, 84, 0.95)),
    radial-gradient(120% 100% at 22% 16%, rgba(175, 241, 255, 0.24), rgba(175, 241, 255, 0) 70%);
  color: rgba(241, 250, 255, 0.99);
  font-weight: 700;
  font-size: 10.5px;
  letter-spacing: 0.05em;
  padding: 3px 9px;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  box-shadow:
    0 7px 12px rgba(8, 52, 76, 0.23),
    inset 0 1px 0 rgba(230, 247, 255, 0.2);
}

.reward-card__foot {
  position: relative;
  z-index: 1;
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.reward-card__state {
  margin: 0;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.25;
  color: var(--rw-text-mid);
  flex: 0 1 auto;
}

.reward-card__state-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: rgba(151, 211, 244, 0.86);
  box-shadow: 0 0 8px rgba(151, 211, 244, 0.54);
  flex: 0 0 auto;
}

.reward-card__claim {
  min-height: 30px;
  border-radius: 9px;
  border: 1px solid rgba(119, 239, 194, 0.56);
  background:
    linear-gradient(180deg, rgba(34, 189, 224, 0.88), rgba(14, 114, 166, 0.92)),
    radial-gradient(130% 100% at 0% 0%, rgba(165, 246, 224, 0.25), rgba(165, 246, 224, 0) 70%);
  color: rgba(242, 251, 255, 0.99);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.01em;
  padding: 5px 10px;
  flex: 0 0 auto;
  min-width: 86px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  box-shadow:
    0 7px 14px rgba(8, 52, 76, 0.3),
    inset 0 1px 0 rgba(229, 251, 255, 0.24);
}

.reward-card__claim:disabled {
  opacity: 0.78;
  box-shadow: none;
  border-color: rgba(136, 176, 206, 0.38);
  background: rgba(9, 18, 28, 0.65);
  color: rgba(175, 198, 223, 0.92);
}

.reward-card__feedback {
  position: relative;
  z-index: 1;
  margin: 7px 0 0;
  font-size: 11.5px;
  line-height: 1.3;
}

.rewards-empty {
  border-radius: 14px;
  border: 1px dashed rgba(140, 196, 232, 0.28);
  background: rgba(8, 16, 26, 0.52);
  color: var(--rw-text-mid);
  font-size: 13px;
  text-align: center;
  padding: 14px 12px;
}

.reward-card--tarot .reward-card__glyph {
  border-color: rgba(130, 223, 255, 0.46);
  box-shadow:
    inset 0 1px 0 rgba(233, 246, 255, 0.16),
    0 0 14px rgba(109, 208, 255, 0.28);
}

.reward-card--love .reward-card__glyph {
  border-color: rgba(255, 172, 206, 0.48);
  box-shadow:
    inset 0 1px 0 rgba(255, 226, 239, 0.16),
    0 0 14px rgba(255, 140, 190, 0.22);
}

.reward-card--career .reward-card__glyph {
  border-color: rgba(167, 210, 255, 0.42);
  box-shadow:
    inset 0 1px 0 rgba(226, 240, 255, 0.15),
    0 0 14px rgba(120, 181, 255, 0.2);
}

.reward-card--badge .reward-card__glyph {
  border-color: rgba(255, 217, 152, 0.54);
  box-shadow:
    inset 0 1px 0 rgba(255, 245, 220, 0.17),
    0 0 14px rgba(255, 195, 108, 0.24);
}

.reward-card--available .reward-card__state-dot {
  background: rgba(118, 239, 194, 0.92);
  box-shadow: 0 0 8px rgba(118, 239, 194, 0.56);
}

.reward-card--active .reward-card__state-dot {
  background: rgba(126, 216, 255, 0.9);
  box-shadow: 0 0 8px rgba(126, 216, 255, 0.55);
}

.reward-card__feedback--success {
  color: rgba(143, 240, 203, 0.96);
}

.reward-card__feedback--error {
  color: rgba(255, 186, 186, 0.95);
}

@keyframes rewardsOrbPulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow:
      0 0 0 1px rgba(170, 216, 247, 0.24),
      0 14px 24px rgba(0, 0, 0, 0.38),
      0 0 24px rgba(96, 183, 238, 0.24);
  }
  50% {
    transform: scale(1.02);
    box-shadow:
      0 0 0 1px rgba(170, 216, 247, 0.26),
      0 16px 26px rgba(0, 0, 0, 0.4),
      0 0 32px rgba(96, 183, 238, 0.3);
  }
}

@keyframes rewardsSparkBlink {
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

@keyframes rewardsSkeletonShimmer {
  100% {
    transform: translateX(100%);
  }
}

@keyframes rewardClaimPulse {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.015);
    box-shadow:
      0 12px 22px rgba(0, 0, 0, 0.28),
      0 0 0 1px rgba(124, 228, 193, 0.52),
      0 0 18px rgba(124, 228, 193, 0.3);
  }
  100% {
    transform: scale(1);
  }
}

.rewards-orb {
  animation: rewardsOrbPulse 2.8s ease-in-out infinite;
}

.rewards-orb__spark--one {
  animation: rewardsSparkBlink 1.7s ease-in-out infinite;
}

.rewards-orb__spark--two {
  animation: rewardsSparkBlink 1.7s ease-in-out 0.5s infinite;
}

@media (max-width: 390px) {
  .rewards-spotlight {
    grid-template-columns: minmax(0, 1fr);
    justify-items: stretch;
  }

  .rewards-orb {
    margin: 0 auto;
  }

  .rewards-page__close-dock {
    padding: 0 13px;
  }
}

@media (min-width: 430px) {
  .reward-card {
    padding: 10px 11px;
  }
}
</style>
