<template>
  <q-page class="premium-page">
    <div class="premium-bg" aria-hidden="true"></div>

    <div class="premium-content">
      <header class="premium-header">
        <button type="button" class="premium-back" @click="onBack">
          <q-icon name="chevron_left" size="18px" />
        </button>
        <div class="premium-header__text">
          <div class="premium-header__kicker">{{ tt('premiumPage.header.kicker') }}</div>
          <h1 class="premium-title">{{ tt('premiumPage.title') }}</h1>
          <p class="premium-subtitle">{{ tt('premiumPage.subtitle') }}</p>
        </div>
        <span class="premium-header__spacer" aria-hidden="true"></span>
      </header>

      <section class="premium-card premium-card--model">
        <div class="premium-card__label">{{ tt('premiumPage.accessModel.title') }}</div>
        <div class="premium-model-list">
          <article v-for="row in paywallAccessRows" :key="row.key" class="premium-model-row">
            <div class="premium-model-row__label">{{ row.label }}</div>
            <div class="premium-model-row__text">{{ row.text }}</div>
          </article>
        </div>
      </section>

      <section class="premium-card premium-card--vision">
        <div class="premium-card__label">{{ tt('premiumPage.sections.why') }}</div>
        <p class="premium-vision">{{ tt('premiumPage.whyLead') }}</p>
        <ul class="reason-list">
          <li v-for="item in reasonItems" :key="item.titleKey" class="reason-item">
            <div class="reason-item__icon">
              <q-icon :name="item.icon" size="14px" />
            </div>
            <div class="reason-item__body">
              <div class="reason-item__title">{{ tt(item.titleKey) }}</div>
              <p class="reason-item__text">{{ tt(item.textKey) }}</p>
            </div>
          </li>
        </ul>
      </section>

      <section class="premium-card premium-card--plans">
        <div class="premium-card__label">{{ tt('premiumPage.sections.billing') }}</div>
        <p class="plan-intro">{{ tt('premiumPage.billing.includesTitle') }}</p>
        <div class="plan-includes" role="list" aria-label="Plan features">
          <span v-for="key in billingIncludeKeys" :key="key" class="plan-include" role="listitem">
            <q-icon name="check" size="12px" />
            <span>{{ tt(key) }}</span>
          </span>
        </div>
        <div class="plan-grid">
          <button
            v-for="plan in billingPlans"
            :key="plan.id"
            type="button"
            class="plan-tile"
            :class="{ 'plan-tile--active': selectedPlanId === plan.id }"
            :disabled="isBillingActionPending || !billingReady"
            @click="onSelectPlan(plan.id)"
          >
            <span class="plan-tile__head">
              <span class="plan-tile__title">{{ tt(plan.titleKey) }}</span>
              <span class="plan-tile__dot">
                <q-icon v-if="selectedPlanId === plan.id" name="check" size="11px" />
              </span>
            </span>
            <span class="plan-tile__price">{{ getPlanPriceLabel(plan.id) }}</span>
            <span v-if="getPlanOfferLabel(plan.id)" class="plan-tile__saving">{{ getPlanOfferLabel(plan.id) }}</span>
            <span class="plan-tile__note">{{ tt(plan.noteKey) }}</span>
          </button>
        </div>
      </section>

      <section class="premium-card premium-card--compare">
        <div class="premium-card__label">{{ tt('premiumPage.sections.compare') }}</div>
        <div class="compare-stack">
          <article v-for="row in quickCompareRows" :key="row.featureKey" class="compare-row">
            <div class="compare-row__feature">{{ tt(row.featureKey) }}</div>
            <div class="compare-row__values">
              <div class="compare-pill compare-pill--free">
                <span>{{ tt('premiumPage.compare.free') }}</span>
                <strong>{{ tt(row.freeKey) }}</strong>
              </div>
              <div class="compare-pill compare-pill--premium">
                <span>{{ tt('premiumPage.compare.premium') }}</span>
                <strong>{{ tt(row.premiumKey) }}</strong>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="premium-card premium-card--premium">
        <div class="premium-card__label">{{ tt('premiumPage.sections.premium') }}</div>
        <ul class="feature-list">
          <li v-for="item in premiumDetailItems" :key="item.titleKey" class="feature-item">
            <div class="feature-item__icon">
              <q-icon :name="item.icon" size="15px" />
            </div>
            <div class="feature-item__body">
              <div class="feature-item__title">{{ tt(item.titleKey) }}</div>
              <p class="feature-item__text">{{ tt(item.textKey) }}</p>
            </div>
          </li>
        </ul>
      </section>

      <section class="premium-card premium-card--free">
        <div class="premium-card__label">{{ tt('premiumPage.sections.free') }}</div>
        <div class="free-grid">
          <div v-for="key in freeItemKeys" :key="key" class="free-chip">
            <q-icon name="check_circle" size="14px" class="free-chip__icon" />
            <span>{{ tt(key) }}</span>
          </div>
        </div>
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
          <button type="button" class="legal-link" :disabled="isBillingActionPending || !billingReady" @click="onRestore">
            {{ restoreButtonLabel }}
          </button>
        </div>
        <p class="premium-footnote">{{ tt('premiumPage.billing.footnote') }}</p>
      </div>
    </div>

    <div class="sticky-purchase">
      <div class="sticky-purchase__halo" aria-hidden="true"></div>
      <div class="sticky-purchase__topline">
        <q-icon name="diamond" size="13px" />
        <span>{{ tt('premiumPage.billing.selectedLabel') }}</span>
      </div>

      <div class="sticky-purchase__meta">
        <div class="sticky-plan-switch">
          <button
            v-for="plan in billingPlans"
            :key="`sticky-${plan.id}`"
            type="button"
            class="sticky-plan-switch__item"
            :class="{ 'sticky-plan-switch__item--active': selectedPlanId === plan.id }"
            :disabled="isBillingActionPending || !billingReady"
            @click="onSelectPlan(plan.id)"
          >
            <span
              class="sticky-plan-switch__check"
              :class="{ 'sticky-plan-switch__check--active': selectedPlanId === plan.id }"
            >
              <q-icon v-if="selectedPlanId === plan.id" name="check" size="10px" />
            </span>
            <span class="sticky-plan-switch__text">
              <span class="sticky-plan-switch__label">{{ tt(plan.buttonLabelKey) }}</span>
              <span class="sticky-plan-switch__price-row">
                <span class="sticky-plan-switch__value">{{ getPlanPriceLabel(plan.id) }}</span>
              </span>
            </span>
            <span v-if="getPlanOfferLabel(plan.id)" class="sticky-plan-switch__save-badge">
              {{ getPlanOfferLabel(plan.id) }}
            </span>
          </button>
        </div>
      </div>

      <div class="sticky-purchase__footer">
        <button type="button" class="sticky-purchase__ok" :disabled="purchaseDisabled" @click="onPurchase">
          <span class="sticky-purchase__ok-content">
            <span class="sticky-purchase__ok-main">{{
              isPurchasing ? tt('premiumPage.billing.processing') : tt('premiumPage.billing.button')
            }}</span>
            <span class="sticky-purchase__ok-sub"
              >{{ purchaseSubline }}</span
            >
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
import {
  getPremiumBillingIncludeKeys,
  getPremiumDetailItems,
  PREMIUM_COMPARE_ROWS,
  PREMIUM_FREE_ITEM_KEYS,
} from 'src/constants/premiumModel'
import { PAYWALL_FUNNEL_EVENTS } from 'src/constants/analyticsEvents'
import { analytics } from 'src/services/analytics'
import { loadPremiumBootstrapSnapshot } from 'src/helpers/premiumBootstrapCore.js'

