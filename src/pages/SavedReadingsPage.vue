<template>
  <q-page class="readings-page">
    <div class="readings-bg" aria-hidden="true"></div>

    <div class="readings-content">
      <header class="readings-hero readings-hero--with-back">
        <button type="button" class="readings-back" @click="onBack">
          <q-icon name="chevron_left" size="18px" />
        </button>
        <div class="readings-hero__text">
          <div class="readings-title">{{ tt('readingsPage.title') }}</div>
          <div class="readings-kicker">{{ tt('readingsPage.subtitle') }}</div>
        </div>
      </header>

      <section v-if="!hasPremiumAccess" class="readings-lock">
        <div class="readings-lock__badge">{{ tt('premiumAccess.badge') }}</div>
        <div class="readings-lock__title">{{ tt('premiumAccess.readings.title') }}</div>
        <p class="readings-lock__text">{{ tt('premiumAccess.readings.text') }}</p>
        <div class="readings-lock__model">
          <div v-for="row in readingsAccessModelRows" :key="row.key" class="readings-lock__model-row">
            <span class="readings-lock__model-label">{{ row.label }}</span>
            <span class="readings-lock__model-text">{{ row.text }}</span>
          </div>
        </div>
        <ul class="readings-lock__bullets">
          <li v-for="item in readingsLockBullets" :key="item" class="readings-lock__bullet">
            {{ item }}
          </li>
        </ul>
        <div class="readings-lock__preview">
          <div class="readings-lock__stack" aria-hidden="true">
            <span class="readings-lock__thumb"></span>
            <span class="readings-lock__thumb"></span>
            <span class="readings-lock__thumb"></span>
          </div>
          <div class="readings-lock__meta">
            <span>{{ tt('readingsPage.spread1') }}</span>
            <span>{{ tt('readingsPage.spread3') }}</span>
            <span>{{ tt('readingsPage.spread5') }}</span>
          </div>
        </div>
        <button type="button" class="readings-lock__cta" @click="goPremium">
          <q-icon name="workspace_premium" size="16px" />
          <span>{{ tt('premiumAccess.cta') }}</span>
        </button>
      </section>

      <div v-else-if="loading" class="readings-loading">
        <q-spinner color="white" size="32px" />
      </div>

      <div v-else-if="emptyStateText" class="readings-empty">
        <div class="readings-empty__title">{{ emptyStateText }}</div>
        <div class="readings-empty__text">
          {{ isLoggedIn ? tt('readingsPage.emptyHint') : tt('readingsPage.emptyHintNotLoggedIn') }}
        </div>
        <button v-if="isLoggedIn" type="button" class="readings-empty__cta" @click="goToTarot">
          {{ tt('readingsPage.emptyCta') }}
        </button>
        <button v-else type="button" class="readings-empty__cta" @click="goToLogin">
          {{ tt('readingsPage.loginCta') }}
        </button>
      </div>

      <section v-else class="readings-list">
        <article
          v-for="reading in readings"
          :key="reading.id"
          class="reading-card"
          @click="openReading(reading)"
        >
          <div class="reading-card__header">
            <div class="reading-card__date">{{ formatDate(reading.created_at) }}</div>
            <div class="reading-card__spread">{{ getSpreadLabel(reading.spread_type) }}</div>
          </div>

          <div v-if="reading.question" class="reading-card__question">
            {{ reading.question }}
          </div>

          <div class="reading-card__cards">
            <div
              v-for="(card, index) in getReadingCards(reading)"
              :key="`${reading.id}-${index}`"
              class="reading-card__thumb"
            >
              <img
                :src="getCardImage(card)"
                :alt="getCardTitle(card)"
                :class="{ 'reading-card__thumb--reversed': card.reversed }"
                loading="lazy"
              />
            </div>
          </div>

          <div class="reading-card__footer">
            <q-icon name="chevron_right" size="16px" class="reading-card__arrow" />
          </div>
        </article>
      </section>
    </div>

    <q-dialog
      v-model="detailOpen"
      maximized
      transition-show="slide-up"
      transition-hide="slide-down"
      :transition-duration="440"
      class="oracle-actions-dialog readings-dialog--full"
    >
      <section class="oracle-actions oracle-actions--full">
        <div class="readings-sheet-header">
          <button type="button" class="readings-sheet-back" @click="closeDetail">
            <q-icon name="chevron_left" size="18px" />
          </button>
          <div class="sheet-title">{{ tt('readingsPage.detailTitle') }}</div>
        </div>

        <div v-if="selectedReading" class="reading-detail">
          <div class="reading-detail__meta">
            <div class="reading-detail__date">{{ formatDate(selectedReading.created_at) }}</div>
            <div class="reading-detail__spread">
              {{ getSpreadLabel(selectedReading.spread_type) }}
            </div>
          </div>

          <div v-if="selectedReading.question" class="reading-detail__question">
            <div class="reading-detail__label">{{ tt('readingsPage.questionLabel') }}</div>
            <div class="reading-detail__text">{{ selectedReading.question }}</div>
          </div>

          <div class="reading-detail__cards-section">
            <div class="reading-detail__label">{{ tt('readingsPage.cardsLabel') }}</div>
            <div class="reading-detail__cards">
              <div
                v-for="(card, index) in getReadingCards(selectedReading)"
                :key="`detail-${index}`"
                class="reading-detail__card"
              >
                <img
                  :src="getCardImage(card)"
                  :alt="getCardTitle(card)"
                  :class="{ 'reading-detail__card-img--reversed': card.reversed }"
                />
                <div class="reading-detail__card-name">{{ getCardTitle(card) }}</div>
                <div class="reading-detail__card-meta">
                  {{ card.reversed ? tt('cardsPage.reversed') : tt('cardsPage.upright') }}
                </div>
              </div>
            </div>
          </div>

          <div v-if="selectedReading.interpretation" class="reading-detail__interpretation">
            <div class="reading-detail__label">{{ tt('readingsPage.interpretationLabel') }}</div>
            <div class="reading-detail__text">{{ selectedReading.interpretation }}</div>
          </div>

          <div class="reading-detail__actions">
            <button type="button" class="reading-detail__delete" @click="confirmDelete">
              <q-icon name="delete_outline" size="16px" />
              {{ tt('readingsPage.deleteBtn') }}
            </button>
          </div>
        </div>

        <div class="oracle-actions__footer">
          <button type="button" class="oracle-actions__ok" @click="closeDetail">
            {{ tt('common.close') }}
          </button>
        </div>
      </section>
    </q-dialog>

    <q-dialog v-model="deleteDialog">
      <section class="delete-dialog">
        <div class="delete-dialog__title">{{ tt('readingsPage.deleteTitle') }}</div>
        <p class="delete-dialog__text">{{ tt('readingsPage.deleteText') }}</p>
        <div class="delete-dialog__actions">
          <q-btn
            flat
            class="delete-dialog__btn delete-dialog__btn--cancel"
            :label="tt('common.cancel')"
            no-caps
            :disable="deleting"
            @click="deleteDialog = false"
          />
          <q-btn
            flat
            class="delete-dialog__btn delete-dialog__btn--delete"
            :label="tt('common.delete')"
            no-caps
            :loading="deleting"
            :disable="deleting"
            @click="deleteReading"
          />
        </div>
      </section>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, ref, watch, onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { t, currentLocale } from 'src/i18n'
