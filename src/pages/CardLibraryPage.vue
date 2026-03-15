<template>
  <q-page class="cards-page">
    <div class="cards-bg" aria-hidden="true"></div>

    <div class="cards-content">
      <header class="cards-hero cards-hero--with-back">
        <button type="button" class="cards-back" @click="$router.back()">
          <q-icon name="chevron_left" size="18px" />
        </button>
        <div class="cards-hero__text">
          <div class="cards-title">{{ tt('cardsPage.title') }}</div>
          <div class="cards-kicker">{{ tt('cardsPage.subtitle') }}</div>
        </div>
      </header>

      <section class="cards-filters">
        <button
          v-for="filter in filters"
          :key="filter.id"
          type="button"
          class="cards-filter"
          :class="{ 'cards-filter--active': activeFilter === filter.id }"
          @click="setFilter(filter.id)"
        >
          {{ tt(filter.labelKey) }}
        </button>
      </section>

      <div class="cards-search">
        <q-icon name="search" size="16px" class="cards-search__icon" />
        <input
          v-model="searchQuery"
          type="search"
          class="cards-search__input"
          :placeholder="tt('cardsPage.searchPlaceholder')"
        />
      </div>

      <div class="cards-count">{{ cardsCountLabel }}</div>

      <section class="cards-grid">
        <article
          v-for="card in filteredCards"
          :key="card.id"
          class="cards-item"
          :class="{ 'cards-item--selected': selectedCard?.id === card.id }"
          :style="{ '--accent': getCardAccent(card) }"
          @click="openCard(card)"
        >
          <div class="cards-thumb">
            <img :src="getCardImage(card)" :alt="getCardTitle(card)" loading="lazy" />
          </div>
          <div class="cards-name">{{ getCardTitle(card) }}</div>
          <div class="cards-meta">{{ getCardSubtitle(card) }}</div>
        </article>
      </section>

      <div v-if="emptyStateText" class="cards-empty">
        {{ emptyStateText }}
      </div>
    </div>

    <q-dialog
      v-model="detailOpen"
      maximized
      transition-show="slide-up"
      transition-hide="slide-down"
      :transition-duration="440"
      class="oracle-actions-dialog cards-dialog--full"
    >
      <section class="oracle-actions oracle-actions--full">
        <div class="cards-sheet-header">
          <button type="button" class="cards-sheet-back" @click="closeDetail">
            <q-icon name="chevron_left" size="18px" />
          </button>
          <div class="sheet-title">{{ tt('cardsPage.detailTitle') }}</div>
        </div>

        <div v-if="selectedCard" class="card-detail">
          <div class="card-detail__media">
            <img :src="getCardImage(selectedCard)" :alt="getCardTitle(selectedCard)" />
          </div>
          <div class="card-detail__title">{{ getCardTitle(selectedCard) }}</div>
          <div class="card-detail__meta">{{ getCardSubtitle(selectedCard) }}</div>
          <div class="card-detail__block">
            <div class="card-detail__label">{{ tt('cardsPage.upright') }}</div>
            <div class="card-detail__text">
              <p v-for="(line, idx) in getCardUpright(selectedCard)" :key="`up-${idx}`">{{ line }}</p>
            </div>
          </div>

          <div class="card-detail__block">
            <div class="card-detail__label">{{ tt('cardsPage.reversed') }}</div>
            <div class="card-detail__text">
              <p v-for="(line, idx) in getCardReversed(selectedCard)" :key="`rev-${idx}`">{{ line }}</p>
            </div>
          </div>

          <div v-if="getCardKeywords(selectedCard).length" class="card-detail__keywords">
            <div class="card-detail__label">{{ tt('cardsPage.keywords') }}</div>
            <div class="card-detail__tags">
              <span v-for="word in getCardKeywords(selectedCard)" :key="word" class="card-detail__tag">{{ word }}</span>
            </div>
          </div>
        </div>

        <div class="oracle-actions__footer">
          <button type="button" class="oracle-actions__ok" @click="closeDetail">
            {{ tt('common.close') }}
          </button>
        </div>
      </section>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, ref, watch, onBeforeUnmount, onMounted } from 'vue'
import { t, currentLocale } from 'src/i18n'
import tarotCardsData from 'src/data/cardsV2/tarot_full.json'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'

const locale = computed(() => currentLocale.value || 'en')
const tt = (key) => t(locale.value, key)