const locale = computed(() => currentLocale.value || 'en')
const tt = (key) => t(locale.value, key)
const router = useRouter()
const route = useRoute()
const $q = useQuasar()
const tarotAiEnabled = import.meta.env.VITE_ENABLE_TAROT_AI === 'true'
const {
  state: premiumState,
  hasPremiumAccess,
  premiumPlan,
  revokePremiumAccess,
  applyPremiumAccessStatus,
} = usePremiumAccess()
const selectedPlanId = ref(premiumPlan.value)
const billingCatalog = ref({
  monthly: { priceLabel: '', offerLabel: '' },
  yearly: { priceLabel: '', offerLabel: '' },
})
const isPurchasing = ref(false)
const isRestoring = ref(false)
const billingReady = ref(true)
const paywallCloseReason = ref('route_change')
const paywallCloseLogged = ref(false)
const purchaseCompleted = ref(false)

const freeItemKeys = PREMIUM_FREE_ITEM_KEYS
const billingIncludeKeys = computed(() => getPremiumBillingIncludeKeys({ tarotAiEnabled }))
const premiumDetailItems = computed(() => getPremiumDetailItems({ tarotAiEnabled }))

const reasonItems = [
  {
    icon: 'filter_alt',
    titleKey: 'premiumPage.reasons.clarityTitle',
    textKey: 'premiumPage.reasons.clarityText',
  },
  {
    icon: 'history',
    titleKey: 'premiumPage.reasons.consistencyTitle',
    textKey: 'premiumPage.reasons.consistencyText',
  },
  {
    icon: 'track_changes',
    titleKey: 'premiumPage.reasons.depthTitle',
    textKey: 'premiumPage.reasons.depthText',
  },
]

