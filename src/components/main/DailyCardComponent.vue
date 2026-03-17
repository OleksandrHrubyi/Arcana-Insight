<template>
  <q-page class="daily-page">
    <div class="daily-bg" aria-hidden="true"></div>

    <div class="daily-content">
      <header class="daily-hero daily-hero--with-back">
        <button type="button" class="daily-back" @click="onBack">
          <q-icon name="chevron_left" size="18px" />
        </button>
        <div class="daily-hero__text">
          <div class="daily-title">{{ tt('dailyPage.title') }}</div>
          <div class="daily-kicker">{{ todayLabel }}</div>
        </div>
      </header>

      <section class="daily-card">
        <div class="daily-card__title">{{ tt('dailyPage.cardLabel') }}</div>
        <div class="daily-card__media">
          <img :src="cardImage" :alt="cardTitle" :class="{ 'daily-card__media--reversed': orientation === 'reversed' }" />
        </div>
        <div class="daily-card__name">{{ cardTitle }}</div>
        <div class="daily-card__meta">{{ cardSubtitle }}</div>

        <div class="daily-card__tags">
          <span class="daily-tag">{{ orientationLabel }}</span>
          <span v-for="word in cardKeywords" :key="word" class="daily-tag">{{ word }}</span>
        </div>
      </section>

      <section class="daily-panel">
        <div class="daily-panel__title">{{ tt('dailyPage.meaningLabel') }}</div>
        <div class="daily-panel__text">{{ cardMeaning }}</div>
      </section>

      <section class="daily-panel daily-panel--soft">
        <div class="daily-panel__title">{{ tt('dailyPage.guidanceLabel') }}</div>
        <div class="daily-panel__text">{{ cardDescription }}</div>
      </section>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { t, currentLocale } from 'src/i18n'
import { loadTarotData } from 'src/helpers/tarotData'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'

const locale = computed(() => currentLocale.value || 'en')
const tt = (key) => t(locale.value, key)
const router = useRouter()

const cards = ref([])

onMounted(async () => {
  const data = await loadTarotData()
  cards.value = data?.cards || []
})

const todayKey = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const hashString = (value) => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

const dailyIndex = computed(() => {
  if (!cards.value.length) return 0
  const hash = hashString(todayKey())
  return hash % cards.value.length
})

const orientation = computed(() => {
  const hash = hashString(`${todayKey()}-orientation`)
  return hash % 2 === 0 ? 'upright' : 'reversed'
})

const dailyCard = computed(() => cards.value[dailyIndex.value] || null)
const cardTitle = computed(() => dailyCard.value?.name?.[locale.value] || dailyCard.value?.name?.en || '')
const cardSubtitle = computed(() => {
  const card = dailyCard.value
  if (!card) return ''
  if (card.arcana === 'major') return tt('cardsPage.major')
  return tt(`cardsPage.suits.${card.suit}`)
})
const cardImage = computed(() => `/images/cards/${dailyCard.value?.file || ''}`)
const cardKeywords = computed(() => dailyCard.value?.keywords?.[locale.value] || dailyCard.value?.keywords?.en || [])
const cardMeaning = computed(() => dailyCard.value?.meaning?.[orientation.value]?.[locale.value] || dailyCard.value?.meaning?.[orientation.value]?.en || '')
const cardDescription = computed(() => dailyCard.value?.description?.[orientation.value]?.[locale.value] || dailyCard.value?.description?.[orientation.value]?.en || '')
const orientationLabel = computed(() => (orientation.value === 'upright' ? tt('cardsPage.upright') : tt('cardsPage.reversed')))

const todayLabel = computed(() => {
  const now = new Date()
  try {
    return new Intl.DateTimeFormat(locale.value, { weekday: 'long', month: 'long', day: 'numeric' }).format(now)
  } catch (e) {
    console.log(e);
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
  router.back()
}
</script>

<style scoped lang="scss">
.daily-page {
  min-height: 100vh;
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

.daily-content {
  position: relative;
  z-index: 1;
  padding: calc(90px + env(safe-area-inset-top)) 18px 32px;
  max-width: 520px;
  margin: 0 auto;
  display: grid;
  gap: 16px;
}

.daily-hero {
  display: grid;
  gap: 3px;
}

.daily-hero--with-back {
  position: relative;
  grid-template-columns: 1fr;
  align-items: center;
  justify-items: center;
  gap: 10px;
}

.daily-hero__text {
  text-align: center;
  display: grid;
  gap: 3px;
  justify-items: center;
  padding: 0 44px;
}

.daily-title {
  font-size: 18px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.daily-kicker {
  font-size: 9px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.6);
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

.daily-card {
  padding: 16px 16px 14px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(11, 15, 24, 0.82);
  box-shadow:
    0 18px 40px rgba(2, 6, 12, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  display: grid;
  gap: 10px;
  text-align: center;
}

.daily-card__title {
  font-size: 10px;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.62);
}

.daily-card__media {
  width: min(190px, 58vw);
  height: min(310px, 46vh);
  margin: 0 auto;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #ffffff;
}

.daily-card__media--reversed {
  transform: rotate(180deg);
}
.daily-card__media img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.daily-card__name {
  font-size: 14px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.daily-card__meta {
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.6);
}

.daily-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}

.daily-tag {
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(8, 12, 20, 0.7);
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.7);
}

.daily-panel {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(10, 14, 22, 0.8);
  display: grid;
  gap: 8px;
}

.daily-panel--soft {
  background: rgba(8, 12, 20, 0.7);
}

.daily-panel__title {
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.6);
}

.daily-panel__text {
  font-size: 13px;
  line-height: 1.5;
  color: rgba(224, 234, 251, 0.86);
}
</style>
