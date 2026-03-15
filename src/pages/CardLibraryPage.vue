<template>
  <q-page class="cards-page">
    <div class="cards-bg" aria-hidden="true"></div>

    <div class="cards-content">
      <header class="cards-hero">
        <div class="cards-title">{{ tt('cardsPage.title') }}</div>
        <div class="cards-kicker">{{ tt('cardsPage.subtitle') }}</div>
      </header>

      <section class="cards-filters">
        <button
          v-for="filter in filters"
          :key="filter.id"
          type="button"
          class="cards-filter"
          :class="{ 'cards-filter--active': activeFilter === filter.id }"
          @click="activeFilter = filter.id"
        >
          {{ tt(filter.labelKey) }}
        </button>
      </section>

      <section class="cards-grid">
        <article v-for="card in filteredCards" :key="card.id" class="cards-item">
          <div class="cards-thumb">
            <img :src="getCardImage(card)" :alt="getCardTitle(card)" loading="lazy" />
          </div>
          <div class="cards-name">{{ getCardTitle(card) }}</div>
          <div class="cards-meta">{{ getCardSubtitle(card) }}</div>
        </article>
      </section>
    </div>
  </q-page>
</template>

<script setup>
import { computed, ref } from 'vue'
import { t, currentLocale } from 'src/i18n'
import tarotCardsData from 'src/data/cardsV2/tarot_full.json'

const locale = computed(() => currentLocale.value || 'en')
const tt = (key) => t(locale.value, key)

const cards = tarotCardsData?.cards || []
const activeFilter = ref('all')

const filters = [
  { id: 'all', labelKey: 'cardsPage.filters.all' },
  { id: 'major', labelKey: 'cardsPage.filters.major' },
  { id: 'wands', labelKey: 'cardsPage.filters.wands' },
  { id: 'cups', labelKey: 'cardsPage.filters.cups' },
  { id: 'swords', labelKey: 'cardsPage.filters.swords' },
  { id: 'pentacles', labelKey: 'cardsPage.filters.pentacles' },
]

const filteredCards = computed(() => {
  if (activeFilter.value === 'all') return cards
  if (activeFilter.value === 'major') {
    return cards.filter((card) => card.arcana === 'major')
  }
  return cards.filter((card) => card.suit === activeFilter.value)
})

const getCardTitle = (card) => card?.name?.[locale.value] || card?.name?.en || ''
const getCardSubtitle = (card) => {
  if (!card) return ''
  if (card.arcana === 'major') return tt('cardsPage.major')
  return tt(`cardsPage.suits.${card.suit}`)
}
const getCardImage = (card) => `/images/cards/${card.file}`
</script>

<style scoped lang="scss">
.cards-page {
  min-height: 100vh;
  color: #e9edf4;
  position: relative;
  overflow: hidden;
}

.cards-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 40%, #050d15 100%);
  z-index: 0;
}

.cards-content {
  position: relative;
  z-index: 1;
  padding: calc(32px + env(safe-area-inset-top)) 18px 32px;
  max-width: 520px;
  margin: 0 auto;
  display: grid;
  gap: 16px;
}

.cards-hero {
  display: grid;
  gap: 4px;
}

.cards-title {
  font-size: 20px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.cards-kicker {
  font-size: 10px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.6);
}

.cards-filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.cards-filter {
  border-radius: 999px;
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(9, 13, 21, 0.7);
  color: rgba(214, 225, 242, 0.7);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.cards-filter--active {
  color: #fff;
  border-color: rgba(159, 216, 246, 0.5);
  box-shadow: 0 0 12px rgba(159, 216, 246, 0.18);
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.cards-item {
  border-radius: 16px;
  padding: 12px;
  background: rgba(10, 14, 22, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 14px 26px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  display: grid;
  gap: 8px;
  text-align: center;
}

.cards-thumb {
  width: 100%;
  aspect-ratio: 3 / 5;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(12, 16, 25, 0.9);
  display: grid;
  place-items: center;
}

.cards-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cards-name {
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.cards-meta {
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.6);
}
</style>
