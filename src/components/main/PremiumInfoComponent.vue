<template>
  <q-page class="premium-page">
    <div class="premium-bg" aria-hidden="true"></div>

    <div class="premium-content">
      <div class="premium-nav">
        <button type="button" class="premium-back" @click="onBack">
          <q-icon name="chevron_left" size="18px" />
        </button>
      </div>

      <header class="premium-hero">
        <h1 class="premium-hero__title">{{ tt('premiumPage.title') }}</h1>
        <p class="premium-hero__sub">{{ tt('premiumPage.subtitle') }}</p>
      </header>

      <section class="premium-card premium-card--focus">
        <div class="premium-card__label">{{ tt('premiumPage.heroBadge') }}</div>
        <div class="premium-focus">
          <h2 class="premium-focus__title">{{ tt('premiumPage.outcome.title') }}</h2>
          <p class="premium-focus__text">{{ tt('premiumPage.outcome.text') }}</p>
          <div class="premium-focus__points" role="list" :aria-label="tt('premiumPage.sections.why')">
            <div
              v-for="point in outcomePoints"
              :key="point.key"
              class="premium-focus__point"
              role="listitem"
            >
              <div class="premium-focus__point-title">{{ point.title }}</div>
              <div class="premium-focus__point-text">{{ point.text }}</div>
            </div>
          </div>
          <p class="premium-focus__note">{{ tt('premiumPage.outcome.note') }}</p>
        </div>
      </section>

      <section class="premium-card premium-card--plans">
        <div class="premium-card__label">{{ tt('premiumPage.sections.billing') }}</div>
        <p v-if="!billingReady" class="plan-unavailable-note">{{ billingUnavailableMessage }}</p>
        <div class="plan-grid">
          <button
            v-for="plan in billingPlans"
            :key="plan.id"
            type="button"
            class="plan-tile"
            :class="{ 'plan-tile--active': selectedPlanId === plan.id }"
            :disabled="isBillingActionPending"
            @click="onSelectPlan(plan.id)"
          >
            <span class="plan-tile__head">
              <span class="plan-tile__title">{{ tt(plan.titleKey) }}</span>
              <span class="plan-tile__dot">
                <q-icon v-if="selectedPlanId === plan.id" name="check" size="11px" />
              </span>
            </span>
            <span class="plan-tile__price">{{ getPlanPriceLabel(plan.id) }}</span>
            <span v-if="getPlanOfferLabel(plan.id)" class="plan-tile__saving">{{
              getPlanOfferLabel(plan.id)
            }}</span>
            <span class="plan-tile__note">{{ tt(plan.noteKey) }}</span>
          </button>
        </div>
      </section>

      <section
        class="premium-card premium-card--compare"
        :class="{ 'premium-card--compare-visible': showCompareCard }"
      >
        <div class="premium-card__label">{{ tt('premiumPage.sections.compare') }}</div>
        <p class="compare-table__lead">{{ compareCardCopy.lead }}</p>
        <div class="compare-table">
          <div v-for="row in quickCompareRows" :key="row.id" class="compare-table__row">
            <div class="compare-table__feat">{{ row.feature }}</div>
            <div class="compare-table__stack">
              <div class="compare-table__item compare-table__item--free">
                <div class="compare-table__item-label">{{ tt('premiumAccess.model.labels.free') }}</div>
                <div class="compare-table__val compare-table__val--free">{{ row.free }}</div>
              </div>
              <div class="compare-table__item compare-table__item--premium">
                <div class="compare-table__item-label compare-table__item-label--premium">
                  {{ tt('premiumAccess.model.labels.premium') }}
                </div>
                <div class="compare-table__val compare-table__val--premium">{{ row.premium }}</div>
              </div>
            </div>
          </div>
        </div>
        <p class="compare-table__summary">{{ compareCardCopy.summary }}</p>

        <!-- Tier descriptions for screen readers and SEO. Visually hidden. -->
        <dl class="access-model-legend sr-only" :aria-label="tt('premiumPage.accessModel.title')">
          <dt>{{ tt('premiumAccess.model.labels.free') }}</dt>
          <dd>{{ tt('premiumPage.accessModel.free') }}</dd>
          <dt>{{ tt('premiumAccess.model.labels.premium') }}</dt>
          <dd>{{ tt('premiumPage.accessModel.premium') }}</dd>
          <dt>{{ tt('premiumAccess.model.labels.purchase') }}</dt>
          <dd>{{ tt('premiumPage.accessModel.purchasePrefix') }} {{ tt('premiumPage.accessModel.premium') }}</dd>
        </dl>
      </section>

      <div class="premium-legal">
        <div class="legal-links">
          <button type="button" class="legal-link" @click="onOpenPolicy('privacy')">
            {{ tt('premiumPage.legal.privacy') }}
          </button>
          <span class="legal-links__sep">•</span>
          <button type="button" class="legal-link" @click="onOpenPolicy('terms')">
            {{ tt('premiumPage.legal.terms') }}
          </button>
          <span class="legal-links__sep">•</span>
          <button
            type="button"
            class="legal-link"
            :disabled="isBillingActionPending"
            @click="onRestore"
          >
            {{ restoreButtonLabel }}
          </button>
        </div>
        <p class="premium-footnote">{{ tt('premiumPage.billing.footnote') }}</p>
      </div>
    </div>
      <div class="sticky-purchase">
        <button
          type="button"
          class="sticky-purchase__ok"
          :disabled="isBillingActionPending"
          @click="onPurchase"
        >
          <span class="sticky-purchase__ok-content">
            <span class="sticky-purchase__ok-main">{{
              isPurchasing ? tt('premiumPage.billing.processing') : tt('premiumPage.billing.button')
            }}</span>
            <span class="sticky-purchase__ok-sub">{{ purchaseSubline }}</span>
          </span>
          <span class="sticky-purchase__ok-arrow">
            <q-spinner v-if="isPurchasing" size="16px" color="white" />
            <q-icon v-else name="arrow_forward" size="16px" />
          </span>
        </button>

        <div class="sticky-purchase__close-wrap">
          <button type="button" class="sticky-purchase__close" @click="onClose">
            {{ tt('common.close') }}
          </button>
        </div>
      </div>
  </q-page>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { t, currentLocale } from 'src/i18n'