import { getUserNative, selectTarotReadingsByUser, deleteTarotReading } from 'src/services/supabaseNative'
import { loadTarotData } from 'src/helpers/tarotData'
import { loadSavedReadingsSnapshot, EMPTY_SAVED_READINGS_STATE } from 'src/helpers/savedReadingsCore.js'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'
import { usePremiumAccess } from 'src/stores/premiumAccess'
import { analytics } from 'src/services/analytics'
import { PAYWALL_ENTRY_POINTS } from 'src/constants/analyticsEvents'

const locale = computed(() => currentLocale.value || 'en')
const tt = (key) => t(locale.value, key)
const router = useRouter()
const { hasPremiumAccess } = usePremiumAccess()
const readingsLockBullets = computed(() => [
  tt('premiumAccess.readings.bullets.timeline'),
  tt('premiumAccess.readings.bullets.search'),
  tt('premiumAccess.readings.bullets.patterns'),
])
const readingsAccessModelRows = computed(() => [
  {
    key: 'free',
    label: tt('premiumAccess.model.labels.free'),
    text: tt('premiumAccess.model.readings.free'),
  },
  {
    key: 'premium',
    label: tt('premiumAccess.model.labels.premium'),
    text: tt('premiumAccess.model.readings.premium'),
  },
  {
    key: 'purchase',
    label: tt('premiumAccess.model.labels.purchase'),
    text: tt('premiumAccess.model.readings.purchase'),
  },
])

