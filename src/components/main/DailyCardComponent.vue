<template>
  <q-page class="daily-page">
    <div class="daily-bg" aria-hidden="true"></div>

    <section
      ref="oracleActionsRef"
      class="oracle-actions oracle-actions--full"
      :style="{ '--card-scale': cardScale }"
    >
      <header class="daily-hero daily-hero--with-back">
        <button type="button" class="daily-back" @click="onBack">
          <q-icon name="chevron_left" size="18px" />
        </button>
        <div class="daily-hero__text">
          <div class="daily-title">{{ tt('dailyPage.title') }}</div>
          <div class="daily-kicker">{{ todayLabel }}</div>
        </div>
      </header>

      <div ref="dailyMainRef" class="daily-main">
        <section class="daily-card">
          <div class="daily-card__body">
            <div class="daily-card__media">
              <img
                :src="cardImage"
                :alt="cardTitle"
                :class="{ 'daily-card__img--reversed': orientation === 'reversed' }"
              />
            </div>

            <div class="daily-card__info">
              <div class="daily-card__name">{{ cardTitle }}</div>
              <div class="daily-card__meta">{{ cardSubtitle }}</div>

              <div class="daily-card__tags">
                <span class="daily-tag daily-tag--primary">{{ orientationLabel }}</span>
                <span v-for="word in cardKeywordsPreview" :key="word" class="daily-tag">{{
                  word
                }}</span>
              </div>
            </div>

            <div class="daily-meaning">
              <div class="daily-meaning__label">{{ tt('dailyPage.meaningLabel') }}</div>
              <div class="daily-meaning__text">{{ cardMeaning }}</div>
            </div>
          </div>
        </section>

        <section class="daily-panel daily-panel--guidance">
          <div class="daily-panel__header">
            <div class="daily-panel__icon">
              <q-icon name="wb_twilight" size="16px" />
            </div>
            <div class="daily-panel__title">{{ tt('dailyPage.guidanceLabel') }}</div>
          </div>
          <div class="daily-panel__text">{{ cardDescription }}</div>
        </section>

      </div>

      <div class="oracle-actions__footer">
        <button type="button" class="oracle-actions__ok" @click="onClose">
          {{ tt('common.close') }}
        </button>
      </div>
    </section>
  </q-page>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { t, currentLocale } from 'src/i18n'
import { loadTarotData } from 'src/helpers/tarotData'
import {
  getDeterministicDailyCardSelection,
  loadDailyCardsSnapshot,
} from 'src/helpers/dailyCardCore.js'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'
import { useAuthStore } from 'stores/authStore.js'
import { DAILY_ACTIVITY_KEYS, markDailyActivity } from 'src/helpers/dailyRitual'
import { trackRitualActivityWithGuestFallback } from 'src/helpers/ritualRewardsBackend.js'

const locale = computed(() => currentLocale.value || 'en')
const tt = (key) => t(locale.value, key)
const router = useRouter()
const authStore = useAuthStore()

const oracleActionsRef = ref(null)
const dailyMainRef = ref(null)
const cardScale = ref(1)
const cards = ref([])
const ANON_DAILY_SEED_KEY = 'arcana_daily_seed_v1'

const initializeDailyCardScreen = async () => {
  markDailyActivity(DAILY_ACTIVITY_KEYS.dailyCard)
  void trackRitualActivityWithGuestFallback(DAILY_ACTIVITY_KEYS.dailyCard, {
    source: 'daily_card_screen',
    userId: authStore.state.user?.id || '',
  })
  const { cards: nextCards, error } = await loadDailyCardsSnapshot({ loadTarotData })
  cards.value = nextCards
  if (error) {
    console.warn('[DailyCard] loadTarotData failed', error)
  }
  await nextTick()
  await fitCardToContent()
  window.addEventListener('resize', fitCardToContent, { passive: true })
}

const initializeDailyCardScreenSafe = async () => {
  try {
    await initializeDailyCardScreen()
  } catch (error) {
    cards.value = []
    console.warn('[DailyCard] init failed', error)
  }
}