import { useQuasar } from 'quasar'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'
import { usePremiumAccess } from 'src/stores/premiumAccess'
import {
  getBillingPremiumStatus,
  getBillingPaywallPlans,
  purchasePremiumPlan,
  restorePremiumPurchases,
} from 'src/services/premiumBilling'
import { PAYWALL_FUNNEL_EVENTS } from 'src/constants/analyticsEvents'
import { analytics } from 'src/services/analytics'
import { loadPremiumBootstrapSnapshot } from 'src/helpers/premiumBootstrapCore.js'

const locale = computed(() => currentLocale.value || 'en')
const tt = (key) => t(locale.value, key)
const router = useRouter()
const route = useRoute()
const $q = useQuasar()
const {
  state: premiumState,
  hasPremiumAccess,
  premiumPlan,
  revokePremiumAccess,
  applyPremiumAccessStatus,
} = usePremiumAccess()
const selectedPlanId = ref(premiumPlan.value)
const billingCatalog = ref({
  monthly: { priceLabel: '', offerLabel: '', freeTrial: null },
  yearly: { priceLabel: '', offerLabel: '', freeTrial: null },
})
const isPurchasing = ref(false)
const isRestoring = ref(false)
const billingReady = ref(true)
const billingIssueReason = ref('')
const paywallCloseReason = ref('route_change')
const paywallCloseLogged = ref(false)
const purchaseCompleted = ref(false)
const tarotAiEnabled = import.meta.env.VITE_ENABLE_TAROT_AI === 'true'
const showCompareCard = ref(false)

let compareRevealFrame = 0
const COMPARE_REVEAL_SCROLL_Y = 28
const COMPARE_HIDE_SCROLL_Y = 8

const updateCompareCardVisibility = () => {
  if (typeof window === 'undefined') return
  const y = Math.max(window.scrollY || 0, 0)
  if (y >= COMPARE_REVEAL_SCROLL_Y) {
    showCompareCard.value = true
  } else if (y <= COMPARE_HIDE_SCROLL_Y) {
    showCompareCard.value = false
  }
}

const handleCompareCardScroll = () => {
  if (typeof window === 'undefined' || compareRevealFrame) return
  compareRevealFrame = window.requestAnimationFrame(() => {
    compareRevealFrame = 0
    updateCompareCardVisibility()
  })
}

const outcomePoints = computed(() => [
  {
    key: 'depth',
    title: tt('premiumPage.outcome.points.depth.title'),
    text: tt('premiumPage.outcome.points.depth.text'),
  },
  {
    key: 'continuity',
    title: tt('premiumPage.outcome.points.continuity.title'),
    text: tt('premiumPage.outcome.points.continuity.text'),
  },
  {
    key: 'range',
    title: tt('premiumPage.outcome.points.range.title'),
    text: tt('premiumPage.outcome.points.range.text'),
  },
])

const quickCompareRows = computed(() => {
  if (locale.value === 'uk') {
    return [
      {
        id: 'tarot-format',
        feature: 'Розклад таро',
        free: '1 карта/день',
        premium: '1, 3 або 5 карт без ліміту',
      },
      {
        id: 'interpretation',
        feature: 'Розбір',
        free: 'Короткий висновок',
        premium: tarotAiEnabled ? 'Глибокий AI-розбір + кроки' : 'Глибокий розбір + кроки',
      },
      {
        id: 'horoscope',
        feature: 'Теми гороскопу',
        free: 'Лише енергія',
        premium: 'Енергія, кохання, карʼєра',
      },
      {
        id: 'compatibility',
        feature: 'Сумісність',
        free: 'Лише preview',
        premium: 'Повний розбір пари',
      },
      {
        id: 'history',
        feature: 'Історія',
        free: 'Без історії',
        premium: 'Усі читання збережені',
      },
    ]
  }

  return [
    {
      id: 'tarot-format',
      feature: 'Tarot spread',
      free: '1 card/day',
      premium: '1, 3, or 5 cards with no limit',
    },
    {
      id: 'interpretation',
      feature: 'Reading depth',
      free: 'Short takeaway',
      premium: tarotAiEnabled ? 'Deep AI reading + action steps' : 'Deep reading + action steps',
    },
    {
      id: 'horoscope',
      feature: 'Horoscope themes',
      free: 'Energy only',
      premium: 'Energy, love, and career',
    },
    {
      id: 'compatibility',
      feature: 'Compatibility',
      free: 'Preview only',
      premium: 'Full relationship reading',
    },
    {
      id: 'history',
      feature: 'History',
      free: 'No history',
      premium: 'All readings saved',
    },
  ]
})