const quickCompareRows = PREMIUM_COMPARE_ROWS
const paywallAccessRows = computed(() => {
  const purchaseText = billingReady.value
    ? `${tt('premiumPage.accessModel.purchasePrefix')} ${tt(selectedPlan.value.titleKey)} · ${getPlanPriceLabel(selectedPlan.value.id)}`
    : `${tt('premiumPage.accessModel.purchasePrefix')} ${tt('premiumPage.billing.unavailableHint')}`

  return [
    {
      key: 'free',
      label: tt('premiumAccess.model.labels.free'),
      text: tt('premiumPage.accessModel.free'),
    },
    {
      key: 'premium',
      label: tt('premiumAccess.model.labels.premium'),
      text: tt('premiumPage.accessModel.premium'),
    },
    {
      key: 'purchase',
      label: tt('premiumAccess.model.labels.purchase'),
      text: purchaseText,
    },
  ]
})

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
  return String(billingCatalog.value?.[planId]?.offerLabel || '').trim()
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
  return /(trial|free|пробн|безкоштов)/.test(text)
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
const purchaseDisabled = computed(() => isBillingActionPending.value || !billingReady.value)
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
  if (isBillingActionPending.value || !billingReady.value) return
  selectedPlanId.value = id
  await hapticTap()
}

