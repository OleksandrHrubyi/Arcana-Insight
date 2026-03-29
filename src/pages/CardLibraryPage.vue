<template>
  <q-page class="cards-page">
    <div class="cards-bg" aria-hidden="true"></div>

    <div class="cards-content">
      <header class="cards-hero cards-hero--with-back">
        <button type="button" class="cards-back" @click="onBack">
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
        <button
          v-if="searchQuery"
          type="button"
          class="cards-search__clear"
          :aria-label="tt('cardsPage.clearSearch')"
          @click="clearSearch"
        >
          <q-icon name="close" size="14px" />
        </button>
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
import { useRouter } from 'vue-router'
import { t, currentLocale } from 'src/i18n'
import { loadTarotData } from 'src/helpers/tarotData'
import { loadTarotCardsSnapshot } from 'src/helpers/tarotDataSnapshotCore.js'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'

const locale = computed(() => currentLocale.value || 'en')
const tt = (key) => t(locale.value, key)
const router = useRouter()

const filters = [
  { id: 'all', labelKey: 'cardsPage.filters.all' },
  { id: 'major', labelKey: 'cardsPage.filters.major' },
  { id: 'wands', labelKey: 'cardsPage.filters.wands' },
  { id: 'cups', labelKey: 'cardsPage.filters.cups' },
  { id: 'swords', labelKey: 'cardsPage.filters.swords' },
  { id: 'pentacles', labelKey: 'cardsPage.filters.pentacles' },
]

const cards = ref([])
const activeFilter = ref('all')
const detailOpen = ref(false)
const selectedCard = ref(null)
const searchQuery = ref('')

const filteredCards = computed(() => {
  let result = cards.value
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

const hapticTap = async () => {
  if (!Capacitor.isNativePlatform()) return
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch (e) {
    console.error(e)
  }
}

const setFilter = async (id) => {
  if (activeFilter.value === id) return
  activeFilter.value = id
  await hapticTap()
}

const openCard = async (card) => {
  selectedCard.value = card
  detailOpen.value = true
  await hapticTap()
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
  void hapticTap()
}

const clearSearch = () => {
  searchQuery.value = ''
  void hapticTap()
}

const onBack = async () => {
  await hapticTap()
  router.back()
}

watch(detailOpen, (value) => {
  setBottomNavHidden(value)
})

onBeforeUnmount(() => {
  setBottomNavHidden(false)
  setBottomNavDark(false)
})

const initializeCardLibrary = async () => {
  const { cards: nextCards, error } = await loadTarotCardsSnapshot({ loadTarotData })
  cards.value = nextCards
  if (error) {
    console.warn('[CardLibrary] loadTarotData failed', error)
  }
}

const initializeCardLibrarySafe = async () => {
  try {
    await initializeCardLibrary()
  } catch (error) {
    cards.value = []
    console.warn('[CardLibrary] init failed', error)
  }
}

onMounted(() => {
  void initializeCardLibrarySafe()
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
  padding: calc(90px + env(safe-area-inset-top)) 18px calc(32px + env(safe-area-inset-bottom) + 84px);
  max-width: 540px;
  margin: 0 auto;
  display: grid;
  gap: 16px;
}

.cards-hero {
  display: grid;
  gap: 6px;
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
  gap: 4px;
  justify-items: center;
  padding: 0 44px;
}

.cards-title {
  font-size: 20px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 600;
  color: rgba(235, 242, 255, 0.96);
}

.cards-kicker {
  font-size: 10px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.62);
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
  padding: 6px 4px;
  border: none;
  background: transparent;
  color: rgba(214, 225, 242, 0.7);
  font-size: 13px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  white-space: nowrap;
  position: relative;
  font-weight: 500;
  transition: all 180ms ease;
}

.cards-filter--active {
  color: rgba(235, 242, 255, 0.96);
  text-shadow: 0 0 12px rgba(173, 210, 255, 0.4);
}

.cards-filter--active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -2px;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(173, 210, 255, 0), rgba(173, 210, 255, 1), rgba(173, 210, 255, 0));
  box-shadow: 0 0 10px rgba(173, 210, 255, 0.6);
}

.cards-search {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 18px;
  border: 1px solid rgba(130, 156, 200, 0.16);
  background: linear-gradient(165deg, rgba(8, 12, 20, 0.85), rgba(4, 6, 12, 0.9));
  color: rgba(214, 225, 242, 0.75);
  box-shadow:
    0 8px 20px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(186, 207, 247, 0.06);
  transition: all 180ms ease;
}

.cards-search:focus-within {
  border-color: rgba(173, 210, 255, 0.24);
  background: rgba(8, 12, 20, 0.9);
}