const compareCardCopy = computed(() =>
  locale.value === 'uk'
    ? {
        lead: 'Free підходить для базового щоденного ритуалу. Premium відкриває повний формат роботи з таро, гороскопом і сумісністю.',
        summary: 'Premium = повний доступ до всіх форматів без денних лімітів.',
      }
    : {
        lead: 'Free works for a basic daily ritual. Premium unlocks the full tarot, horoscope, and compatibility experience.',
        summary: 'Premium = full access to every format with no daily limits.',
      },
)

const billingPlans = [
  {
    id: 'monthly',
    titleKey: 'premiumPage.billing.monthly.title',
    buttonLabelKey: 'premiumPage.billing.monthly.buttonLabel',
    noteKey: 'premiumPage.billing.monthly.note',
    badgeKey: '',
  },
  {
    id: 'yearly',
    titleKey: 'premiumPage.billing.yearly.title',
    buttonLabelKey: 'premiumPage.billing.yearly.buttonLabel',
    noteKey: 'premiumPage.billing.yearly.note',
    badgeKey: 'premiumPage.billing.yearly.badge',
  },
]

const getPlanPriceLabel = (planId) => {
  const price = String(billingCatalog.value?.[planId]?.priceLabel || '').trim()
  if (price) return price
  return tt('premiumPage.billing.pricePending')
}

const getPlanOfferLabel = (planId) => {
  const entry = billingCatalog.value?.[planId]
  const trial = entry?.freeTrial
  if (trial) {
    return trial.days
      ? tt('premiumPage.billing.freeTrialDays').replace('{days}', String(trial.days))
      : tt('premiumPage.billing.freeTrial')
  }
  return String(entry?.offerLabel || '').trim()
}

const paywallSource = computed(() => {
  const value = route.query?.source
  if (Array.isArray(value)) return String(value[0] || 'direct')
  return String(value || 'direct')
})
const paywallEntry = computed(() => {
  const value = route.query?.entry
  if (Array.isArray(value)) return String(value[0] || 'direct')
  return String(value || 'direct')
})

const detectTrialOffer = (planId) => {
  const text = getPlanOfferLabel(planId).toLowerCase()
  if (!text) return false
  return /(trial|free|\u043f\u0440\u043e\u0431\u043d|\u0431\u0435\u0437\u043a\u043e\u0448\u0442\u043e\u0432)/.test(
    text,
  )
}

const logPaywallEvent = (eventName, params = {}) => {
  void analytics.logEvent(eventName, {
    source: paywallSource.value,
    entry: paywallEntry.value,
    plan: selectedPlanId.value,
    ...params,
  })
}

const markPaywallClose = (reason) => {
  if (paywallCloseLogged.value) return
  paywallCloseLogged.value = true
  void analytics.logEvent(PAYWALL_FUNNEL_EVENTS.paywallClose, {
    source: paywallSource.value,
    entry: paywallEntry.value,
    reason,
    purchase_completed: purchaseCompleted.value ? 'true' : 'false',
  })
}

const isBillingActionPending = computed(() => isPurchasing.value || isRestoring.value)
const restoreButtonLabel = computed(() =>
  isRestoring.value ? tt('premiumPage.billing.restoring') : tt('premiumPage.billing.restore'),
)

const hapticTap = async () => {
  if (!Capacitor.isNativePlatform()) return
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch (e) {
    console.error(e)
  }
}

const onBack = async () => {
  paywallCloseReason.value = 'back'
  markPaywallClose('back')
  await hapticTap()
  router.back()
}

const onClose = async () => {
  paywallCloseReason.value = 'close_button'
  markPaywallClose('close_button')
  await onBack()
}

const onSelectPlan = async (id) => {
  if (isBillingActionPending.value) return
  selectedPlanId.value = id
  await hapticTap()
}

const resolveBillingErrorMessage = (reason, mode = 'purchase') => {
  const normalized = String(reason || '').toLowerCase()
  if (normalized === 'network_error') return tt('premiumPage.billing.errors.network')
  if (
    normalized === 'missing_api_key' ||
    normalized === 'configure_failed' ||
    normalized === 'plugin_missing'
  ) {
    return tt('premiumPage.billing.errors.config')
  }
  if (normalized === 'not_native') {
    return mode === 'restore'
      ? tt('premiumPage.billing.errors.restoreUnavailable')
      : tt('premiumPage.billing.errors.unavailable')
  }
  if (mode === 'restore') return tt('premiumPage.billing.errors.restoreFailed')
  return tt('premiumPage.billing.errors.purchaseFailed')
}