const resolveBillingErrorMessage = (reason, mode = 'purchase') => {
  const normalized = String(reason || '').toLowerCase()
  if (normalized === 'network_error') return tt('premiumPage.billing.errors.network')
  if (normalized === 'missing_api_key' || normalized === 'configure_failed' || normalized === 'plugin_missing') {
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

const onPurchase = async () => {
  if (purchaseDisabled.value) {
    if (!billingReady.value) {
      $q.notify({
        message: tt('premiumPage.billing.errors.unavailable'),
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
      billingReady.value = true
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
      billingReady.value = false
      logPaywallEvent(PAYWALL_FUNNEL_EVENTS.purchaseError, { reason: String(result.reason || 'unavailable') })
      $q.notify({
        message: resolveBillingErrorMessage(result.reason, 'purchase'),
        color: 'dark',
        textColor: 'white',
        position: 'bottom',
      })
      return
    }

    billingReady.value = true
    logPaywallEvent(PAYWALL_FUNNEL_EVENTS.purchaseError, { reason: String(result.reason || 'unknown') })
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
        message: tt('premiumPage.billing.errors.restoreUnavailable'),
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
      billingReady.value = false
      $q.notify({
        message: resolveBillingErrorMessage(result.reason, 'restore'),
        color: 'dark',
        textColor: 'white',
        position: 'bottom',
      })
      return
    }

    billingReady.value = true
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
  billingReady.value = snapshot.billingReady

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
    billingReady.value = false
    console.warn('[Premium] billing bootstrap failed', error)
  }
}

onMounted(() => {
  void initializePremiumBillingStateSafe()
})

onBeforeUnmount(() => {
  markPaywallClose(paywallCloseReason.value || 'route_change')
})

const selectedPlan = computed(() => {
  return billingPlans.find((item) => item.id === selectedPlanId.value) || billingPlans[0]
})

const purchaseSubline = computed(() => {
  if (!billingReady.value) {
    return tt('premiumPage.billing.unavailableHint')
  }
  return `${tt(selectedPlan.value.titleKey)} · ${getPlanPriceLabel(selectedPlan.value.id)}`
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
  padding: calc(90px + env(safe-area-inset-top)) 18px
    calc(32px + env(safe-area-inset-bottom) + 260px);
  max-width: 560px;
  margin: 0 auto;
  display: grid;
  gap: 12px;
}

.premium-header {
  position: relative;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 34px;
  align-items: start;
  column-gap: 10px;
  border: 1px solid transparent;
  border-radius: 20px;
  background:
    linear-gradient(165deg, rgba(7, 11, 19, 0.95), rgba(4, 7, 13, 0.98)) padding-box,
    linear-gradient(
        132deg,
        rgba(147, 203, 255, 0.38),
        rgba(127, 162, 226, 0.24),
        rgba(147, 203, 255, 0.1)
      )
      border-box;
  box-shadow:
    0 16px 30px rgba(0, 0, 0, 0.34),
    inset 0 1px 0 rgba(186, 207, 247, 0.08);
  padding: 14px 14px 13px;
}

.premium-header::before {
  content: '';
  position: absolute;
  left: 14px;
  right: 14px;
  top: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    rgba(186, 207, 247, 0),
    rgba(186, 207, 247, 0.54),
    rgba(186, 207, 247, 0)
  );
  pointer-events: none;
}

.premium-header__text {
  display: grid;
  gap: 7px;
  justify-items: center;
  text-align: center;
  padding: 1px 4px 0;
}

.premium-header__kicker {
  font-size: 11px;
  line-height: 1.25;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(187, 206, 237, 0.72);
  font-weight: 620;
}

.premium-title {
  margin: 0;
  font-size: clamp(25px, 6vw, 31px);
  letter-spacing: 0.01em;
  line-height: 1.08;
  text-transform: none;
}

.premium-subtitle {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  letter-spacing: 0.01em;
  text-transform: none;
  color: rgba(211, 224, 244, 0.86);
  max-width: 38ch;
}

.premium-back {
  position: relative;
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

.premium-header__spacer {
  width: 34px;
  height: 34px;
  visibility: hidden;
}

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
  padding: 14px 14px 14px 14px;
  display: grid;
  gap: 12px;
  position: relative;
  overflow: hidden;
  box-shadow:
    inset 0 1px 0 rgba(186, 207, 247, 0.08),
    0 12px 24px rgba(0, 0, 0, 0.3);
}

.premium-model-list {
  display: grid;
  gap: 8px;
}

.premium-model-row {
  display: grid;
  gap: 3px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(186, 207, 247, 0.14);
  background: rgba(7, 12, 20, 0.44);
}

.premium-model-row__label {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(173, 210, 255, 0.86);
  font-weight: 620;
}

.premium-model-row__text {
  font-size: 12px;
  line-height: 1.45;
  color: rgba(219, 231, 250, 0.88);
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

.premium-card--vision {
  padding-top: 14px;
}

.premium-vision {
  margin: 0;
  font-size: 16px;
  line-height: 1.45;
  color: rgba(217, 229, 247, 0.86);
}

.reason-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 9px;
}

.reason-item {
  border: 1px solid rgba(156, 183, 230, 0.26);
  border-radius: 12px;
  background: rgba(12, 19, 31, 0.66);
  padding: 11px;
  display: grid;
  grid-template-columns: 24px 1fr;
  gap: 9px;
}

.reason-item__icon {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  border: 1px solid rgba(156, 183, 230, 0.38);
  background: rgba(16, 24, 38, 0.78);
  color: rgba(214, 225, 242, 0.9);
  display: grid;
  place-items: center;
}

.reason-item__body {
  display: grid;
  gap: 5px;
}

.reason-item__title {
  font-size: 14px;
  color: rgba(239, 245, 255, 0.94);
  line-height: 1.35;
  font-weight: 600;
}

.reason-item__text {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: rgba(201, 216, 240, 0.78);
}

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
}

.plan-intro {
  margin: 0;
  font-size: 15px;
  line-height: 1.45;
  color: rgba(218, 229, 246, 0.9);
}

.plan-includes {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.plan-include {
  border-radius: 10px;
  border: 1px solid rgba(156, 183, 230, 0.24);
  background: rgba(11, 18, 31, 0.6);
  padding: 8px 9px;
  display: flex;
  align-items: center;
  gap: 7px;
  color: rgba(221, 234, 251, 0.88);
  font-size: 12px;
  line-height: 1.35;
}

.plan-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.plan-tile {
  width: 100%;
  text-align: left;
  border-radius: 13px;
  border: 1px solid rgba(156, 183, 230, 0.28);
  background: rgba(14, 22, 36, 0.72);
  padding: 12px;
  display: grid;
  gap: 7px;
  color: rgba(233, 241, 255, 0.9);
  transition:
    border-color 150ms ease,
    background 150ms ease,
    transform 150ms ease;
}

.plan-tile--active {
  border-color: rgba(148, 208, 255, 0.74);
  background: linear-gradient(165deg, rgba(87, 150, 231, 0.26), rgba(27, 62, 122, 0.32));
  box-shadow:
    0 0 0 1px rgba(148, 208, 255, 0.22),
    0 10px 18px rgba(0, 0, 0, 0.24);
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
  color: rgba(232, 240, 254, 0.94);
  font-weight: 650;
}

.plan-tile__dot {
  width: 17px;
  height: 17px;
  border-radius: 999px;
  border: 1px solid rgba(190, 210, 242, 0.44);
  color: transparent;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}

.plan-tile--active .plan-tile__dot {
  border-color: rgba(146, 205, 255, 0.88);
  background: rgba(147, 203, 255, 0.34);
  color: rgba(225, 235, 249, 0.96);
}

.plan-tile__price {
  font-size: 22px;
  line-height: 1.2;
  color: rgba(235, 242, 255, 0.96);
  font-weight: 670;
}

.plan-tile__saving {
  justify-self: start;
  border-radius: 999px;
  padding: 2px 6px;
  font-size: 12px;
  line-height: 1.3;
  color: rgba(219, 232, 253, 0.93);
  font-weight: 600;
  border: 1px solid rgba(141, 201, 255, 0.62);
  background: rgba(147, 203, 255, 0.28);
}

.plan-tile__note {
  font-size: 13px;
  line-height: 1.4;
  color: rgba(203, 219, 243, 0.8);
}

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
}

.compare-stack {
  display: grid;
  gap: 9px;
}

.compare-row {
  border-radius: 12px;
  border: 1px solid rgba(156, 183, 230, 0.22);
  background: rgba(12, 19, 31, 0.62);
  padding: 11px;
  display: grid;
  gap: 8px;
}

.compare-row__feature {
  font-size: 14px;
  color: rgba(231, 239, 252, 0.94);
  font-weight: 600;
}

.compare-row__values {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.compare-pill {
  border-radius: 10px;
  border: 1px solid rgba(156, 183, 230, 0.22);
  background: rgba(10, 16, 28, 0.68);
  padding: 9px;
  display: grid;
  gap: 2px;
}

.compare-pill span {
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(192, 208, 233, 0.72);
  font-weight: 600;
}

.compare-pill strong {
  font-size: 14px;
  line-height: 1.34;
  color: rgba(233, 241, 254, 0.94);
  font-weight: 600;
}

.compare-pill--premium {
  border-color: rgba(141, 201, 255, 0.58);
  background: rgba(147, 203, 255, 0.24);
}

.premium-card--premium {
  background:
    radial-gradient(120% 140% at 100% 0, rgba(147, 203, 255, 0.14), rgba(147, 203, 255, 0)),
    linear-gradient(165deg, rgba(8, 12, 20, 0.9), rgba(4, 6, 12, 0.96)) padding-box,
    linear-gradient(
        132deg,
        rgba(147, 203, 255, 0.34),
        rgba(127, 162, 226, 0.2),
        rgba(147, 203, 255, 0.1)
      )
      border-box;
}

.feature-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 9px;
}

.feature-item {
  border-radius: 12px;
  border: 1px solid rgba(156, 183, 230, 0.24);
  background: rgba(12, 19, 31, 0.66);
  padding: 11px;
  display: grid;
  grid-template-columns: 25px 1fr;
  gap: 10px;
}

.feature-item__icon {
  width: 25px;
  height: 25px;
  border-radius: 8px;
  border: 1px solid rgba(156, 183, 230, 0.38);
  background: rgba(16, 24, 38, 0.78);
  color: rgba(214, 225, 242, 0.9);
  display: grid;
  place-items: center;
}

.feature-item__body {
  display: grid;
  gap: 5px;
}

.feature-item__title {
  font-size: 14px;
  line-height: 1.35;
  color: rgba(236, 243, 254, 0.94);
  font-weight: 600;
}

.feature-item__text {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  color: rgba(201, 216, 239, 0.8);
}

.premium-card--free {
  background:
    radial-gradient(120% 140% at 0% 0, rgba(147, 203, 255, 0.1), rgba(147, 203, 255, 0)),
    linear-gradient(165deg, rgba(8, 12, 20, 0.9), rgba(4, 6, 12, 0.96)) padding-box,
    linear-gradient(
        132deg,
        rgba(147, 203, 255, 0.24),
        rgba(127, 162, 226, 0.16),
        rgba(147, 203, 255, 0.08)
      )
      border-box;
}

.free-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.free-chip {
  border-radius: 11px;
  border: 1px solid rgba(156, 183, 230, 0.22);
  background: rgba(12, 19, 31, 0.62);
  padding: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(225, 234, 248, 0.9);
  font-size: 14px;
  line-height: 1.35;
}

.free-chip__icon {
  color: rgba(138, 226, 171, 0.96);
}

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
  color: rgba(208, 222, 245, 0.86);
  font-size: 14px;
  line-height: 1.35;
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
  font-size: 12px;
  color: rgba(175, 194, 224, 0.78);
  line-height: 1.45;
  text-align: center;
}

.sticky-purchase {
  position: fixed;
  left: 14px;
  right: 14px;
  bottom: 0;
  z-index: 4;
  border: 1px solid transparent;
  border-radius: 20px;
  background:
    linear-gradient(165deg, rgba(8, 12, 20, 0.98), rgba(4, 6, 12, 0.99)) padding-box,
    linear-gradient(
        132deg,
        rgba(147, 203, 255, 0.46),
        rgba(127, 162, 226, 0.28),
        rgba(147, 203, 255, 0.14)
      )
      border-box;
  box-shadow:
    0 20px 44px rgba(0, 0, 0, 0.52),
    inset 0 1px 0 rgba(186, 207, 247, 0.1);
  backdrop-filter: blur(15px);
  padding: 10px 10px calc(10px + env(safe-area-inset-bottom));
  display: grid;
  gap: 8px;
  overflow: hidden;
}

.sticky-purchase__halo {
  display: none;
}

.sticky-purchase::before {
  content: '';
  position: absolute;
  left: 10px;
  right: 10px;
  top: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    rgba(186, 207, 247, 0),
    rgba(186, 207, 247, 0.66),
    rgba(186, 207, 247, 0)
  );
  pointer-events: none;
}