.cards-search__icon {
  color: rgba(173, 210, 255, 0.7);
}

.cards-search__input {
  flex: 1;
  border: none;
  background: transparent;
  color: rgba(235, 242, 255, 0.94);
  font-size: 13px;
  letter-spacing: 0.04em;
  outline: none;
}

.cards-search__input::placeholder {
  color: rgba(214, 225, 242, 0.4);
  text-transform: none;
}

.cards-search__clear {
  border: none;
  background: transparent;
  color: rgba(214, 225, 242, 0.6);
  display: grid;
  place-items: center;
  padding: 2px;
  transition: all 180ms ease;
}

.cards-search__clear:active {
  transform: scale(0.9);
}

.cards-count {
  font-size: 13px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.56);
  font-weight: 500;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.cards-item {
  position: relative;
  border-radius: 20px;
  padding: 14px;
  background: linear-gradient(165deg, rgba(8, 12, 20, 0.85), rgba(4, 6, 12, 0.9));
  border: 1px solid rgba(130, 156, 200, 0.16);
  box-shadow:
    0 16px 32px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(186, 207, 247, 0.06);
  display: grid;
  gap: 10px;
  text-align: center;
  transition: all 180ms ease;
}

.cards-item:active {
  transform: translateY(2px) scale(0.98);
  border-color: rgba(173, 210, 255, 0.3);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
}

.cards-thumb {
  width: 100%;
  aspect-ratio: 3 / 5;
  border-radius: 16px;
  overflow: hidden;
  background: #ffffff;
  display: grid;
  place-items: center;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.cards-thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.cards-name {
  font-size: 13px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  position: relative;
  font-weight: 500;
  color: rgba(235, 242, 255, 0.92);
}

.cards-meta {
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.64);
  font-weight: 500;
}

.cards-empty {
  text-align: center;
  font-size: 13px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.6);
  padding: 32px 16px;
  font-weight: 500;
}

.oracle-actions {
  width: 100vw;
  max-width: 100vw;
  margin: 0 auto;
  border-radius: 28px 28px 0 0;
  padding: 12px 16px calc(env(safe-area-inset-bottom, 0px) + 24px);
  max-height: calc(100vh - 12px);
  display: flex;
  flex-direction: column;
  box-shadow:
    0 -24px 56px rgba(0, 0, 0, 0.6),
    0 -4px 16px rgba(60, 90, 140, 0.12),
    inset 0 1px 0 rgba(186, 207, 247, 0.08);
  border: 1px solid rgba(130, 156, 200, 0.22);
  color: #ffffff;
  pointer-events: auto;
  background: linear-gradient(165deg, rgba(8, 12, 20, 0.98), rgba(4, 6, 12, 0.99));
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
  font-size: 13px;
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
  gap: 16px;
  overflow: auto;
  flex: 1;
  min-height: 0;
  padding-bottom: 16px;
}

.card-detail__media {
  width: min(200px, 56vw);
  height: min(330px, 46vh);
  margin: 0 auto;
  border-radius: 22px;
  overflow: hidden;
  border: 1px solid rgba(130, 156, 200, 0.2);
  background: #ffffff;
  box-shadow:
    0 24px 52px rgba(0, 0, 0, 0.6),
    0 2px 8px rgba(60, 90, 140, 0.15);
}

.card-detail__media img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.card-detail__title {
  text-align: center;
  font-size: 16px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 600;
  color: rgba(235, 242, 255, 0.96);
}

.card-detail__meta {
  text-align: center;
  font-size: 13px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.68);
  font-weight: 500;
}

.card-detail__block {
  border-radius: 18px;
  border: 1px solid rgba(130, 156, 200, 0.16);
  background: linear-gradient(165deg, rgba(8, 12, 20, 0.85), rgba(4, 6, 12, 0.9));
  padding: 14px 16px;
  display: grid;
  gap: 10px;
  box-shadow:
    0 8px 20px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(186, 207, 247, 0.06);
}

.card-detail__label {
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.62);
  font-weight: 600;
}

.card-detail__text {
  font-size: 14px;
  line-height: 1.65;
  color: rgba(224, 234, 251, 0.88);
  padding: 0 2px;
}

.card-detail__text p {
  margin: 0 0 10px;
}

.card-detail__text p:last-child {
  margin-bottom: 0;
}

.card-detail__keywords {
  display: grid;
  gap: 10px;
}

.card-detail__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.card-detail__tag {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(130, 156, 200, 0.2);
  background: rgba(8, 12, 20, 0.7);
  font-size: 13px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(235, 242, 255, 0.88);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
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