onMounted(() => {
  void initializeDailyCardScreenSafe()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', fitCardToContent)
})

const todayKey = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getOrCreateAnonSeed = () => {
  if (typeof window === 'undefined') return 'anon'
  const stored = localStorage.getItem(ANON_DAILY_SEED_KEY)
  if (stored) return stored

  const next =
    (window.crypto &&
      typeof window.crypto.randomUUID === 'function' &&
      window.crypto.randomUUID()) ||
    `${Date.now()}-${Math.random().toString(36).slice(2)}`

  localStorage.setItem(ANON_DAILY_SEED_KEY, next)
  return next
}

const dailySelection = computed(() => {
  const userId = authStore.state.user?.id
  const identity = userId || getOrCreateAnonSeed()
  return getDeterministicDailyCardSelection({
    dateKey: todayKey(),
    identity,
    cardsLength: cards.value.length,
  })
})

const dailyIndex = computed(() => {
  return dailySelection.value.index
})

const orientation = computed(() => {
  return dailySelection.value.orientation
})

const dailyCard = computed(() => cards.value[dailyIndex.value] || null)
const cardTitle = computed(
  () => dailyCard.value?.name?.[locale.value] || dailyCard.value?.name?.en || '',
)
const cardSubtitle = computed(() => {
  const card = dailyCard.value
  if (!card) return ''
  if (card.arcana === 'major') return tt('cardsPage.major')
  return tt(`cardsPage.suits.${card.suit}`)
})
const cardImage = computed(() => `/images/cards/${dailyCard.value?.file || ''}`)
const cardKeywords = computed(
  () => dailyCard.value?.keywords?.[locale.value] || dailyCard.value?.keywords?.en || [],
)
const cardKeywordsPreview = computed(() => cardKeywords.value.slice(0, 3))
const cardMeaning = computed(
  () =>
    dailyCard.value?.meaning?.[orientation.value]?.[locale.value] ||
    dailyCard.value?.meaning?.[orientation.value]?.en ||
    '',
)
const cardDescription = computed(
  () =>
    dailyCard.value?.description?.[orientation.value]?.[locale.value] ||
    dailyCard.value?.description?.[orientation.value]?.en ||
    '',
)
const orientationLabel = computed(() =>
  orientation.value === 'upright' ? tt('cardsPage.upright') : tt('cardsPage.reversed'),
)

const todayLabel = computed(() => {
  const now = new Date()
  try {
    return new Intl.DateTimeFormat(locale.value, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(now)
  } catch (e) {
    console.error('[DailyCard] date format failed:', e)
    return now.toDateString()
  }
})

const hapticTap = async () => {
  if (!Capacitor.isNativePlatform()) return
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch (e) {
    console.error(e)
  }
}

const onBack = async () => {
  await hapticTap()
  // Go to the real previous route if there is one, otherwise fall back to
  // home — never strand the user on an unrelated screen (e.g. tarot).
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back()
    return
  }
  await router.replace({ name: 'arcana' })
}

const onClose = async () => {
  await onBack()
}

const fitCardToContent = async () => {
  cardScale.value = 1
  await nextTick()
}

watch(
  [cardMeaning, cardDescription, cardTitle, cardSubtitle, locale],
  async () => {
    await nextTick()
    fitCardToContent()
  },
  { flush: 'post' },
)
</script>

<style scoped lang="scss">
.daily-page {
  min-height: 100svh;
  height: 100svh;
  color: #e9edf4;
  position: relative;
  overflow: hidden;
}

.daily-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 40%, #050d15 100%);
  z-index: 0;
}

.oracle-actions {
  position: relative;
  z-index: 1;
  width: 100vw;
  max-width: 100vw;
  min-height: 100svh;
  height: 100svh;
  margin: 0 auto;
  border-radius: 0;
  padding: calc(90px + env(safe-area-inset-top, 0px)) 18px
    calc(env(safe-area-inset-bottom, 0px) + 18px);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 12px;
  color: #ffffff;
  pointer-events: auto;
  overflow: hidden;
  background: transparent;
  border: none;
  box-shadow: none;
  backdrop-filter: none;
}