.sticky-purchase::after {
  content: '';
  position: absolute;
  left: 50%;
  top: -34px;
  width: 64%;
  height: 58px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: radial-gradient(
    60% 100% at 50% 100%,
    rgba(147, 203, 255, 0.28),
    rgba(147, 203, 255, 0)
  );
  pointer-events: none;
}

.sticky-purchase__topline {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: 9px;
  font-weight: 680;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: rgba(207, 222, 246, 0.76);
}

.sticky-purchase__meta {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 6px;
  border-radius: 14px;
  border: 1px solid rgba(156, 183, 230, 0.2);
  background: rgba(8, 13, 22, 0.66);
  padding: 8px;
}

.sticky-plan-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.sticky-plan-switch__item {
  border: 1px solid rgba(156, 183, 230, 0.36);
  border-radius: 12px;
  background: rgba(16, 24, 38, 0.78);
  min-height: 56px;
  padding: 9px 10px 8px;
  display: grid;
  grid-template-columns: 14px 1fr;
  align-items: center;
  gap: 7px;
  color: rgba(224, 234, 247, 0.9);
  transition:
    border-color 150ms ease,
    background 150ms ease,
    transform 150ms ease;
  position: relative;
}

.sticky-plan-switch__item--active {
  border-color: rgba(148, 208, 255, 0.72);
  background: linear-gradient(165deg, rgba(87, 150, 231, 0.26), rgba(27, 62, 122, 0.32));
  color: rgba(231, 240, 255, 0.98);
  transform: translateY(-0.5px);
  box-shadow:
    inset 0 1px 0 rgba(214, 229, 255, 0.22),
    0 10px 18px rgba(0, 0, 0, 0.24);
}

