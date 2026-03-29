<template>
  <q-page class="interpret-page">
    <div class="interpret-bg" aria-hidden="true"></div>

    <header class="interpret-header">
      <button type="button" class="interpret-back" @click="goBack">
        <q-icon name="chevron_left" size="18px" />
      </button>
      <div class="interpret-header__text">
        <div class="interpret-title">{{ reading?.summaryTitle || fallbackTitle }}</div>
        <div class="interpret-kicker">{{ headerKicker }}</div>
      </div>
    </header>

    <section v-if="reading" class="interpret-body">
      <div class="interpret-meta">
        <div class="interpret-meta__item">
          <div class="interpret-meta__label">{{ metaThemeLabel }}</div>
          <div class="interpret-meta__value">{{ meta.themeLabel }}</div>
        </div>
        <div v-if="meta.subThemeLabel" class="interpret-meta__item">
          <div class="interpret-meta__label">{{ metaSubThemeLabel }}</div>
          <div class="interpret-meta__value">{{ meta.subThemeLabel }}</div>
        </div>
        <div v-if="meta.question" class="interpret-meta__item interpret-meta__item--full">
          <div class="interpret-meta__label">{{ metaQuestionLabel }}</div>
          <div class="interpret-meta__value">{{ meta.question }}</div>
        </div>
      </div>

      <div class="interpret-section">
        <div class="interpret-section__label">{{ overviewLabel }}</div>
        <div v-if="reading.opening" class="interpret-opening">{{ reading.opening }}</div>
        <div v-if="reading.summary" class="interpret-summary">{{ reading.summary }}</div>
      </div>

      <div class="interpret-section">
        <div class="interpret-section__label">{{ cardsLabel }}</div>
        <div class="interpret-cards">
        <article v-for="(card, index) in mergedCards" :key="`card-${index}`" class="interpret-card">
          <div class="interpret-card__media">
            <img
              v-if="card.image"
              :src="card.image"
              :alt="card.cardTitle"
              :class="{ reversed: card.reversed }"
            />
            <div v-else class="interpret-card__placeholder"></div>
          </div>
          <div class="interpret-card__content">
            <div class="interpret-card__role">{{ card.positionLabel || card.position }}</div>
            <div class="interpret-card__name">{{ card.cardTitle }}</div>
            <div v-if="card.message" class="interpret-card__text">{{ card.message }}</div>
            <div v-if="card.detail" class="interpret-card__text interpret-card__text--soft">{{ card.detail }}</div>
            <div v-if="card.question" class="interpret-card__question">{{ card.question }}</div>
          </div>
        </article>
        </div>
      </div>

      <div v-if="reading.advice" class="interpret-section">
        <div class="interpret-section__label">{{ adviceLabel }}</div>
        <div class="interpret-advice">{{ reading.advice }}</div>
      </div>

      <section v-if="showPremiumAha" class="interpret-upgrade">
        <div class="interpret-upgrade__badge">{{ premiumBadge }}</div>
        <div class="interpret-upgrade__title">{{ premiumTitle }}</div>
        <p class="interpret-upgrade__lead">{{ premiumLead }}</p>

        <div class="interpret-upgrade__preview">
          <div class="interpret-upgrade__preview-label">{{ premiumPreviewLabel }}</div>
          <div class="interpret-upgrade__preview-text">{{ premiumPreviewText }}</div>
        </div>

        <div class="interpret-upgrade__list">
          <div v-for="item in premiumAhaPoints" :key="item" class="interpret-upgrade__item">
            <q-icon name="check" size="14px" />
            <span>{{ item }}</span>
          </div>
        </div>

        <button type="button" class="interpret-upgrade__cta" @click="openPremiumFromAha">
          {{ premiumCta }}
        </button>
      </section>
    </section>

    <section v-else class="interpret-empty">
      {{ emptyText }}
    </section>

    <footer class="interpret-footer">
      <div class="interpret-footer__icons">
        <button type="button" class="interpret-icon" @click="saveReading">
          <q-icon name="bookmark_border" size="18px" />
        </button>
        <button type="button" class="interpret-icon" @click="shareReading">
          <q-icon name="share" size="18px" />
        </button>
      </div>
      <button type="button" class="interpret-btn interpret-btn--ghost" @click="endSession">
        {{ endSessionLabel }}
      </button>
      <button type="button" class="interpret-btn" @click="newSession">
        {{ newSessionLabel }}
      </button>
    </footer>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { Share } from '@capacitor/share'
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { currentLocale, t } from 'src/i18n'
import { usePremiumAccess } from 'src/stores/premiumAccess'
import { analytics } from 'src/services/analytics'