.oracle-actions--full {
  border-radius: 0;
}

.daily-hero {
  display: grid;
  gap: 6px;
}

.daily-hero--with-back {
  position: relative;
  grid-template-columns: 1fr;
  align-items: center;
  justify-items: center;
  gap: 12px;
}

.daily-hero__text {
  text-align: center;
  display: grid;
  gap: 4px;
  justify-items: center;
  padding: 0 44px;
}

.daily-title {
  font-size: 22px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-weight: 600;
  color: rgba(235, 242, 255, 0.96);
}

.daily-kicker {
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: capitalize;
  color: rgba(214, 225, 242, 0.68);
}

.daily-back {
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

.daily-main {
  min-height: 0;
  height: 100%;
  display: grid;
  grid-template-rows: auto auto;
  align-content: start;
  gap: 12px;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

.daily-card {
  padding: 0;
}

.daily-card__body {
  display: grid;
  gap: 14px;
  text-align: center;
}

.daily-card__media {
  width: calc(min(44vw, 186px, 23vh) * var(--card-scale));
  aspect-ratio: 3 / 5;
  margin: 0 auto;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #ffffff;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.42);
}

.daily-card__media img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.daily-card__img--reversed {
  transform: rotate(180deg);
}

.daily-card__info {
  display: grid;
  gap: 10px;
}

.daily-meaning {
  border-radius: 14px;
  border: 1px solid rgba(173, 210, 255, 0.2);
  background: linear-gradient(
    120deg,
    rgba(110, 166, 255, 0.12) 0%,
    rgba(110, 166, 255, 0.04) 45%,
    rgba(8, 12, 20, 0.7) 100%
  );
  padding: 12px 13px 12px 14px;
  text-align: left;
  position: relative;
  overflow: hidden;
}

.daily-meaning::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 999px;
  background: rgba(173, 210, 255, 0.8);
}

.daily-meaning__label {
  font-size: 13px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(186, 208, 240, 0.84);
  font-weight: 600;
  margin-left: 8px;
  margin-bottom: 5px;
}

.daily-meaning__text {
  margin-left: 8px;
  font-size: 15px;
  line-height: 1.55;
  text-transform: none;
  color: rgba(224, 234, 251, 0.92);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
}

.daily-card__name {
  font-size: 16px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-weight: 600;
  color: rgba(235, 242, 255, 0.94);
  line-height: 1.3;
}

.daily-card__meta {
  font-size: 13px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.64);
}

.daily-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}

.daily-tag {
  padding: 5px 11px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(8, 12, 20, 0.7);
  font-size: 10px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.75);
  font-weight: 500;
}

.daily-tag--primary {
  border-color: rgba(173, 210, 255, 0.24);
  background: rgba(110, 166, 255, 0.12);
  color: rgba(173, 210, 255, 0.9);
}

.daily-panel {
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(160deg, rgba(14, 20, 32, 0.92), rgba(6, 10, 18, 0.98));
  box-shadow:
    0 10px 24px rgba(2, 6, 12, 0.42),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  display: grid;
  grid-template-rows: auto auto;
  gap: 10px;
}

.daily-panel--guidance {
  background: linear-gradient(160deg, rgba(12, 16, 28, 0.88), rgba(5, 8, 16, 0.95));
}

.daily-panel__header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.daily-panel__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(8, 12, 20, 0.78);
  border: 1px solid rgba(173, 210, 255, 0.16);
  color: rgba(173, 210, 255, 0.9);
}

.daily-panel__title {
  font-size: 13px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.74);
  font-weight: 600;
}

.daily-panel__text {
  font-size: 15px;
  line-height: 1.55;
  text-transform: none;
  color: rgba(224, 234, 251, 0.9);
}

.daily-panel__text--compact {
  font-size: 13px;
  color: rgba(214, 225, 242, 0.84);
}

.daily-loop-next {
  font-size: 12px;
  color: rgba(173, 210, 255, 0.88);
  letter-spacing: 0.03em;
}