const readings = ref([])
const tarotData = ref(null)
const loading = ref(true)
const detailOpen = ref(false)
const selectedReading = ref(null)
const deleteDialog = ref(false)
const deleting = ref(false)
const isLoggedIn = ref(false)
const userId = ref('')

const emptyStateText = computed(() => {
  if (loading.value) return ''
  if (!isLoggedIn.value) return tt('readingsPage.emptyNotLoggedIn')
  if (!readings.value.length) return tt('readingsPage.emptyTitle')
  return ''
})

const hapticTap = async () => {
  if (!Capacitor.isNativePlatform()) return
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch (e) {
    console.error(e)
  }
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat(locale.value, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  } catch (e) {
    console.error(e)
    return dateString
  }
}

const getSpreadLabel = (spreadType) => {
  const labels = {
    1: tt('readingsPage.spread1'),
    3: tt('readingsPage.spread3'),
    5: tt('readingsPage.spread5'),
  }
  return labels[spreadType] || `${spreadType} cards`
}

const getReadingCards = (reading) => {
  if (!reading?.cards || !tarotData.value?.cards) return []
  try {
    const cardsData = typeof reading.cards === 'string' ? JSON.parse(reading.cards) : reading.cards
    return cardsData
      .map((cardInfo) => {
        const card = tarotData.value.cards.find((c) => c.id === cardInfo.id)
        return card ? { ...card, reversed: cardInfo.reversed || false } : null
      })
      .filter(Boolean)
  } catch (e) {
    console.error(e)
    return []
  }
}

const getCardImage = (card) => {
  if (!card?.file) return ''
  return `/images/cards/${card.file}`
}

const getCardTitle = (card) => {
  return card?.name?.[locale.value] || card?.name?.en || ''
}

const openReading = async (reading) => {
  selectedReading.value = reading
  detailOpen.value = true
  await hapticTap()
}

const closeDetail = async () => {
  detailOpen.value = false
  await hapticTap()
}

const confirmDelete = async () => {
  deleteDialog.value = true
  await hapticTap()
}

const deleteReading = async () => {
  if (!selectedReading.value?.id) return
  deleting.value = true

  try {
    const { error } = await deleteTarotReading(selectedReading.value.id, 8000)

    if (error) {
      console.error('Delete error:', error)
      return
    }

    readings.value = readings.value.filter((r) => r.id !== selectedReading.value.id)
    deleteDialog.value = false
    detailOpen.value = false
    await hapticTap()
  } catch (err) {
    console.error('Delete failed:', err)
  } finally {
    deleting.value = false
  }
}

const goToTarot = async () => {
  await hapticTap()
  router.push({ name: 'tarot' })
}

const goToLogin = async () => {
  await hapticTap()
  router.push({ name: 'login' })
}

const goPremium = async () => {
  await hapticTap()
  const point = PAYWALL_ENTRY_POINTS.readingsLock
  void analytics.logEvent(point.event, {
    source: point.source,
    entry: point.entry,
  })
  router.push({ name: 'premium', query: { source: point.source, entry: point.entry } })
}

const onBack = async () => {
  await hapticTap()
  router.back()
}

const setBottomNavHidden = (hidden) => {
  if (typeof document === 'undefined') return
  document.body.classList.toggle('hide-bottom-nav', hidden)
}

const setBottomNavDark = (enabled) => {
  if (typeof document === 'undefined') return
  document.body.classList.toggle('cards-nav-dark', enabled)
}