const STORAGE_KEY = 'tarot-interpretation-v1'

const router = useRouter()
const $q = useQuasar()
const { hasPremiumAccess } = usePremiumAccess()
const reading = ref(null)
const meta = ref({ themeLabel: '', subThemeLabel: '', question: '' })
const visuals = ref([])
const locale = computed(() => (currentLocale.value || 'en').toLowerCase().startsWith('uk') ? 'uk' : 'en')
const tt = (key, fallback = '') => {
  const translated = t(locale.value, key)
  if (translated === key) return fallback || key
  return translated
}

const headerKicker = computed(() => (locale.value === 'uk' ? 'ТАРО • ТЛУМАЧЕННЯ' : 'TAROT • INTERPRETATION'))
const fallbackTitle = computed(() => (locale.value === 'uk' ? 'Тлумачення' : 'Interpretation'))
const emptyText = computed(() =>
  locale.value === 'uk'
    ? 'Немає активного тлумачення. Повернись до розкладу.'
    : 'No active interpretation. Return to the spread.'
)
const metaThemeLabel = computed(() => (locale.value === 'uk' ? 'Тема' : 'Theme'))
const metaSubThemeLabel = computed(() => (locale.value === 'uk' ? 'Підтема' : 'Subtheme'))
const metaQuestionLabel = computed(() => (locale.value === 'uk' ? 'Питання' : 'Question'))
const endSessionLabel = computed(() => (locale.value === 'uk' ? 'Завершити сеанс' : 'End session'))
const newSessionLabel = computed(() => (locale.value === 'uk' ? 'Новий сеанс' : 'New session'))
const overviewLabel = computed(() => (locale.value === 'uk' ? 'Суть розкладу' : 'Overview'))
const cardsLabel = computed(() => (locale.value === 'uk' ? 'Карти' : 'Cards'))
const adviceLabel = computed(() => (locale.value === 'uk' ? 'Підсумок' : 'Closing'))
const showPremiumAha = computed(() => Boolean(reading.value) && !hasPremiumAccess.value)
const premiumBadge = computed(() => (locale.value === 'uk' ? 'PREMIUM' : 'PREMIUM'))
const premiumTitle = computed(() =>
  tt(
    'premiumAccess.tarot.aha.title',
    locale.value === 'uk' ? 'Відкрий глибший формат наступного розкладу' : 'Unlock a deeper format for your next spread',
  ),
)
const premiumLead = computed(() =>
  tt(
    'premiumAccess.tarot.aha.lead',
    locale.value === 'uk'
      ? 'Ти вже отримав базовий інсайт. Premium додає більше контексту і чіткіший напрям дії.'
      : 'You already got a baseline insight. Premium adds more context and clearer next steps.',
  ),
)
const premiumPreviewLabel = computed(() =>
  tt('premiumAccess.tarot.aha.previewLabel', locale.value === 'uk' ? 'PREVIEW NEXT' : 'PREVIEW NEXT'),
)
const premiumCta = computed(() =>
  tt('premiumAccess.cta', locale.value === 'uk' ? 'Відкрити Premium' : 'Unlock Premium'),
)

const mergedCards = computed(() => {
  const cards = reading.value?.cards || []
  return cards.map((card, index) => {
    const visual = visuals.value[index] || {}
    return {
      ...card,
      image: visual.file ? `/images/cards/${visual.file}` : '',
      reversed: Boolean(visual.reversed),
    }
  })
})