.daily-streak-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.daily-streak-pill {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(173, 210, 255, 0.26);
  background: rgba(110, 166, 255, 0.12);
  color: rgba(224, 234, 251, 0.94);
  font-size: 12px;
  letter-spacing: 0.02em;
}

.daily-streak-best {
  font-size: 11px;
  color: rgba(214, 225, 242, 0.68);
}

.daily-loop-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.daily-loop-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
}

.daily-loop-item__left {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.daily-loop-item__icon {
  color: rgba(214, 225, 242, 0.42);
}

.daily-loop-item__icon--done {
  color: rgba(173, 210, 255, 0.94);
}

.daily-loop-item__label {
  color: rgba(224, 234, 251, 0.9);
}

.daily-loop-item__status {
  color: rgba(214, 225, 242, 0.62);
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.daily-loop-item__right {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.daily-loop-item__streak {
  font-size: 10px;
  letter-spacing: 0.02em;
  color: rgba(173, 210, 255, 0.86);
}

.daily-loop-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.daily-loop-btn {
  min-height: 36px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(9, 13, 21, 0.7);
  color: rgba(224, 234, 251, 0.9);
  font-size: 12px;
  letter-spacing: 0.02em;
  padding: 8px 10px;
}

.daily-loop-btn--primary {
  border-color: rgba(156, 184, 235, 0.36);
  background: linear-gradient(180deg, rgba(28, 38, 58, 0.92), rgba(10, 15, 27, 0.98));
}

.daily-loop-reminder {
  font-size: 11px;
  color: rgba(214, 225, 242, 0.6);
  line-height: 1.45;
}

.daily-progress-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 11px;
  color: rgba(214, 225, 242, 0.7);
}

.daily-progress-track {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
}

.daily-progress-day {
  display: grid;
  justify-items: center;
  gap: 4px;
  padding: 6px 2px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.daily-progress-day__label {
  font-size: 10px;
  color: rgba(214, 225, 242, 0.5);
  letter-spacing: 0.04em;
}

.daily-progress-day__dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: rgba(214, 225, 242, 0.3);
}

.daily-progress-day--active .daily-progress-day__dot {
  background: rgba(173, 210, 255, 0.82);
}

.daily-progress-day--full {
  border-color: rgba(173, 210, 255, 0.28);
  background: rgba(110, 166, 255, 0.08);
}

.daily-progress-day--today {
  box-shadow: inset 0 0 0 1px rgba(173, 210, 255, 0.34);
}

.daily-progress-day--today .daily-progress-day__label {
  color: rgba(224, 234, 251, 0.9);
}

.oracle-actions__footer {
  margin-top: auto;
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

.oracle-actions__ok {
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

.oracle-actions__ok:active {
  transform: translateY(1px);
  border-color: rgba(156, 184, 235, 0.28);
  filter: saturate(0.92);
}

@media (max-height: 760px) {
  .daily-main {
    gap: 10px;
  }

  .daily-card__media {
    width: calc(min(40vw, 164px, 20vh) * var(--card-scale));
  }

  .daily-panel__text {
    font-size: 15px;
  }

  .daily-meaning__text {
    -webkit-line-clamp: 3;
  }
}

@media (max-height: 680px) {
  .daily-title {
    font-size: 19px;
  }

  .daily-kicker {
    font-size: 13px;
    letter-spacing: 0.04em;
  }

  .daily-card__name {
    font-size: 14px;
  }

  .daily-card__media {
    width: calc(min(36vw, 146px, 18vh) * var(--card-scale));
  }

  .daily-tag {
    font-size: 9px;
    padding: 4px 9px;
  }

  .daily-panel {
    padding: 8px 10px;
    gap: 6px;
  }

  .daily-panel__title {
    font-size: 9px;
  }

  .daily-panel__text {
    font-size: 15px;
  }

  .daily-meaning {
    padding: 8px 9px 8px 10px;
  }

  .daily-meaning__label {
    font-size: 9px;
    margin-bottom: 3px;
  }

  .daily-meaning__text {
    font-size: 15px;
    -webkit-line-clamp: 2;
  }

  .daily-loop-btn {
    min-height: 32px;
    font-size: 11px;
  }
}
</style>