const filters = [
  { id: 'all', labelKey: 'cardsPage.filters.all' },
  { id: 'major', labelKey: 'cardsPage.filters.major' },
  { id: 'wands', labelKey: 'cardsPage.filters.wands' },
  { id: 'cups', labelKey: 'cardsPage.filters.cups' },
  { id: 'swords', labelKey: 'cardsPage.filters.swords' },
  { id: 'pentacles', labelKey: 'cardsPage.filters.pentacles' },
]

const cards = tarotCardsData?.cards || []
const activeFilter = ref('all')
const detailOpen = ref(false)
const selectedCard = ref(null)
const searchQuery = ref('')

const filteredCards = computed(() => {
  let result = cards
  if (activeFilter.value === 'major') {
    result = result.filter((card) => card.arcana === 'major')
  } else if (activeFilter.value !== 'all') {
    result = result.filter((card) => card.suit === activeFilter.value)
  }
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return result
  return result.filter((card) => getSearchText(card).includes(query))
})

const getSearchText = (card) => {
  const title = getCardTitle(card).toLowerCase()
  const keywords = getCardKeywords(card).join(' ').toLowerCase()
  return `${title} ${keywords}`
}

const emptyStateText = computed(() => {
  if (filteredCards.value.length) return ''
  if (searchQuery.value.trim()) return tt('cardsPage.emptySearch')
  return tt('cardsPage.emptyAll')
})

const getCardTitle = (card) => card?.name?.[locale.value] || card?.name?.en || ''
const getCardSubtitle = (card) => {
  if (!card) return ''
  if (card.arcana === 'major') return tt('cardsPage.major')
  return tt(`cardsPage.suits.${card.suit}`)
}
const getCardImage = (card) => `/images/cards/${card.file}`

const getCardUpright = (card) => getCardText(card?.description?.upright || card?.meaning?.upright)
const getCardReversed = (card) => getCardText(card?.description?.reversed || card?.meaning?.reversed)
const getCardKeywords = (card) => card?.keywords?.[locale.value] || card?.keywords?.en || []
const getCardText = (source) => {
  const text = source?.[locale.value] || source?.en || ''
  return text.split('\n\n').filter(Boolean)
}

const cardsCountLabel = computed(() => formatText(tt('cardsPage.count'), { count: filteredCards.value.length }))

const formatText = (template, vars) => {
  if (!template) return ''
  return Object.entries(vars || {}).reduce((acc, [key, value]) => {
    return acc.replaceAll(`{${key}}`, value)
  }, template)
}

const suitAccent = {
  major: '#9AC9F4',
  wands: '#F5B37C',
  cups: '#8FBFF2',
  swords: '#C5CEDF',
  pentacles: '#9AD39F',
}

const getCardAccent = (card) => suitAccent[card?.suit] || suitAccent.major

const setFilter = async (id) => {
  if (activeFilter.value === id) return
  activeFilter.value = id
  if (!Capacitor.isNativePlatform()) return
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch (e) {
    console.error(e)
  }
}

const openCard = async (card) => {
  selectedCard.value = card
  detailOpen.value = true
  if (!Capacitor.isNativePlatform()) return
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch (e) {
    console.error(e)
  }
}

const setBottomNavHidden = (hidden) => {
  if (typeof document === 'undefined') return
  document.body.classList.toggle('hide-bottom-nav', hidden)
}

const setBottomNavDark = (enabled) => {
  if (typeof document === 'undefined') return
  document.body.classList.toggle('cards-nav-dark', enabled)
}

const closeDetail = () => {
  detailOpen.value = false
}

watch(detailOpen, (value) => {
  setBottomNavHidden(value)
})

onBeforeUnmount(() => {
  setBottomNavHidden(false)
  setBottomNavDark(false)
})

onMounted(() => {
  setBottomNavDark(true)
})
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
  padding: calc(60px + env(safe-area-inset-top)) 18px 90px;
  max-width: 520px;
  margin: 0 auto;
  display: grid;
  gap: 16px;
}

.cards-hero {
  display: grid;
  gap: 3px;
}

.cards-hero--with-back {
  position: relative;
  grid-template-columns: 1fr;
  align-items: center;
  justify-items: center;
  gap: 12px;
}

.cards-hero__text {
  text-align: center;
  display: grid;
  gap: 3px;
  justify-items: center;
  padding: 0 44px;
}