.sticky-plan-switch__item:disabled {
  opacity: 0.54;
  pointer-events: none;
}

.sticky-plan-switch__check {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 1px solid rgba(186, 204, 232, 0.62);
  color: transparent;
  display: grid;
  place-items: center;
}

.sticky-plan-switch__check--active {
  border-color: rgba(146, 205, 255, 0.88);
  color: rgba(232, 244, 255, 0.98);
  background: rgba(147, 203, 255, 0.34);
}

.sticky-plan-switch__text {
  display: grid;
  gap: 3px;
  justify-items: start;
  min-width: 0;
  padding-right: 48px;
}

.sticky-plan-switch__label {
  font-size: 12px;
  line-height: 1.2;
  font-weight: 650;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.sticky-plan-switch__price-row {
  display: block;
  min-width: 0;
}

.sticky-plan-switch__value {
  font-size: 16px;
  line-height: 1.1;
  color: rgba(229, 239, 255, 0.96);
  font-weight: 700;
  white-space: nowrap;
}

.sticky-plan-switch__save-badge {
  position: absolute;
  top: 7px;
  right: 7px;
  border-radius: 999px;
  padding: 2px 7px;
  font-size: 9px;
  line-height: 1.1;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border: 1px solid rgba(141, 201, 255, 0.62);
  background: rgba(147, 203, 255, 0.28);
  color: rgba(234, 245, 255, 0.98);
  white-space: nowrap;
}

.sticky-purchase__footer {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 7px;
}

.sticky-purchase__ok {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  min-height: 56px;
  border-radius: 14px;
  border: 1px solid rgba(168, 224, 255, 0.72);
  padding: 10px 11px 10px 13px;
  background: linear-gradient(180deg, rgba(88, 150, 231, 0.96), rgba(46, 102, 184, 0.98));
  color: #081423;
  box-shadow:
    inset 0 1px 0 rgba(220, 236, 255, 0.28),
    0 12px 22px rgba(8, 18, 34, 0.42);
}

.sticky-purchase__ok::before {
  content: '';
  position: absolute;
  left: -30%;
  top: -55%;
  width: 58%;
  height: 220%;
  transform: rotate(18deg);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.32), rgba(255, 255, 255, 0));
  pointer-events: none;
}