const resolveBillingIssueDetail = (reason) => {
  const normalized = String(reason || '').toLowerCase()
  if (normalized === 'missing_api_key') {
    return locale.value === 'uk'
      ? '\u041d\u0435 \u0437\u0430\u0434\u0430\u043d\u043e VITE_RC_IOS_API_KEY \u0434\u043b\u044f iPhone build.'
      : 'VITE_RC_IOS_API_KEY is missing for the iPhone build.'
  }
  if (normalized === 'plugin_missing' || normalized === 'configure_failed') {
    return locale.value === 'uk'
      ? 'RevenueCat Purchases plugin \u043d\u0435 \u043f\u0456\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u0438\u0439 \u0443 \u043d\u0430\u0442\u0438\u0432\u043d\u043e\u043c\u0443 iOS build.'
      : 'The RevenueCat Purchases plugin is not connected in the native iOS build.'
  }
  if (normalized === 'not_native') {
    return locale.value === 'uk'
      ? '\u041f\u043e\u043a\u0443\u043f\u043a\u0438 \u043f\u0440\u0430\u0446\u044e\u044e\u0442\u044c \u043b\u0438\u0448\u0435 \u0432 \u043d\u0430\u0442\u0438\u0432\u043d\u043e\u043c\u0443 iPhone build.'
      : 'Purchases only work in a native iPhone build.'
  }
  if (normalized === 'network_error') {
    return locale.value === 'uk'
      ? '\u041d\u0435\u043c\u0430\u0454 \u0434\u043e\u0441\u0442\u0443\u043f\u0443 \u0434\u043e Store \u0430\u0431\u043e \u043c\u0435\u0440\u0435\u0436\u0456.'
      : 'The Store or network is currently unreachable.'
  }
  return locale.value === 'uk'
    ? 'Store billing \u0437\u0430\u0440\u0430\u0437 \u043d\u0435 \u0433\u043e\u0442\u043e\u0432\u0438\u0439.'
    : 'Store billing is currently unavailable.'
}

const billingUnavailableMessage = computed(() => {
  if (billingReady.value) return ''
  const detail = resolveBillingIssueDetail(billingIssueReason.value)
  return `${tt('premiumPage.billing.unavailableHint')} ${detail}`.trim()
})

const setBillingUnavailable = (reason) => {
  billingReady.value = false
  billingIssueReason.value = String(reason || 'unavailable').toLowerCase()
}

const markBillingReady = () => {
  billingReady.value = true
  billingIssueReason.value = ''
}

const onPurchase = async () => {
  if (isBillingActionPending.value || !billingReady.value) {
    if (!billingReady.value) {
      $q.notify({
        message: resolveBillingErrorMessage(billingIssueReason.value || 'not_native', 'purchase'),
        color: 'dark',
        textColor: 'white',
        position: 'bottom',
      })
    }
    return
  }
  await hapticTap()
  logPaywallEvent(PAYWALL_FUNNEL_EVENTS.purchaseClick, {
    price: getPlanPriceLabel(selectedPlanId.value),
    has_offer: getPlanOfferLabel(selectedPlanId.value) ? 'true' : 'false',
  })
  isPurchasing.value = true
  const wasActive = hasPremiumAccess.value
  try {
    const result = await purchasePremiumPlan(selectedPlanId.value)
    if (result.ok && result.hasPremium) {
      markBillingReady()
      purchaseCompleted.value = true
      applyPremiumAccessStatus({ active: true, plan: result.plan, source: 'billing' })
      logPaywallEvent(PAYWALL_FUNNEL_EVENTS.purchaseSuccess, {
        plan: result.plan,
      })
      if (detectTrialOffer(result.plan)) {
        logPaywallEvent(PAYWALL_FUNNEL_EVENTS.trialStart, {
          plan: result.plan,
        })
      }
      const message = wasActive
        ? tt('premiumPage.billing.results.updated')
        : tt('premiumPage.billing.results.activated')
      $q.notify({
        message,
        color: 'dark',
        textColor: 'white',
        position: 'bottom',
      })
      return
    }

    if (result.cancelled) {
      logPaywallEvent(PAYWALL_FUNNEL_EVENTS.purchaseError, { reason: 'cancelled' })
      $q.notify({
        message: tt('premiumPage.billing.results.cancelled'),
        color: 'dark',
        textColor: 'white',
        position: 'bottom',
      })
      return
    }

    if (!result.available) {
      setBillingUnavailable(result.reason)
      logPaywallEvent(PAYWALL_FUNNEL_EVENTS.purchaseError, {
        reason: String(result.reason || 'unavailable'),
      })
      $q.notify({
        message: resolveBillingErrorMessage(result.reason, 'purchase'),
        color: 'dark',
        textColor: 'white',
        position: 'bottom',
      })
      return
    }

    markBillingReady()
    logPaywallEvent(PAYWALL_FUNNEL_EVENTS.purchaseError, {
      reason: String(result.reason || 'unknown'),
    })
    $q.notify({
      message: resolveBillingErrorMessage(result.reason, 'purchase'),
      color: 'dark',
      textColor: 'white',
      position: 'bottom',
    })
  } finally {
    isPurchasing.value = false
  }
}

const onOpenPolicy = async (section) => {
  await hapticTap()
  await router.push({ name: 'privacyTerms', query: { section } })
}