const premiumPreviewText = computed(() => {
  const card = mergedCards.value[0]
  const fallback = tt(
    'premiumAccess.tarot.aha.previewFallback',
    locale.value === 'uk'
      ? 'У Premium ти побачиш ширший контекст, глибшу інтерпретацію та рекомендації для наступного кроку.'
      : 'Premium adds broader context, deeper interpretation, and practical next-step guidance.',
  )
  if (!card) return fallback

  const line = String(card.message || card.detail || reading.value?.summary || '').trim()
  if (!line) return fallback
  const clipped = line.length > 132 ? `${line.slice(0, 131)}…` : line
  const prefix = tt('premiumAccess.tarot.aha.previewNowPrefix', locale.value === 'uk' ? 'Зараз' : 'Now')
  return `${prefix}: ${clipped}`
})

const premiumAhaPoints = computed(() =>
  [
    tt(
      'premiumAccess.tarot.aha.points.unlimited',
      locale.value === 'uk'
        ? 'Необмежені таро-сесії без денного ліміту.'
        : 'Unlimited tarot sessions without daily limits.',
    ),
    tt(
      'premiumAccess.tarot.aha.points.spreads',
      locale.value === 'uk'
        ? 'Розклади на 3 і 5 карт для ширшої картини.'
        : '3-card and 5-card spreads for wider context.',
    ),
    tt(
      'premiumAccess.tarot.aha.points.history',
      locale.value === 'uk'
        ? 'Збереження історії розкладів і повернення до патернів.'
        : 'Saved reading history to revisit recurring patterns.',
    ),
  ],
)

const loadReading = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    reading.value = parsed?.reading || null
    meta.value = parsed?.meta || { themeLabel: '', subThemeLabel: '', question: '' }
    visuals.value = parsed?.visuals || []
  } catch (error) {
    console.error(error)
  }
}

const clearReading = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error(error)
  }
}

const hapticTap = async () => {
  if (!Capacitor.isNativePlatform()) return
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch (error) {
    console.error(error)
  }
}

const goBack = () => {
  void hapticTap()
  router.back()
}

const endSession = () => {
  void hapticTap()
  clearReading()
  router.push({ name: 'arcana' }).catch(() => {})
}

const newSession = () => {
  void hapticTap()
  clearReading()
  router.push({ name: 'tarot' }).catch(() => {})
}

const buildShareText = () => {
  if (!reading.value) return ''
  const lines = []
  if (reading.value.summaryTitle) lines.push(reading.value.summaryTitle)
  if (reading.value.opening) lines.push(reading.value.opening)
  if (reading.value.summary) lines.push(reading.value.summary)
  mergedCards.value.forEach((card, idx) => {
    const role = card.positionLabel || `Card ${idx + 1}`
    lines.push(`${role}: ${card.cardTitle}`)
    if (card.message) lines.push(card.message)
  })
  if (reading.value.advice) lines.push(reading.value.advice)
  return lines.join('\n')
}

const saveReading = () => {
  if (!reading.value) return
  void hapticTap()
  try {
    const raw = localStorage.getItem('tarot-saved-readings')
    const existing = raw ? JSON.parse(raw) : []
    existing.unshift({
      savedAt: new Date().toISOString(),
      reading: reading.value,
      meta: meta.value,
      visuals: visuals.value,
    })
    localStorage.setItem('tarot-saved-readings', JSON.stringify(existing.slice(0, 20)))
    $q.notify({ message: locale.value === 'uk' ? 'Збережено' : 'Saved', color: 'dark' })
  } catch (error) {
    console.error(error)
  }
}

const shareReading = async () => {
  if (!reading.value) return
  void hapticTap()
  try {
    await Share.share({
      title: reading.value.summaryTitle || fallbackTitle.value,
      text: buildShareText(),
    })
  } catch (error) {
    console.error(error)
  }
}

const openPremiumFromAha = async () => {
  void analytics.logEvent('paywall_entry_primary', {
    source: 'tarot_post_session',
    entry: 'interpretation_aha',
  })
  await hapticTap()
  router.push({
    name: 'premium',
    query: {
      source: 'tarot_post_session',
      entry: 'interpretation_aha',
    },
  }).catch(() => {})
}