.sticky-purchase__ok-content {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 2px;
  text-align: left;
}

.sticky-purchase__ok-main {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: #f4f9ff;
}

.sticky-purchase__ok-sub {
  font-size: 11px;
  line-height: 1.25;
  letter-spacing: 0.02em;
  color: rgba(225, 238, 255, 0.9);
}

.sticky-purchase__ok-arrow {
  position: relative;
  z-index: 1;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid rgba(229, 242, 255, 0.42);
  background: rgba(8, 24, 42, 0.18);
  color: #f2f8ff;
  display: grid;
  place-items: center;
}

.sticky-purchase__ok:active {
  transform: translateY(1px);
  filter: brightness(0.95);
}

.sticky-purchase__ok:disabled {
  opacity: 0.55;
  pointer-events: none;
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

.sticky-purchase__close-wrap {
  width: 100%;
  margin-top: 1px;
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

.sticky-purchase__close:active {
  transform: translateY(1px);
  border-color: rgba(156, 184, 235, 0.28);
  filter: saturate(0.92);
}

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
    padding-top: calc(76px + env(safe-area-inset-top));
    gap: 12px;
  }

  .premium-header {
    padding: 13px 12px 12px;
    grid-template-columns: 32px minmax(0, 1fr) 32px;
  }

  .premium-header__text {
    gap: 6px;
    padding: 1px 2px 0;
  }

  .premium-title {
    font-size: clamp(24px, 7vw, 29px);
  }

  .premium-subtitle {
    font-size: 13px;
  }

  .premium-back,
  .premium-header__spacer {
    width: 32px;
    height: 32px;
  }

  .premium-card {
    padding: 14px;
  }

  .plan-includes {
    grid-template-columns: 1fr;
  }

  .plan-grid {
    grid-template-columns: 1fr;
  }

  .compare-row__values {
    grid-template-columns: 1fr;
  }

  .sticky-purchase {
    left: 14px;
    right: 14px;
    padding: 10px;
    border-radius: 16px;
  }

  .sticky-plan-switch__item {
    min-height: 46px;
    padding: 7px 8px;
  }

  .sticky-plan-switch__label {
    font-size: 11px;
  }

  .sticky-plan-switch__value {
    font-size: 14px;
  }

  .sticky-plan-switch__save-badge {
    font-size: 8px;
    padding: 2px 5px;
  }

  .sticky-purchase__ok-main {
    font-size: 14px;
  }

  .sticky-purchase__ok-sub {
    font-size: 10px;
  }
}
</style>