const onRestore = async () => {
  if (isBillingActionPending.value || !billingReady.value) {
    if (!billingReady.value) {
      $q.notify({
        message: resolveBillingErrorMessage(billingIssueReason.value || 'not_native', 'restore'),
        color: 'dark',
        textColor: 'white',
        position: 'bottom',
      })
    }
    return
  }
  await hapticTap()
  isRestoring.value = true
  try {
    const result = await restorePremiumPurchases()
    if (!result.available) {
      setBillingUnavailable(result.reason)
      $q.notify({
        message: resolveBillingErrorMessage(result.reason, 'restore'),
        color: 'dark',
        textColor: 'white',
        position: 'bottom',
      })
      return
    }

    markBillingReady()
    let restored = false
    if (result.ok && result.hasPremium) {
      applyPremiumAccessStatus({ active: true, plan: result.plan, source: 'billing' })
      selectedPlanId.value = result.plan
      restored = true
      logPaywallEvent(PAYWALL_FUNNEL_EVENTS.restoreSuccess, { plan: result.plan })
    } else if (result.ok) {
      applyPremiumAccessStatus({ active: false, plan: 'monthly', source: 'billing' })
      selectedPlanId.value = 'monthly'
    } else if (!result.ok) {
      $q.notify({
        message: resolveBillingErrorMessage(result.reason, 'restore'),
        color: 'dark',
        textColor: 'white',
        position: 'bottom',
      })
      return
    }
    $q.notify({
      message: restored
        ? tt('premiumPage.billing.results.restored')
        : tt('premiumPage.billing.results.noActive'),
      color: 'dark',
      textColor: 'white',
      position: 'bottom',
    })
  } finally {
    isRestoring.value = false
  }
}

watch(premiumPlan, (plan) => {
  if (plan === 'monthly' || plan === 'yearly') {
    selectedPlanId.value = plan
  }
})

const initializePremiumBillingState = async () => {
  logPaywallEvent(PAYWALL_FUNNEL_EVENTS.paywallView)

  // Migration: remove legacy local/test premium state.
  const isLegacyLocalPremium =
    premiumState.value?.active && String(premiumState.value?.source || '').toLowerCase() === 'local'
  if (isLegacyLocalPremium) {
    revokePremiumAccess()
  }

  const snapshot = await loadPremiumBootstrapSnapshot({
    getBillingPaywallPlans,
    getBillingPremiumStatus,
  })

  billingCatalog.value = snapshot.billingCatalog
  if (snapshot.billingReady) {
    markBillingReady()
  } else {
    const reason = snapshot.errors[0]?.split(':')[1] || 'unavailable'
    setBillingUnavailable(reason)
  }

  if (snapshot.status) {
    applyPremiumAccessStatus({
      active: snapshot.status.hasPremium,
      plan: snapshot.status.plan,
      source: 'billing',
    })
  }

  if (snapshot.errors.length) {
    console.warn('[Premium] billing bootstrap degraded', snapshot.errors.join(','))
  }
}

const initializePremiumBillingStateSafe = async () => {
  try {
    await initializePremiumBillingState()
  } catch (error) {
    setBillingUnavailable('configure_failed')
    console.warn('[Premium] billing bootstrap failed', error)
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('scroll', handleCompareCardScroll, { passive: true })
  }
  updateCompareCardVisibility()
  void initializePremiumBillingStateSafe()
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('scroll', handleCompareCardScroll)
  }
  if (typeof window !== 'undefined' && compareRevealFrame) {
    window.cancelAnimationFrame(compareRevealFrame)
    compareRevealFrame = 0
  }
  markPaywallClose(paywallCloseReason.value || 'route_change')
})

const selectedPlan = computed(() => {
  return billingPlans.find((item) => item.id === selectedPlanId.value) || billingPlans[0]
})

const purchaseSubline = computed(() => {
  if (!billingReady.value) {
    return tt('premiumPage.billing.unavailableHint')
  }
  return `${tt(selectedPlan.value.titleKey)} \u00b7 ${getPlanPriceLabel(selectedPlan.value.id)}`
})
</script>

<style scoped lang="scss">
.premium-page {
  --text-main: #e9edf4;
  --text-soft: rgba(214, 225, 242, 0.68);
  --surface: rgba(11, 15, 24, 0.8);
  --surface-heavy: rgba(10, 14, 22, 0.74);
  --line: rgba(255, 255, 255, 0.08);
  --line-strong: rgba(255, 255, 255, 0.12);
  --accent-line: rgba(147, 203, 255, 0.46);
  --accent-line-soft: rgba(127, 162, 226, 0.28);
  --accent-glow: rgba(147, 203, 255, 0.18);
  min-height: 100vh;
  color: var(--text-main);
  position: relative;
  overflow: hidden;
}

.premium-page::after {
  content: '';
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: calc(env(safe-area-inset-bottom) + 20px);
  background: linear-gradient(180deg, rgba(5, 13, 21, 0.94), rgba(5, 13, 21, 1));
  pointer-events: none;
  z-index: 3;
}

.premium-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(110% 52% at 50% -6%, rgba(61, 119, 160, 0.3) 0%, rgba(7, 19, 29, 0) 56%),
    radial-gradient(120% 70% at 50% 0%, #0a2233 0%, #07131d 40%, #050d15 100%);
  z-index: 0;
}

.premium-content {
  position: relative;
  z-index: 1;
  padding: calc(52px + env(safe-area-inset-top)) 18px
    calc(44px + env(safe-area-inset-bottom) + 286px);
  max-width: 560px;
  margin: 0 auto;
  display: grid;
  gap: 14px;
  overflow-x: clip;
}