const ensureTarotDataLoaded = async () => {
  if (tarotData.value) return
  tarotData.value = await loadTarotData()
}

const applyEmptySavedReadingsState = () => {
  readings.value = EMPTY_SAVED_READINGS_STATE.readings
  isLoggedIn.value = EMPTY_SAVED_READINGS_STATE.isLoggedIn
  userId.value = EMPTY_SAVED_READINGS_STATE.userId
  selectedReading.value = null
  detailOpen.value = false
  deleteDialog.value = false
}

const loadReadings = async () => {
  loading.value = true
  const snapshot = await loadSavedReadingsSnapshot({
    hasPremiumAccess: hasPremiumAccess.value,
    ensureTarotDataLoaded,
    getUserNative,
    selectTarotReadingsByUser,
  })

  if (snapshot.status === 'locked') {
    applyEmptySavedReadingsState()
    loading.value = false
    return
  }

  readings.value = snapshot.readings
  isLoggedIn.value = snapshot.isLoggedIn
  userId.value = snapshot.userId

  if (snapshot.error) {
    console.error('Load readings failed:', snapshot.error)
  }

  if (!snapshot.isLoggedIn) {
    selectedReading.value = null
    detailOpen.value = false
    deleteDialog.value = false
  }

  loading.value = false
}

const loadReadingsSafe = async () => {
  try {
    await loadReadings()
  } catch (error) {
    console.error('Load readings crashed:', error)
    applyEmptySavedReadingsState()
    loading.value = false
  }
}

watch(detailOpen, (value) => {
  setBottomNavHidden(value)
})

watch(deleteDialog, (value) => {
  if (value) {
    setBottomNavHidden(true)
    return
  }
  setBottomNavHidden(detailOpen.value)
})

watch(hasPremiumAccess, (next) => {
  if (!next) {
    applyEmptySavedReadingsState()
    loading.value = false
    return
  }
  void loadReadingsSafe()
})

onBeforeUnmount(() => {
  setBottomNavHidden(false)
  setBottomNavDark(false)
})

onMounted(() => {
  void loadReadingsSafe()
  setBottomNavDark(true)
})
</script>

<style scoped lang="scss">
.readings-page {
  min-height: 100vh;
  color: #e9edf4;
  position: relative;
  overflow: hidden;
}

.readings-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 40%, #050d15 100%);
  z-index: 0;
}

.readings-content {
  position: relative;
  z-index: 1;
  padding: calc(90px + env(safe-area-inset-top)) 16px 84px;
  max-width: 520px;
  margin: 0 auto;
  display: grid;
  gap: 16px;
}

.readings-hero {
  display: grid;
  gap: 3px;
}

.readings-hero--with-back {
  position: relative;
  grid-template-columns: 1fr;
  align-items: center;
  justify-items: center;
  gap: 12px;
}

.readings-hero__text {
  text-align: center;
  display: grid;
  gap: 3px;
  justify-items: center;
  padding: 0 44px;
}

.readings-title {
  font-size: 18px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.readings-kicker {
  font-size: 9px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.6);
}

.readings-back {
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

.readings-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.readings-lock {
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    radial-gradient(120% 90% at 20% 0%, rgba(112, 156, 255, 0.18) 0%, rgba(12, 18, 30, 0.12) 42%, transparent 100%),
    linear-gradient(160deg, rgba(14, 20, 32, 0.92), rgba(6, 10, 18, 0.98));
  box-shadow:
    0 18px 40px rgba(2, 6, 12, 0.52),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  padding: 22px 18px 20px;
  display: grid;
  gap: 12px;
}

.readings-lock::before {
  content: '';
  position: absolute;
  inset: -140% auto auto -48%;
  width: 220px;
  height: 220px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(145, 188, 255, 0.25) 0%, rgba(145, 188, 255, 0) 70%);
  pointer-events: none;
}

.readings-lock__badge {
  justify-self: start;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(186, 207, 247, 0.34);
  background: rgba(87, 123, 190, 0.2);
  color: rgba(226, 236, 255, 0.95);
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-weight: 600;
}