onMounted(() => {
  loadReading()
})
</script>

<style scoped>
.interpret-page {
  min-height: 100dvh;
  color: #e9edf4;
  background: #050d15;
  display: grid;
  grid-template-rows: auto 1fr auto;
  position: relative;
  overflow: hidden;
}

.interpret-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 40%, #050d15 100%);
  z-index: 0;
}

.interpret-header,
.interpret-body,
.interpret-footer,
.interpret-empty {
  position: relative;
  z-index: 1;
}

.interpret-header {
  position: relative;
  display: grid;
  grid-template-columns: 1fr;
  align-items: center;
  justify-items: center;
  gap: 8px;
  padding: calc(90px + env(safe-area-inset-top, 0px)) 16px 12px;
  width: 100%;
}

.interpret-back {
  position: absolute;
  left: 16px;
  top: calc(90px + env(safe-area-inset-top, 0px));
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(10, 14, 22, 0.7);
  color: rgba(214, 225, 242, 0.8);
}

.interpret-header__text {
  text-align: center;
  display: grid;
  gap: 4px;
  justify-items: center;
  padding: 0 44px;
  max-width: 560px;
  margin: 0 auto;
}

.interpret-kicker {
  font-size: 9px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.6);
}

.interpret-title {
  font-size: 18px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(246, 242, 232, 0.96);
}

.interpret-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(156, 184, 235, 0.2);
  background: rgba(8, 12, 18, 0.62);
  color: rgba(228, 236, 248, 0.8);
}

.interpret-body {
  padding: 8px 16px 26px;
  overflow-y: auto;
  max-width: 560px;
  margin: 0 auto;
}

.interpret-meta {
  display: grid;
  gap: 10px;
  margin-bottom: 18px;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid rgba(156, 184, 235, 0.16);
  background: rgba(8, 12, 18, 0.62);
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.22);
}

.interpret-meta__item {
  display: grid;
  gap: 4px;
}

.interpret-meta__item--full {
  border-top: 1px solid rgba(156, 184, 235, 0.12);
  padding-top: 10px;
}

.interpret-meta__label {
  font-size: 10px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: rgba(200, 210, 226, 0.6);
}

.interpret-meta__value {
  font-size: 14px;
  line-height: 1.5;
  color: rgba(236, 238, 244, 0.9);
}

.interpret-opening {
  font-size: 16px;
  line-height: 1.6;
  color: rgba(246, 242, 232, 0.96);
  margin-bottom: 10px;
}

.interpret-summary {
  font-size: 14px;
  line-height: 1.7;
  color: rgba(214, 225, 242, 0.9);
  margin-bottom: 0;
}

.interpret-section {
  margin-bottom: 18px;
}

.interpret-section__label {
  font-size: 10px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: rgba(200, 210, 226, 0.6);
  margin-bottom: 10px;
}

.interpret-cards {
  display: grid;
  gap: 16px;
}

.interpret-card {
  display: grid;
  grid-template-columns: minmax(110px, 120px) 1fr;
  gap: 14px;
  padding: 12px;
  border-radius: 18px;
  border: 1px solid rgba(156, 184, 235, 0.18);
  background: linear-gradient(180deg, rgba(9, 13, 21, 0.92), rgba(6, 9, 15, 0.94));
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.3);
}

.interpret-card__media {
  display: grid;
  place-items: center;
}

.interpret-card__media img {
  width: 100%;
  border-radius: 14px;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45);
}

/*noinspection CssUnusedSymbol*/
.interpret-card__media img.reversed {
  transform: rotate(180deg);
}

.interpret-card__placeholder {
  width: 100%;
  aspect-ratio: 0.62;
  border-radius: 14px;
  background: rgba(14, 18, 28, 0.8);
}

.interpret-card__content {
  display: grid;
  gap: 6px;
}

.interpret-card__role {
  font-size: 10px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: rgba(190, 205, 232, 0.7);
}