/* ─── Nav ─────────────────────────────────────────────────── */

.premium-nav {
  display: flex;
  align-items: center;
}

.premium-back {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  border: 1px solid rgba(156, 183, 230, 0.36);
  background: rgba(16, 24, 38, 0.78);
  color: rgba(214, 225, 242, 0.8);
  display: grid;
  place-items: center;
  transition:
    transform 120ms ease,
    border-color 120ms ease;
}

.premium-back:active {
  transform: scale(0.96);
  border-color: rgba(156, 184, 235, 0.28);
}

/* ─── Hero ────────────────────────────────────────────────── */

.premium-hero {
  display: grid;
  gap: 10px;
  text-align: center;
  padding: 8px 4px 6px;
}

.premium-hero__kicker {
  font-size: 11px;
  font-weight: 640;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(147, 203, 255, 0.7);
}

.premium-hero__title {
  margin: 0;
  font-size: clamp(26px, 6.5vw, 32px);
  line-height: 1.08;
  letter-spacing: 0.01em;
  color: rgba(235, 243, 255, 0.98);
}

.premium-hero__sub {
  margin: 0 auto;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(209, 222, 244, 0.8);
  max-width: 34ch;
}

.premium-card--focus {
  background:
    radial-gradient(120% 160% at 0% 0, rgba(147, 203, 255, 0.18), rgba(147, 203, 255, 0)),
    linear-gradient(165deg, rgba(8, 12, 20, 0.92), rgba(4, 6, 12, 0.98)) padding-box,
    linear-gradient(
        132deg,
        rgba(147, 203, 255, 0.42),
        rgba(127, 162, 226, 0.24),
        rgba(147, 203, 255, 0.12)
      )
      border-box;
}

.premium-focus {
  display: grid;
  gap: 12px;
}

.premium-focus__title {
  margin: 0;
  font-size: 22px;
  line-height: 1.18;
  color: rgba(244, 248, 255, 0.98);
}

.premium-focus__text,
.premium-focus__note {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
  color: rgba(214, 225, 242, 0.82);
}

.premium-focus__points {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.premium-focus__point {
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  padding: 12px;
  display: grid;
  gap: 5px;
}

.premium-focus__point-title {
  font-size: 13px;
  line-height: 1.35;
  font-weight: 650;
  color: rgba(240, 246, 255, 0.95);
}

.premium-focus__point-text {
  font-size: 12px;
  line-height: 1.45;
  color: rgba(198, 212, 235, 0.76);
}

/* ─── Card base ───────────────────────────────────────────── */

.premium-card {
  border-radius: 16px;
  border: 1px solid transparent;
  background:
    linear-gradient(165deg, rgba(8, 12, 20, 0.9), rgba(4, 6, 12, 0.96)) padding-box,
    linear-gradient(
        132deg,
        rgba(147, 203, 255, 0.34),
        rgba(127, 162, 226, 0.2),
        rgba(147, 203, 255, 0.1)
      )
      border-box;
  backdrop-filter: blur(12px);
  padding: 14px;
  display: grid;
  gap: 12px;
  position: relative;
  overflow: hidden;
  box-shadow:
    inset 0 1px 0 rgba(186, 207, 247, 0.08),
    0 12px 24px rgba(0, 0, 0, 0.3);
}

.premium-card::before {
  content: '';
  position: absolute;
  left: 10px;
  right: 10px;
  top: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    rgba(186, 207, 247, 0),
    rgba(186, 207, 247, 0.46),
    rgba(186, 207, 247, 0)
  );
  pointer-events: none;
}

.premium-card__label {
  font-size: 11px;
  letter-spacing: 0.08em;
  font-weight: 650;
  text-transform: uppercase;
  color: rgba(204, 220, 245, 0.68);
}

/* ─── Plans card ──────────────────────────────────────────── */

.premium-card--plans {
  background:
    radial-gradient(120% 160% at 100% 0, rgba(147, 203, 255, 0.16), rgba(147, 203, 255, 0)),
    linear-gradient(165deg, rgba(8, 12, 20, 0.9), rgba(4, 6, 12, 0.96)) padding-box,
    linear-gradient(
        132deg,
        rgba(147, 203, 255, 0.4),
        rgba(127, 162, 226, 0.24),
        rgba(147, 203, 255, 0.12)
      )
      border-box;
  margin-bottom: 20px;
}

.plan-unavailable-note {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: rgba(255, 212, 170, 0.92);
}

.plan-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.plan-tile {
  width: 100%;
  text-align: left;
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: #11161d;
  padding: 12px;
  display: grid;
  gap: 7px;
  color: rgba(229, 235, 244, 0.92);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.14);
  transition:
    border-color 150ms ease,
    background 150ms ease,
    box-shadow 150ms ease,
    transform 150ms ease;
}

.plan-tile::before {
  display: none;
}

.plan-tile::after {
  display: none;
}

.plan-tile--active {
  border-color: rgba(10, 132, 255, 0.62);
  background: #171e28;
  box-shadow:
    0 0 0 1px rgba(10, 132, 255, 0.22),
    0 8px 18px rgba(0, 0, 0, 0.18);
  transform: translateY(-1px);
}

.plan-tile:disabled {
  opacity: 0.52;
  pointer-events: none;
}

.plan-tile__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
}