.readings-lock__title {
  font-size: 18px;
  line-height: 1.25;
  letter-spacing: 0.03em;
  color: rgba(238, 244, 255, 0.96);
  font-weight: 600;
}

.readings-lock__text {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: rgba(216, 228, 247, 0.78);
}

.readings-lock__model {
  border-radius: 12px;
  border: 1px solid rgba(165, 196, 245, 0.2);
  background: rgba(7, 12, 20, 0.56);
  padding: 10px;
  display: grid;
  gap: 8px;
}

.readings-lock__model-row {
  display: grid;
  gap: 3px;
}

.readings-lock__model-label {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(173, 210, 255, 0.86);
  font-weight: 600;
}

.readings-lock__model-text {
  font-size: 12px;
  line-height: 1.4;
  color: rgba(224, 234, 251, 0.82);
}

.readings-lock__bullets {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.readings-lock__bullet {
  font-size: 12px;
  line-height: 1.45;
  color: rgba(224, 234, 251, 0.86);
  display: inline-flex;
  align-items: flex-start;
  gap: 6px;
}

.readings-lock__bullet::before {
  content: '✦';
  color: rgba(173, 210, 255, 0.88);
  line-height: 1.2;
}

.readings-lock__preview {
  border-radius: 14px;
  border: 1px solid rgba(165, 196, 245, 0.22);
  background: rgba(7, 12, 20, 0.62);
  padding: 12px;
  display: grid;
  gap: 10px;
}

.readings-lock__stack {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 8px;
}

.readings-lock__thumb {
  width: 52px;
  height: 82px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background:
    linear-gradient(160deg, rgba(127, 165, 235, 0.26), rgba(25, 38, 62, 0.8)),
    linear-gradient(180deg, rgba(12, 18, 30, 0.96), rgba(5, 10, 18, 0.98));
  box-shadow:
    0 8px 18px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.readings-lock__thumb:nth-child(2) {
  transform: translateY(-6px);
}

.readings-lock__meta {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.readings-lock__meta span {
  border-radius: 999px;
  padding: 6px 10px;
  border: 1px solid rgba(176, 206, 252, 0.26);
  background: rgba(95, 140, 214, 0.12);
  color: rgba(223, 235, 254, 0.78);
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.readings-lock__cta {
  width: 100%;
  margin-top: 6px;
  border-radius: 14px;
  border: 1px solid rgba(156, 184, 235, 0.36);
  padding: 14px 16px;
  background: linear-gradient(180deg, rgba(28, 38, 58, 0.92), rgba(10, 15, 27, 0.98));
  color: #e9edf4;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: transform 180ms ease;
}

.readings-lock__cta:active {
  transform: scale(0.98);
}

.readings-empty {
  text-align: center;
  padding: 40px 20px;
  display: grid;
  gap: 12px;
  justify-items: center;
}

.readings-empty__icon {
  font-size: 48px;
  opacity: 0.3;
  margin-bottom: 8px;
}

.readings-empty__title {
  font-size: 16px;
  letter-spacing: 0.08em;
  color: rgba(224, 234, 251, 0.82);
}

.readings-empty__text {
  font-size: 12px;
  line-height: 1.5;
  color: rgba(214, 225, 242, 0.62);
  max-width: 280px;
}

.readings-empty__cta {
  margin-top: 8px;
  padding: 10px 20px;
  border-radius: 12px;
  border: 1px solid rgba(156, 184, 235, 0.36);
  background: linear-gradient(180deg, rgba(28, 38, 58, 0.92), rgba(10, 15, 27, 0.98));
  color: #e9edf4;
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.readings-list {
  display: grid;
  gap: 12px;
}

.reading-card {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(11, 15, 24, 0.72);
  box-shadow:
    0 8px 24px rgba(2, 6, 12, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  display: grid;
  gap: 10px;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.reading-card:active {
  transform: scale(0.98);
  box-shadow:
    0 4px 12px rgba(2, 6, 12, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.reading-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.reading-card__date {
  font-size: 13px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.7);
}

.reading-card__spread {
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.52);
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(8, 12, 20, 0.6);
}

.reading-card__question {
  font-size: 12px;
  line-height: 1.4;
  color: rgba(224, 234, 251, 0.84);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.reading-card__cards {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 4px 0;
}

.reading-card__cards::-webkit-scrollbar {
  display: none;
}

.reading-card__thumb {
  flex-shrink: 0;
  width: 50px;
  height: 82px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #ffffff;
}

.reading-card__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.reading-card__thumb--reversed {
  transform: rotate(180deg);
}

.reading-card__footer {
  display: flex;
  justify-content: flex-end;
}

.reading-card__arrow {
  color: rgba(214, 225, 242, 0.5);
}

.readings-sheet-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 8px 12px;
  position: relative;
}

.readings-sheet-back {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(10, 14, 22, 0.7);
  color: rgba(214, 225, 242, 0.8);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.reading-detail {
  padding: 16px 16px 24px;
  display: grid;
  gap: 20px;
}

.reading-detail__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.reading-detail__date {
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.74);
}

.reading-detail__spread {
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.56);
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(8, 12, 20, 0.7);
}

.reading-detail__question,
.reading-detail__cards-section,
.reading-detail__interpretation {
  display: grid;
  gap: 10px;
}

.reading-detail__label {
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.6);
}

.reading-detail__text {
  font-size: 13px;
  line-height: 1.5;
  color: rgba(224, 234, 251, 0.86);
  white-space: pre-wrap;
}

.reading-detail__cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
}

.reading-detail__card {
  display: grid;
  gap: 6px;
  text-align: center;
}

.reading-detail__card img {
  width: 100%;
  height: auto;
  aspect-ratio: 5/8;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #ffffff;
  object-fit: cover;
}

.reading-detail__card-img--reversed {
  transform: rotate(180deg);
}

.reading-detail__card-name {
  font-size: 13px;
  letter-spacing: 0.06em;
  color: rgba(224, 234, 251, 0.84);
}

.reading-detail__card-meta {
  font-size: 9px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.56);
}

.reading-detail__actions {
  display: flex;
  justify-content: center;
  padding-top: 8px;
}

.reading-detail__delete {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255, 96, 96, 0.42);
  background: rgba(42, 8, 12, 0.5);
  color: rgba(255, 106, 106, 0.9);
  font-size: 13px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.oracle-actions {
  width: 100vw;
  max-width: 100vw;
  margin: 0 auto;
  border-radius: 22px 22px 0 0;
  padding: 8px 12px calc(env(safe-area-inset-bottom, 0px) + 24px);
  box-shadow: 0 -16px 46px rgba(0, 0, 0, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #ffffff;
  pointer-events: auto;
  background: #050d15;
}

.oracle-actions--full {
  height: 100vh;
  border-radius: 0;
  padding-top: calc(env(safe-area-inset-top, 0px) + 96px);
  overflow-y: auto;
}

.oracle-actions__footer {
  margin-top: 12px;
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

.sheet-title {
  text-align: center;
  font-size: 13px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.74);
  flex: 1;
}

.delete-dialog {
  /* q-dialog__inner is pointer-events:none; custom sheet content must opt back
     in or taps fall through to the backdrop (see astro-sheet). */
  pointer-events: auto;
  width: min(420px, calc(100vw - 24px));
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: linear-gradient(180deg, rgba(18, 24, 38, 0.95), rgba(10, 14, 22, 0.98));
  box-shadow:
    0 14px 36px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.delete-dialog__title {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
}

.delete-dialog__text {
  margin: 10px 0 14px;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(224, 234, 248, 0.82);
}

.delete-dialog__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.delete-dialog__btn {
  min-height: 40px;
  border-radius: 10px;
}

.delete-dialog__btn--cancel {
  border: 1px solid rgba(156, 184, 235, 0.28);
  color: rgba(214, 225, 242, 0.84);
}

.delete-dialog__btn--delete {
  border: 1px solid rgba(255, 96, 96, 0.52);
  color: rgba(255, 106, 106, 0.95);
  background: rgba(42, 8, 12, 0.5);
}
</style>