.interpret-card__name {
  font-size: 15px;
  font-weight: 600;
  color: rgba(248, 242, 232, 0.96);
}

.interpret-card__text {
  font-size: 14px;
  line-height: 1.6;
  color: rgba(214, 225, 242, 0.92);
}

.interpret-card__text--soft {
  color: rgba(196, 205, 222, 0.86);
}

.interpret-card__question {
  font-size: 12px;
  line-height: 1.5;
  color: rgba(200, 188, 162, 0.82);
}

.interpret-advice {
  font-size: 14px;
  line-height: 1.6;
  color: rgba(236, 238, 244, 0.92);
}

.interpret-upgrade {
  margin-bottom: 18px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(147, 203, 255, 0.34);
  background:
    radial-gradient(120% 140% at 0% 0, rgba(147, 203, 255, 0.16), rgba(147, 203, 255, 0)),
    linear-gradient(165deg, rgba(8, 12, 20, 0.9), rgba(4, 6, 12, 0.96));
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.28);
  display: grid;
  gap: 10px;
}

.interpret-upgrade__badge {
  justify-self: start;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 10px;
  letter-spacing: 0.16em;
  font-weight: 700;
  color: rgba(230, 242, 255, 0.95);
  border: 1px solid rgba(141, 201, 255, 0.62);
  background: rgba(147, 203, 255, 0.2);
}

.interpret-upgrade__title {
  font-size: 16px;
  line-height: 1.45;
  color: rgba(246, 242, 232, 0.96);
  font-weight: 650;
}

.interpret-upgrade__lead {
  margin: 0;
  font-size: 14px;
  line-height: 1.58;
  color: rgba(214, 225, 242, 0.9);
}

.interpret-upgrade__preview {
  border-radius: 12px;
  border: 1px solid rgba(156, 184, 235, 0.2);
  background: rgba(8, 12, 18, 0.58);
  padding: 10px;
  display: grid;
  gap: 6px;
}

.interpret-upgrade__preview-label {
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(200, 210, 226, 0.62);
}

.interpret-upgrade__preview-text {
  font-size: 13px;
  line-height: 1.5;
  color: rgba(230, 238, 252, 0.9);
}

.interpret-upgrade__list {
  display: grid;
  gap: 8px;
}

.interpret-upgrade__item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  line-height: 1.45;
  color: rgba(222, 234, 251, 0.9);
}

.interpret-upgrade__cta {
  width: 100%;
  min-height: 46px;
  border-radius: 12px;
  border: 1px solid rgba(168, 224, 255, 0.72);
  padding: 11px 12px;
  background: linear-gradient(180deg, rgba(88, 150, 231, 0.96), rgba(46, 102, 184, 0.98));
  color: #f4f9ff;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.interpret-empty {
  padding: 40px 16px;
  text-align: center;
  color: rgba(214, 225, 242, 0.7);
}

.interpret-footer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 12px 16px calc(env(safe-area-inset-bottom, 0px) + 44px);
  background: transparent;
  border-top: 1px solid rgba(156, 184, 235, 0.08);
  max-width: 560px;
  margin: 0 auto;
}

.interpret-footer__icons {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  gap: 10px;
}

.interpret-btn {
  min-height: 48px;
  border-radius: 14px;
  border: 1px solid rgba(156, 184, 235, 0.36);
  padding: 12px 14px;
  background: linear-gradient(180deg, rgba(28, 38, 58, 0.92), rgba(10, 15, 27, 0.98));
  color: rgba(248, 242, 232, 0.96);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.28);
}

.interpret-btn--ghost {
  background: rgba(8, 12, 18, 0.62);
  border-color: rgba(156, 184, 235, 0.18);
  color: rgba(214, 225, 242, 0.88);
}

@media (max-width: 520px) {
  .interpret-card {
    grid-template-columns: minmax(92px, 108px) 1fr;
  }
}

@media (max-width: 420px) {
  .interpret-card {
    grid-template-columns: 1fr;
  }

  .interpret-card__media {
    max-width: 160px;
    margin: 0 auto;
  }
}
</style>