.plan-tile__title {
  font-size: 15px;
  line-height: 1.35;
  color: rgba(214, 223, 236, 0.84);
  font-weight: 650;
}

.plan-tile:not(.plan-tile--active) .plan-tile__title {
  color: rgba(196, 206, 223, 0.8);
}

.plan-tile--active .plan-tile__title {
  color: rgba(248, 250, 255, 0.98);
}

.plan-tile__dot {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: transparent;
  color: transparent;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}

.plan-tile--active .plan-tile__dot {
  border-color: rgba(10, 132, 255, 0.92);
  background: #0a84ff;
  box-shadow: none;
  color: rgba(245, 249, 255, 0.99);
}

.plan-tile__price {
  font-size: 22px;
  line-height: 1.2;
  color: rgba(221, 230, 242, 0.88);
  font-weight: 670;
}

.plan-tile:not(.plan-tile--active) .plan-tile__price {
  color: rgba(207, 217, 233, 0.82);
}

.plan-tile--active .plan-tile__price {
  color: rgba(250, 252, 255, 1);
}

.plan-tile__saving {
  justify-self: start;
  border-radius: 999px;
  padding: 3px 7px;
  font-size: 12px;
  line-height: 1.3;
  color: rgba(199, 223, 255, 0.92);
  font-weight: 600;
  border: 1px solid rgba(10, 132, 255, 0.2);
  background: rgba(10, 132, 255, 0.12);
}

.plan-tile__note {
  font-size: 13px;
  line-height: 1.4;
  color: rgba(168, 180, 200, 0.7);
}

.plan-tile:not(.plan-tile--active) .plan-tile__note {
  color: rgba(160, 173, 194, 0.62);
}

.plan-tile--active .plan-tile__note {
  color: rgba(208, 220, 238, 0.84);
}

/* ─── Compare card ────────────────────────────────────────── */

.premium-card--compare {
  background:
    radial-gradient(120% 140% at 0% 0, rgba(147, 203, 255, 0.12), rgba(147, 203, 255, 0)),
    linear-gradient(165deg, rgba(8, 12, 20, 0.9), rgba(4, 6, 12, 0.96)) padding-box,
    linear-gradient(
        132deg,
        rgba(147, 203, 255, 0.28),
        rgba(127, 162, 226, 0.18),
        rgba(147, 203, 255, 0.08)
      )
      border-box;
  margin-bottom: 16px;
  opacity: 0;
  transform: translateY(14px);
  pointer-events: none;
  transition:
    opacity 220ms ease,
    transform 220ms ease;
}

.premium-card--compare-visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.compare-table {
  display: grid;
  gap: 10px;
}

.compare-table__lead,
.compare-table__summary {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(206, 219, 241, 0.78);
}

.compare-table__summary {
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(147, 203, 255, 0.18);
  background: linear-gradient(180deg, rgba(17, 38, 61, 0.62), rgba(10, 20, 33, 0.84));
  color: rgba(231, 240, 255, 0.94);
  font-weight: 620;
}

.compare-table__row {
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: 15px;
  border: 1px solid rgba(156, 183, 230, 0.14);
  background:
    linear-gradient(180deg, rgba(18, 24, 36, 0.92), rgba(8, 12, 19, 0.96)), rgba(8, 12, 19, 0.94);
}

.compare-table__feat {
  min-width: 0;
  font-size: 14px;
  line-height: 1.4;
  color: rgba(234, 242, 255, 0.94);
  font-weight: 620;
}