.cards-title {
  font-size: 18px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.cards-kicker {
  font-size: 9px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.6);
}

.cards-back {
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

.cards-filters {
  display: flex;
  gap: 8px;
  overflow: hidden;
  padding: 0;
  border-radius: 0;
  border: none;
  background: transparent;
  box-shadow: none;
  flex-wrap: nowrap;
  scrollbar-width: none;
}

.cards-filters::-webkit-scrollbar {
  display: none;
}

.cards-filter {
  border-radius: 999px;
  padding: 4px 2px;
  border: none;
  background: transparent;
  color: rgba(214, 225, 242, 0.7);
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  white-space: nowrap;
  position: relative;
}

.cards-filter--active {
  color: #fff;
  text-shadow: 0 0 10px rgba(159, 216, 246, 0.35);
}

.cards-filter--active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -6px;
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(180, 230, 255, 0), rgba(180, 230, 255, 1), rgba(180, 230, 255, 0));
  box-shadow: 0 0 10px rgba(180, 230, 255, 0.7);
}

.cards-count {
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.52);
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.cards-item {
  position: relative;
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
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
}

.cards-item:active {
  transform: translateY(1px);
  border-color: color-mix(in srgb, var(--accent) 50%, rgba(255, 255, 255, 0.2));
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.28);
}

.cards-thumb {
  width: 100%;
  aspect-ratio: 3 / 5;
  border-radius: 12px;
  overflow: hidden;
  background: #ffffff;
  display: grid;
  place-items: center;
}

.cards-thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.cards-name {
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  position: relative;
}

.cards-meta {
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.6);
}

.cards-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(9, 13, 21, 0.72);
  color: rgba(214, 225, 242, 0.75);
}

.cards-search__icon {
  color: rgba(214, 225, 242, 0.6);
}

.cards-search__input {
  flex: 1;
  border: none;
  background: transparent;
  color: #e9edf4;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  outline: none;
}

.cards-search__input::placeholder {
  color: rgba(214, 225, 242, 0.4);
}

.cards-empty {
  text-align: center;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.55);
  padding: 12px 6px;
}

.oracle-actions {
  width: 100vw;
  max-width: 100vw;
  margin: 0 auto;
  margin-bottom: 0;
  border-radius: 22px 22px 0 0;
  padding: 8px 12px calc(env(safe-area-inset-bottom, 0px) + 24px);
  max-height: calc(100vh - 12px);
  display: flex;
  flex-direction: column;
  box-shadow: 0 -16px 46px rgba(0, 0, 0, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #ffffff;
  pointer-events: auto;
  background: #050d15;
}

.oracle-actions--full {
  min-height: 100vh;
  border-radius: 0;
  padding-top: calc(env(safe-area-inset-top, 0px) + 70px);
}

.sheet-handle {
  width: 36px;
  height: 3px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
  margin: 0 auto 10px;
}

.sheet-title {
  text-align: center;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.74);
}

.cards-sheet-header {
  position: relative;
  display: grid;
  align-items: center;
  justify-items: center;
  margin-bottom: 10px;
  padding: 0 44px;
}

.cards-sheet-back {
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

.card-detail {
  display: grid;
  gap: 12px;
  overflow: auto;
  flex: 1;
  min-height: 0;
  padding-bottom: 12px;
}

.card-detail__media {
  width: min(180px, 52vw);
  height: min(300px, 42vh);
  margin: 0 auto;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #ffffff;
}

.card-detail__media img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 12px;
  display: block;
}

.card-detail__title {
  text-align: center;
  font-size: 15px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.card-detail__meta {
  text-align: center;
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.6);
}

.card-detail__block {
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(10, 14, 22, 0.72);
  padding: 10px 12px;
  display: grid;
  gap: 6px;
}

.card-detail__label {
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.6);
}

.card-detail__text {
  font-size: 13px;
  line-height: 1.5;
  color: rgba(224, 234, 251, 0.82);
}

.card-detail__text p {
  margin: 0 0 6px;
}

.card-detail__text p:last-child {
  margin-bottom: 0;
}

.card-detail__keywords {
  display: grid;
  gap: 8px;
}

.card-detail__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.card-detail__tag {
  padding: 0 10px;
  min-height: 20px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(10, 14, 22, 0.6);
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.7);
  display: inline-flex;
  align-items: center;
  justify-content: center;
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

@media (min-width: 720px) {
  .cards-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