.compare-table__stack {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.compare-table__item {
  min-width: 0;
  border-radius: 13px;
  padding: 10px 11px;
  display: grid;
  gap: 6px;
  align-content: start;
}

.compare-table__item--free {
  border: 1px solid rgba(156, 183, 230, 0.12);
  background: rgba(255, 255, 255, 0.03);
}

.compare-table__item--premium {
  border: 1px solid rgba(147, 203, 255, 0.22);
  background: linear-gradient(180deg, rgba(19, 46, 77, 0.5), rgba(10, 23, 39, 0.72));
  box-shadow: inset 0 1px 0 rgba(147, 203, 255, 0.08);
}

.compare-table__item-label {
  font-size: 10px;
  font-weight: 650;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(177, 194, 220, 0.6);
}

.compare-table__item-label--premium {
  color: rgba(147, 203, 255, 0.78);
}

.compare-table__val {
  min-width: 0;
  font-size: 13px;
  line-height: 1.35;
  text-align: left;
  color: rgba(180, 200, 230, 0.72);
  font-weight: 560;
  overflow-wrap: normal;
  word-break: normal;
}

.compare-table__val--premium {
  color: rgba(147, 203, 255, 0.94);
  font-weight: 660;
}

/* ─── Legal ───────────────────────────────────────────────── */

.premium-legal {
  display: grid;
  gap: 7px;
  padding: 8px 10px;
  border: 1px solid rgba(156, 183, 230, 0.22);
  border-radius: 14px;
  background: rgba(10, 16, 28, 0.54);
  box-shadow: inset 0 1px 0 rgba(186, 207, 247, 0.06);
}

.legal-link {
  border: 0;
  background: transparent;
  padding: 0;
  color: rgba(220, 232, 250, 0.9);
  font-size: 14px;
  line-height: 1.4;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.legal-link:disabled {
  opacity: 0.5;
  pointer-events: none;
}

.legal-links {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
}

.legal-links__sep {
  color: rgba(170, 188, 216, 0.68);
  font-size: 12px;
}

.premium-footnote {
  margin: 0;
  font-size: 13px;
  color: rgba(196, 212, 236, 0.84);
  line-height: 1.55;
  text-align: center;
}

/* ─── Sticky purchase ────────────────────────────────────── */

.sticky-purchase {
  position: fixed;
  left: 14px;
  right: 14px;
  bottom: 10px;
  z-index: 4;
  border: 1px solid transparent;
  border-radius: 24px;
  background:
    linear-gradient(165deg, rgba(8, 12, 20, 0.98), rgba(4, 6, 12, 0.99)) padding-box,
    linear-gradient(
        132deg,
        rgba(147, 203, 255, 0.34),
        rgba(127, 162, 226, 0.2),
        rgba(147, 203, 255, 0.08)
      )
      border-box;
  backdrop-filter: blur(22px);
  box-shadow:
    inset 0 1px 0 rgba(186, 207, 247, 0.08),
    0 22px 40px rgba(0, 0, 0, 0.44),
    0 8px 20px rgba(0, 0, 0, 0.28);
  padding: 12px 12px calc(12px + env(safe-area-inset-bottom));
  display: grid;
  gap: 10px;
  overflow: hidden;
}

.sticky-purchase::before {
  content: '';
  position: absolute;
  left: 16px;
  right: 16px;
  top: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    rgba(186, 207, 247, 0),
    rgba(186, 207, 247, 0.46),
    rgba(186, 207, 247, 0)
  );
  pointer-events: none;
}

/* ─── CTA button ─────────────────────────────────────────── */

.sticky-purchase__ok {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  min-height: 68px;
  border-radius: 16px;
  border: 1px solid rgba(168, 224, 255, 0.56);
  padding: 12px 14px 12px 18px;
  background: linear-gradient(180deg, rgba(88, 150, 231, 0.96), rgba(46, 102, 184, 0.98));
  color: #f4f9ff;
  box-shadow:
    inset 0 1px 0 rgba(220, 236, 255, 0.28),
    0 12px 22px rgba(8, 18, 34, 0.42);
}

.sticky-purchase__ok::before {
  content: '';
  position: absolute;
  left: -20%;
  top: -50%;
  width: 52%;
  height: 200%;
  transform: rotate(16deg);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.22), transparent);
  pointer-events: none;
}

.sticky-purchase__ok-content {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 4px;
  text-align: left;
}

.sticky-purchase__ok-main {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: #f4f9ff;
}

.sticky-purchase__ok-sub {
  font-size: 13px;
  line-height: 1.3;
  color: rgba(225, 238, 255, 0.9);
}

.sticky-purchase__ok-arrow {
  position: relative;
  z-index: 1;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid rgba(229, 242, 255, 0.42);
  background: rgba(8, 24, 42, 0.18);
  color: #f2f8ff;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.sticky-purchase__ok:active {
  transform: translateY(1px);
  filter: brightness(0.95);
}

.sticky-purchase__ok:disabled {
  opacity: 0.48;
  pointer-events: none;
}

/* ─── Close (daily card style) ───────────────────────────── */

.sticky-purchase__close-wrap {
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

.sticky-purchase__close {
  width: 100%;
  min-height: 48px;
  border-radius: 12px;
  border: 1px solid rgba(156, 184, 235, 0.36);
  padding: 12px 14px;
  background: linear-gradient(180deg, rgba(28, 38, 58, 0.92), rgba(10, 15, 27, 0.98));
  color: #e9edf4;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: none;
  box-shadow: none;
}

.sticky-purchase__close:active {
  transform: translateY(1px);
  border-color: rgba(156, 184, 235, 0.28);
  filter: saturate(0.92);
}

/* ─── Media queries ───────────────────────────────────────── */

@media (min-width: 620px) {
  .sticky-purchase {
    left: 50%;
    right: auto;
    width: min(560px, calc(100vw - 22px));
    transform: translateX(-50%);
  }
}

@media (max-width: 460px) {
  .premium-content {
    padding-top: calc(44px + env(safe-area-inset-top));
    padding-bottom: calc(52px + env(safe-area-inset-bottom) + 292px);
    gap: 12px;
  }

  .premium-hero__title {
    font-size: clamp(24px, 7vw, 29px);
  }

  .premium-hero__sub {
    font-size: 13px;
  }

  .premium-card {
    padding: 12px;
  }

  .premium-focus__title {
    font-size: 20px;
  }

  .premium-focus__points {
    grid-template-columns: 1fr;
  }

  .plan-grid {
    grid-template-columns: 1fr;
  }

  .compare-table__row {
    padding: 11px;
  }

  .compare-table__stack {
    grid-template-columns: 1fr;
  }

  .compare-table__lead,
  .compare-table__summary,
  .compare-table__val {
    font-size: 12px;
  }

  .sticky-purchase {
    bottom: 12px;
  }

  .sticky-purchase__ok {
    min-height: 64px;
    border-radius: 16px;
  }

  .sticky-purchase__ok-main {
    font-size: 16px;
  }

  .sticky-purchase__ok-sub {
    font-size: 12px;
  }
}
</style>
