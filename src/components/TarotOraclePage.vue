<template>
  <q-page class="tarot-page">
    <div ref="sceneRef" class="oracle-video-layer" aria-hidden="true">
      <video
        ref="videoRef"
        :class="['oracle-video', { 'oracle-video--visible': isVideoPlaying }]"
        autoplay
        muted
        loop
        playsinline
        preload="auto"
        @loadedmetadata="applyPlaybackRate"
        @canplay="ensureVideoPlayback"
        @playing="handleVideoPlaying"
        @pause="handleVideoPause"
        @waiting="handleVideoPause"
        @stalled="handleVideoPause"
      >
        <source src="/oracle-media/oracle-loop.mp4" type="video/mp4" />
      </video>
      <div class="oracle-smoke oracle-smoke--one"></div>
      <div class="oracle-smoke oracle-smoke--two"></div>
      <div
        v-if="showDeckHotspot"
        :class="['oracle-deck-aura', { 'oracle-deck-aura--revealed': isDeckHotspotActive }]"
        :style="deckAuraStyle"
        aria-hidden="true"
      ></div>
      <button
        v-if="showDeckHotspot"
        type="button"
        :class="['oracle-deck-hit', { 'oracle-deck-hit--lit': isDeckHotspotActive }]"
        :style="deckHitStyle"
        :aria-label="t.ui.ariaTouchDeck"
        @click.stop="touchDeck"
      ></button>
    </div>

    <div class="oracle-ui">
      <button
        type="button"
        class="oracle-exit"
        :aria-label="t.ui.ariaExit"
        @click="onExit"
      >
        ←
      </button>
      <transition name="oracle-dim-fade">
        <div v-if="isReadingActive" class="oracle-scene-dim" aria-hidden="true"></div>
      </transition>

      <section class="oracle-dialogue" :style="oracleDialogueStyle" aria-live="polite">
        <transition name="oracle-bubble-fade" mode="out-in">
          <p
            v-if="bubbleText"
            :key="bubbleKey"
            :class="[
              'oracle-dialogue__prompt',
              'oracle-bubble',
              isSummaryBubble ? 'oracle-bubble--summary' : 'oracle-bubble--normal',
              { 'oracle-bubble--clarify': isClarifyBubble },
            ]"
          >
            {{ bubbleText }}
          </p>
        </transition>
      </section>

      <section
        v-if="isReadingActive && spreadCards.length"
        :class="['oracle-spread', `oracle-spread--${selectedSpread || 1}`]"
        aria-live="polite"
      >
        <button
          v-for="(card, index) in spreadCards"
          :key="`${card.id || getCardTitle(card)}-${index}`"
          type="button"
          :class="[
            'oracle-card',
            { 'oracle-card--revealed': index < revealedCardsCount },
            { 'oracle-card--flipped': index < flippedCardsCount },
            { 'oracle-card--active': index === activeCardIndex },
          ]"
          :style="getSpreadCardStyle(index, spreadCards.length)"
          :disabled="index >= flippedCardsCount"
          @click="onCardTap(index)"
        >
          <span class="oracle-card__inner">
            <span class="oracle-card__face oracle-card__face--back">
              <span class="oracle-card__sigil">✦</span>
            </span>

            <span class="oracle-card__face oracle-card__face--front">
              <img
                class="oracle-card__image"
                :class="{ 'oracle-card__image--reversed': card.reversed }"
                :src="getCardImage(card)"
                :alt="getCardTitle(card)"
                loading="lazy"
                decoding="async"
              />
            </span>
          </span>
        </button>
      </section>

      <section v-if="showInterpretationActions" class="oracle-interpret" aria-live="polite">
        <p v-if="interpretationError" class="oracle-interpret__error">
          {{ interpretationError }}
        </p>
        <div class="oracle-interpret__actions">
          <button
            type="button"
            class="arcana-btn arcana-btn--secondary"
            :disabled="interpretationLoading"
            @click="declineInterpretation"
          >
            {{ noTitle }}
          </button>
          <button
            type="button"
            class="arcana-btn arcana-btn--primary"
            :disabled="interpretationLoading"
            @click="acceptInterpretation"
          >
            <q-spinner-dots v-if="interpretationLoading" size="18px" color="white" />
            <span v-else>{{ yesTitle }}</span>
          </button>
        </div>
      </section>

      <section
        v-if="showInterpretationFinishActions"
        class="oracle-interpret oracle-interpret--finish"
        aria-live="polite"
      >
        <div class="oracle-interpret__actions">
          <button
            type="button"
            class="arcana-btn arcana-btn--secondary"
            @click="onExit"
          >
            {{ t.choices.leaveSession }}
          </button>
          <button type="button" class="arcana-btn arcana-btn--primary" @click="acceptInterpretation">
            {{ t.choices.newInterpretation }}
          </button>
        </div>
      </section>

      <q-dialog
        v-model="cardPreviewOpen"
        maximized
        transition-show="slide-up"
        transition-hide="slide-down"
        :transition-duration="440"
        class="oracle-card-preview-dialog"
      >
        <section
          v-if="previewCard"
          class="oracle-card-preview"
          role="dialog"
          :aria-label="getCardTitle(previewCard)"
          @click.stop
        >
          <div class="oracle-card-preview__header">
            <button
              type="button"
              class="oracle-card-preview__back"
              :aria-label="t.ui.ariaBack"
              @click="cardPreviewOpen = false"
            >
              <q-icon name="chevron_left" size="18px" />
            </button>
            <div class="sheet-title">{{ t.ui.sheetCard }}</div>
          </div>

          <div class="oracle-card-preview__content">
            <div class="oracle-card-preview__media">
              <img
                class="oracle-card-preview__image"
                :class="{ 'oracle-card-preview__image--reversed': previewCard.reversed }"
                :src="getCardImage(previewCard)"
                :alt="getCardTitle(previewCard)"
              />
            </div>
            <p class="oracle-card-preview__title">{{ getCardTitle(previewCard) }}</p>
            <div class="oracle-card-preview__meta">
              {{ previewOrientationLabel }}
            </div>
            <div class="oracle-card-preview__text">
              <p v-for="(line, idx) in previewDescriptionLines" :key="`preview-${idx}`">
                {{ line }}
              </p>
            </div>
            <div v-if="previewKeywords.length" class="oracle-card-preview__keywords">
              <div class="oracle-card-preview__label">
                {{ previewKeywordsLabel }}
              </div>
              <div class="oracle-card-preview__tags">
                <span v-for="word in previewKeywords" :key="word" class="oracle-card-preview__tag">
                  {{ word }}
                </span>
              </div>
            </div>
          </div>

          <div class="oracle-actions__footer">
            <button type="button" class="arcana-btn arcana-btn--secondary" @click="cardPreviewOpen = false">
              {{ t.ui.sheetClose }}
            </button>
          </div>
        </section>
      </q-dialog>

      <q-dialog
        v-model="actionsSheetOpen"
        persistent
        position="bottom"
        transition-show="slide-up"
        transition-hide="slide-down"
        :transition-duration="440"
        class="oracle-actions-dialog"
      >
        <section class="oracle-actions">
          <div class="sheet-handle" aria-hidden="true"></div>
          <div class="sheet-title">{{ actionsSheetTitle }}</div>

          <div v-if="historyRows.length" class="oracle-history">
            <p v-for="row in historyRows" :key="row" class="oracle-history__item">{{ row }}</p>
          </div>

          <div v-if="showQuestionInput" class="oracle-question-wrap">
            <p class="oracle-question__label">{{ questionInputLabel }}</p>
            <textarea
              v-model="draftQuestion"
              class="oracle-question"
              rows="2"
              :placeholder="questionPlaceholder"
            ></textarea>
            <p v-if="questionValidationError" class="oracle-question__error">
              {{ questionValidationError }}
            </p>
          </div>

          <div class="oracle-wheel">
            <div class="oracle-wheel__window" aria-hidden="true"></div>
            <div ref="wheelRef" class="oracle-wheel__scroll" @scroll.passive="onWheelScroll">
              <div class="oracle-wheel__spacer"></div>
              <button
                v-for="(choice, index) in choices"
                :key="choice.label"
                type="button"
                class="oracle-wheel__item"
                :class="{
                  'oracle-wheel__item--active': index === selectedWheelIndex,
                  'oracle-wheel__item--disabled': Boolean(choice.disabled),
                }"
                :disabled="Boolean(choice.disabled)"
                @click="onWheelItemTap(index)"
              >
                {{ choice.label }}
              </button>
              <div class="oracle-wheel__spacer"></div>
            </div>
          </div>

          <div class="oracle-actions__footer">
            <button
              type="button"
              class="arcana-btn arcana-btn--primary"
              :disabled="selectedChoiceDisabled"
              @click="confirmWheelSelection"
            >
              {{ t.choices.ok }}
            </button>
          </div>
        </section>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onActivated, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { currentLocale, t as i18nT } from 'src/i18n'
import { loadTarotData } from 'src/helpers/tarotData'
import { DAILY_ACTIVITY_KEYS, markDailyActivity } from 'src/helpers/dailyRitual'
import {
  consumeRitualReward,
  ensureRitualRewardInventory,
  trackRitualActivityWithGuestFallback,
} from 'src/helpers/ritualRewardsBackend.js'
import {
  getRitualRewardQuantity,
  RITUAL_REWARD_KEYS,
} from 'src/helpers/ritualRewardInventory'
import { getTarotReading, getTarotClarify } from 'src/services/tarotOracle'
import { getUserNative, insertTarotReading } from 'src/services/supabaseNative'
import { analytics } from 'src/services/analytics'
import { PAYWALL_ENTRY_POINTS, TAROT_SESSION_EVENTS } from 'src/constants/analyticsEvents'
import { usePremiumAccess } from 'src/stores/premiumAccess'
import { useAuthStore } from 'stores/authStore.js'

const videoRef = ref(null)
const sceneRef = ref(null)
const narrationLine = ref('')
const currentPrompt = ref('')
// Adaptive clarifying question (premium, between the question and the draw).
const clarifierQuestion = ref('')
const clarifierOptions = ref([])
const clarifierLoading = ref(false)
const clarification = ref('')
const controlsUnlocked = ref(false)
const actionsSheetOpen = ref(false)
const wheelRef = ref(null)
const selectedWheelIndex = ref(0)
const isChoiceTransitioning = ref(false)
const lastWheelHapticAt = ref(0)
const isVideoPlaying = ref(false)
const currentLang = computed(() => {
  const locale = String(currentLocale.value || 'en').toLowerCase()
  return locale.startsWith('uk') ? 'uk' : 'en'
})
const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const { hasPremiumAccess } = usePremiumAccess()
const authStore = useAuthStore()

const stage = ref('intro')
const selectedTheme = ref('')
const selectedSubTheme = ref('')
const selectedSpread = ref(0)
const selectedQuestion = ref('')
const draftQuestion = ref('')
const deckAuraStyle = ref({})
const deckHitStyle = ref({})
const oracleDialogueStyle = ref({})
const isDeckHotspotActive = ref(false)
const isReadingActive = ref(false)
const spreadCards = ref([])
const revealedCardsCount = ref(0)
const flippedCardsCount = ref(0)
const activeCardIndex = ref(-1)
const cardPreviewOpen = ref(false)
const cardPreviewIndex = ref(-1)
const interpretationChoicesVisible = ref(false)
const interpretationDecision = ref('')
const interpretationLoading = ref(false)
const interpretationError = ref('')
const interpretationData = ref(null)
const entryFocusApplied = ref(false)
const loadingDots = ref(1)
let loadingDotsTimer = null
const tarotAiEnabled = import.meta.env.VITE_ENABLE_TAROT_AI === 'true'

const timers = []
let videoPlaybackWatchdog = null
const lastVariantByKey = ref({})
const WHEEL_ITEM_HEIGHT = 44
const ACTIONS_READ_DELAY = 980
const ACTIONS_HIDE_TO_NEXT_PROMPT_DELAY = 520
const INTRO_LINE_START_DELAY = 900
const INTRO_LINE_STEP_DELAY = 3400
const INTRO_LINES_TO_SHOW = 2
const INTRO_TO_THEME_DELAY = 1000
const THEME_CONFIRM_HOLD_DELAY = INTRO_LINE_STEP_DELAY

// The cinematic intro plays once per app session. Returning to /tarot (e.g. back
// from the interpretation screen) then skips straight to theme selection instead
// of replaying the full ~8s narration every time.
const INTRO_SEEN_SESSION_KEY = 'arcana_oracle_intro_seen_v1'
const hasSeenIntroThisSession = () => {
  try {
    return sessionStorage.getItem(INTRO_SEEN_SESSION_KEY) === '1'
  } catch {
    return false
  }
}
const markIntroSeenThisSession = () => {
  try {
    sessionStorage.setItem(INTRO_SEEN_SESSION_KEY, '1')
  } catch {
    // ignore storage failures
  }
}
const READY_HOTSPOT_REVEAL_DELAY = 1800
const QUESTION_MIN_LENGTH = 10
const QUESTION_MAX_LENGTH = 220
const DEAL_START_DELAY = 680
const DEAL_REVEAL_DELAY = 620
const DEAL_FLIP_DELAY = 620
const DEAL_FINISH_DELAY = 1100
const FREE_TAROT_DAILY_KEY = 'arcana_free_tarot_daily_v1'
const ENTRY_FOCUS_THEME_MAP = Object.freeze({
  love: 'relationships',
  career: 'work',
  money: 'money',
  self: 'self',
  energy: 'self',
  future: 'choice',
})
let controlsRevealToken = 0
const DECK_ANCHOR = Object.freeze({
  x: 0.728,
  y: 0.668,
  size: 0.18,
  offsetX: 20,
  offsetY: 80,
})
const ritualRewardTick = ref(0)
const pendingSpreadRewardKey = ref('')

const getRitualRewardUserId = () => String(authStore.state.user?.id || '').trim()

const refreshRitualRewardAccess = async (force = false) => {
  await ensureRitualRewardInventory({
    userId: getRitualRewardUserId(),
    force,
  })
  ritualRewardTick.value = Date.now()
}

const getExtraTarotSpreadTokens = () => {
  const nowTick = ritualRewardTick.value
  void nowTick
  return Math.max(
    0,
    getRitualRewardQuantity({
      rewardKey: RITUAL_REWARD_KEYS.extraTarotSpread,
      userId: getRitualRewardUserId(),
    }),
  )
}

const hasRouterBackTarget = () => {
  try {
    return typeof window !== 'undefined' && typeof window.history.state?.back === 'string' && window.history.state.back.length > 0
  } catch {
    return false
  }
}

async function onExit() {
  void impact(ImpactStyle.Light)
  if (hasRouterBackTarget()) {
    router.back()
    return
  }
  await router.push({ name: 'arcana' }).catch(() => {})
}

const getTodayKey = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const readFreeTarotUsage = () => {
  try {
    const raw = localStorage.getItem(FREE_TAROT_DAILY_KEY)
    if (!raw) return ''
    const parsed = JSON.parse(raw)
    return String(parsed?.date || '')
  } catch {
    return ''
  }
}

const hasUsedFreeTarotToday = () => {
  if (hasPremiumAccess.value) return false
  return readFreeTarotUsage() === getTodayKey()
}

const markFreeTarotUsedToday = () => {
  try {
    localStorage.setItem(
      FREE_TAROT_DAILY_KEY,
      JSON.stringify({
        date: getTodayKey(),
        usedAt: new Date().toISOString(),
      }),
    )
  } catch {
    // ignore storage errors
  }
}

const notifyFreeTarotDailyLimit = () => {
  const message = i18nT(currentLang.value, 'premiumAccess.tarot.dailyLimit')

  void analytics.logEvent(TAROT_SESSION_EVENTS.upsellShown, {
    ...buildTarotFunnelPayload(),
    source: PAYWALL_ENTRY_POINTS.tarotDailyLimit.source,
  })

  $q.notify({
    message,
    color: 'dark',
    textColor: 'white',
    position: 'bottom',
    timeout: 2600,
    actions: [
      {
        label: i18nT(currentLang.value, 'premiumAccess.cta'),
        color: 'primary',
        handler: () => {
          void openPremiumFromUpsell(PAYWALL_ENTRY_POINTS.tarotDailyLimit)
        },
      },
    ],
  })
}

const notifyPremiumSpreadLock = () => {
  const message = i18nT(currentLang.value, 'premiumAccess.spreads.notify')
  if (!message) return

  void analytics.logEvent(TAROT_SESSION_EVENTS.upsellShown, {
    ...buildTarotFunnelPayload(),
    source: PAYWALL_ENTRY_POINTS.tarotSpreadLock.source,
  })

  $q.notify({
    message,
    color: 'dark',
    textColor: 'white',
    position: 'bottom',
    timeout: 2600,
    actions: [
      {
        label: i18nT(currentLang.value, 'premiumAccess.cta'),
        color: 'primary',
        handler: () => {
          void openPremiumFromUpsell(PAYWALL_ENTRY_POINTS.tarotSpreadLock)
        },
      },
    ],
  })
}

const openPremiumFromUpsell = async (point) => {
  void analytics.logEvent(point.event, {
    source: point.source,
    entry: point.entry,
  })
  await router.push({
    name: 'premium',
    query: {
      source: point.source,
      entry: point.entry,
    },
  }).catch(() => {})
}
const ORACLE_HEAD_ANCHOR = Object.freeze({
  x: 0.49,
  y: 0.255,
  offsetX: 0,
  offsetY: -48,
})

const t = computed(() => {
  const value = i18nT(currentLang.value, 'tarotOracle')
  if (value && typeof value === 'object') {
    return value
  }
  return {
    actionsSheetTitle: '',
    questionInputLabel: '',
    questionPlaceholder: '',
    questionValidation: {
      tooShort: '',
      tooLong: '',
      meaningful: '',
    },
    themeLabels: {},
    subThemeLabels: {},
    questionTemplates: {},
    introSets: [],
    prompts: {
      theme: [],
      subTheme: [],
      questionMode: [],
      questionInput: [],
      spread: [],
      ready: [],
      started: [],
      empty: [],
      themeConfirm: [],
    },
    choices: {
      writeMyOwn: '',
      confirmQuestion: '',
      back: '',
      leaveSession: '',
      spread1: '',
      spread3: '',
      spread5: '',
      touchDeck: '',
      changeSpread: '',
      newQuestion: '',
      repeatSpread: '',
      ok: '',
      start: '',
    },
  }
})

const questionPlaceholder = computed(() => t.value.questionPlaceholder)
const questionInputLabel = computed(() => t.value.questionInputLabel)
const actionsSheetTitle = computed(() => t.value.actionsSheetTitle)
const subThemeLabels = computed(() => t.value.subThemeLabels)
const questionTemplates = computed(() => t.value.questionTemplates)
const cardPool = ref([])
const yesTitle = computed(() => i18nT(currentLang.value, 'yesTitle'))
const noTitle = computed(() => i18nT(currentLang.value, 'noTitle'))
const interpretationLoadingBase = computed(() => t.value.ui.loadingBase)
const interpretationLoadingLine = computed(
  () => `${interpretationLoadingBase.value}${'.'.repeat(loadingDots.value)}`,
)
const interpretationUnavailableLine = computed(() => i18nT(currentLang.value, 'errors.generic'))

// Fill {placeholder} tokens in a localized template string (src/i18n tarotOracle.ui.*).
const fillTemplate = (template, values = {}) =>
  String(template || '').replace(/\{(\w+)\}/g, (_, key) => (values[key] ?? ''))

const loadCardPool = async () => {
  const data = await loadTarotData()
  cardPool.value = (data?.cards || [])
    .filter((card) => card && card.file)
    .map((card) => ({
      id: card.id,
      titleUk: card?.name?.uk || card?.name?.en || 'Карта',
      titleEn: card?.name?.en || card?.name?.uk || 'Card',
      file: card.file,
      meaning: card?.meaning || null,
      keywords: card?.keywords || null,
      synopsis: card?.synopsis || null,
      description: card?.description || null,
    }))
}

const loadCardPoolSafe = async () => {
  try {
    await loadCardPool()
  } catch (error) {
    cardPool.value = []
    console.warn('[TarotOracle] loadCardPool failed', error)
  }
}

const cryptoRandomFloat = () => {
  const cryptoObj =
    (typeof globalThis !== 'undefined' && globalThis.crypto) ||
    (typeof window !== 'undefined' && window.crypto) ||
    null

  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const bytes = new Uint32Array(1)
    cryptoObj.getRandomValues(bytes)
    return bytes[0] / 4294967296
  }

  return Math.random()
}

const randomInt = (maxExclusive) => {
  if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) return 0
  return Math.floor(cryptoRandomFloat() * maxExclusive)
}

const pickVariant = (key, variants) => {
  if (!variants || variants.length === 0) {
    return ''
  }

  const prev = lastVariantByKey.value[key]
  let nextIndex = randomInt(variants.length)

  if (variants.length > 1 && nextIndex === prev) {
    nextIndex = (nextIndex + 1) % variants.length
  }

  lastVariantByKey.value[key] = nextIndex
  return variants[nextIndex]
}

const setPrompt = (promptKey) => {
  currentPrompt.value = pickVariant(promptKey, t.value.prompts[promptKey])
}

const drawCards = (count) => {
  const deck = [...cardPool.value]
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1)
    const temp = deck[i]
    deck[i] = deck[j]
    deck[j] = temp
  }
  return deck.slice(0, Math.max(1, count)).map((card) => ({
    ...card,
    reversed: cryptoRandomFloat() < 0.24,
  }))
}

const impact = async (style = ImpactStyle.Light) => {
  if (!Capacitor.isNativePlatform()) {
    return
  }
  try {
    await Haptics.impact({ style })
  } catch {
    // Haptics are cosmetic; ignore unsupported-device failures.
  }
}

const triggerDeckReadyHaptic = () => {
  if (!Capacitor.isNativePlatform()) {
    return
  }

  void impact(ImpactStyle.Light)
  schedule(140, () => {
    if (stage.value === 'ready' && isDeckHotspotActive.value) {
      void impact(ImpactStyle.Medium)
    }
  })
}

const revealControlsWithDelay = (delay = 1100) => {
  controlsUnlocked.value = false
  const token = ++controlsRevealToken

  schedule(delay + ACTIONS_READ_DELAY, () => {
    if (token !== controlsRevealToken) {
      return
    }
    controlsUnlocked.value = true
  })
}

const applyPlaybackRate = () => {
  if (videoRef.value) {
    videoRef.value.playbackRate = 0.75
  }
  updateDeckHotspotPosition()
  ensureVideoPlayback()
}

const getContainedVideoRect = () => {
  const scene = sceneRef.value
  const video = videoRef.value
  if (!scene || !video) {
    return null
  }

  const sceneRect = scene.getBoundingClientRect()
  if (!sceneRect.width || !sceneRect.height) {
    return null
  }

  const sourceWidth = video.videoWidth || 1080
  const sourceHeight = video.videoHeight || 1920
  const sourceRatio = sourceWidth / sourceHeight
  const boxRatio = sceneRect.width / sceneRect.height

  let renderWidth
  let renderHeight
  let offsetLeft = 0
  let offsetTop = 0

  if (boxRatio > sourceRatio) {
    renderHeight = sceneRect.height
    renderWidth = renderHeight * sourceRatio
    offsetLeft = (sceneRect.width - renderWidth) / 2
  } else {
    renderWidth = sceneRect.width
    renderHeight = renderWidth / sourceRatio
    offsetTop = (sceneRect.height - renderHeight) / 2
  }

  return {
    left: offsetLeft,
    top: offsetTop,
    width: renderWidth,
    height: renderHeight,
  }
}

const updateDeckHotspotPosition = () => {
  const rect = getContainedVideoRect()
  if (!rect) {
    return
  }

  const centerX = rect.left + rect.width * DECK_ANCHOR.x + DECK_ANCHOR.offsetX
  const centerY = rect.top + rect.height * DECK_ANCHOR.y + DECK_ANCHOR.offsetY
  const size = Math.max(
    72,
    Math.min(136, Math.round(Math.min(rect.width, rect.height) * DECK_ANCHOR.size)),
  )

  deckAuraStyle.value = {
    left: `${centerX}px`,
    top: `${centerY}px`,
    '--aura-size': `${size}px`,
  }
  deckHitStyle.value = {
    left: `${centerX}px`,
    top: `${centerY}px`,
    '--aura-hit-size': `${size + 40}px`,
  }

  const dialogueX = rect.left + rect.width * ORACLE_HEAD_ANCHOR.x + ORACLE_HEAD_ANCHOR.offsetX
  const dialogueY = rect.top + rect.height * ORACLE_HEAD_ANCHOR.y + ORACLE_HEAD_ANCHOR.offsetY
  oracleDialogueStyle.value = {
    left: `${dialogueX}px`,
    top: `${dialogueY}px`,
  }
}

const ensureVideoPlayback = () => {
  const video = videoRef.value
  if (!video) {
    return
  }

  video.setAttribute('muted', '')
  video.setAttribute('playsinline', '')
  video.defaultMuted = true
  video.playsInline = true
  video.autoplay = true
  if (video.muted !== true) {
    video.muted = true
  }
  if (video.playbackRate !== 0.75) {
    video.playbackRate = 0.75
  }
  video.setAttribute('webkit-playsinline', 'true')
  video.setAttribute('x5-playsinline', 'true')
  video.setAttribute('x5-video-player-type', 'h5')
  video.setAttribute('disablepictureinpicture', 'true')
  video.setAttribute('disableremoteplayback', 'true')

  const playPromise = video.play()
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {})
  }
}

const handleVideoPlaying = () => {
  isVideoPlaying.value = true
  updateDeckHotspotPosition()
}

const handleVideoPause = () => {
  isVideoPlaying.value = false
  ensureVideoPlayback()
}

const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    ensureVideoPlayback()
  }
}

const schedule = (delay, fn) => {
  const timer = window.setTimeout(fn, delay)
  timers.push(timer)
}

const leaveSession = () => {
  router.push({ name: 'arcana' }).catch(() => {})
}

const withLeaveSession = (items) => [
  ...items,
  { label: t.value.choices.leaveSession, action: leaveSession },
]

const askThemePrimary = () => {
  selectedTheme.value = ''
  selectedSubTheme.value = ''
  selectedQuestion.value = ''
  selectedSpread.value = 0
  pendingSpreadRewardKey.value = ''
  draftQuestion.value = ''
  clarifierQuestion.value = ''
  clarifierOptions.value = []
  clarifierLoading.value = false
  clarification.value = ''
  isReadingActive.value = false
  spreadCards.value = []
  revealedCardsCount.value = 0
  flippedCardsCount.value = 0
  activeCardIndex.value = -1
  cardPreviewOpen.value = false
  cardPreviewIndex.value = -1
  resetInterpretationState()
  stage.value = 'theme'
  setPrompt('theme')
  if (applyRouteEntryFocusIfNeeded()) {
    return
  }
  revealControlsWithDelay(1400)
}

const openCustomQuestionInput = ({ resetDraft = true } = {}) => {
  stage.value = 'question_input'
  setPrompt('questionMode')
  if (resetDraft) {
    draftQuestion.value = ''
  } else if (!draftQuestion.value.trim() && selectedQuestion.value) {
    draftQuestion.value = selectedQuestion.value
  }
  revealControlsWithDelay(900)
}

const pickTheme = (theme) => {
  selectedTheme.value = theme
  selectedSubTheme.value = ''

  stage.value = 'theme_confirm'
  controlsUnlocked.value = false
  controlsRevealToken += 1
  const confirmTemplate = pickVariant('themeConfirm', t.value.prompts.themeConfirm)
  currentPrompt.value = confirmTemplate.replace('{theme}', t.value.themeLabels[theme] ?? '')

  schedule(THEME_CONFIRM_HOLD_DELAY, () => {
    if (stage.value !== 'theme_confirm') {
      return
    }

    if (theme === 'default') {
      openCustomQuestionInput({ resetDraft: true })
      return
    }

    stage.value = 'subtheme'
    setPrompt('subTheme')
    revealControlsWithDelay(950)
  })
}

function normalizeEntryFocusTheme(value) {
  const key = String(value || '')
    .trim()
    .toLowerCase()
  return ENTRY_FOCUS_THEME_MAP[key] || ''
}

function applyRouteEntryFocusIfNeeded() {
  if (entryFocusApplied.value) return false
  const nextTheme = normalizeEntryFocusTheme(route.query?.focus)
  if (!nextTheme) return false
  entryFocusApplied.value = true
  pickTheme(nextTheme)
  return true
}

const pickSubTheme = (subTheme) => {
  selectedSubTheme.value = subTheme
  stage.value = 'question_mode'
  setPrompt('questionMode')
  revealControlsWithDelay(900)
}

const toSubTheme = () => {
  stage.value = 'subtheme'
  setPrompt('subTheme')
  revealControlsWithDelay(900)
}

const pickTemplate = (template) => {
  selectedQuestion.value = template
  void maybeAskClarifier()
}

const proceedToSpread = () => {
  stage.value = 'spread_primary'
  setPrompt('spread')
  revealControlsWithDelay(850)
}

// Like a reader narrowing your question before laying cards: ask ONE adaptive
// follow-up. Premium + AI only; any failure falls straight through to the spread,
// so the existing flow is the fallback and nothing can break.
const maybeAskClarifier = async () => {
  if (!hasPremiumAccess.value || !tarotAiEnabled) {
    proceedToSpread()
    return
  }

  clarification.value = ''
  clarifierQuestion.value = ''
  clarifierOptions.value = []
  clarifierLoading.value = true
  stage.value = 'clarify'
  controlsUnlocked.value = false
  actionsSheetOpen.value = false
  currentPrompt.value = t.value.ui.clarifyThinking

  try {
    const result = await getTarotClarify({
      locale: currentLang.value,
      theme: selectedTheme.value,
      themeLabel: t.value.themeLabels[selectedTheme.value] || t.value.themeLabels.default,
      subTheme: selectedSubTheme.value || '',
      subThemeLabel: subThemeLabels.value?.[selectedTheme.value]?.[selectedSubTheme.value] || '',
      question: selectedQuestion.value || '',
    })

    // User left the clarify stage while waiting, or nothing usable came back.
    if (stage.value !== 'clarify' || !result?.question) {
      if (stage.value === 'clarify') proceedToSpread()
      return
    }

    clarifierQuestion.value = result.question
    clarifierOptions.value = result.options
    currentPrompt.value = result.question
    revealControlsWithDelay(700)
  } catch (error) {
    console.error(error)
    if (stage.value === 'clarify') proceedToSpread()
  } finally {
    clarifierLoading.value = false
  }
}

const answerClarifier = (optionText) => {
  if (stage.value !== 'clarify') return
  void impact(ImpactStyle.Light)
  clarification.value = String(optionText || '')
  proceedToSpread()
}

const normalizeQuestionDraft = (value) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()

const getQuestionValidationError = (value) => {
  const text = normalizeQuestionDraft(value)
  if (!text) {
    return ''
  }

  if (text.length < QUESTION_MIN_LENGTH) {
    return t.value.questionValidation.tooShort
  }

  if (text.length > QUESTION_MAX_LENGTH) {
    return t.value.questionValidation.tooLong
  }

  const meaningfulChars = text.match(/[\p{L}\p{N}]/gu) || []
  if (meaningfulChars.length < 4) {
    return t.value.questionValidation.meaningful
  }

  return ''
}

const confirmQuestion = () => {
  const value = normalizeQuestionDraft(draftQuestion.value)

  if (!value) {
    setPrompt('empty')
    return
  }

  const error = getQuestionValidationError(value)
  if (error) {
    return
  }

  selectedQuestion.value = value
  void maybeAskClarifier()
}

const clampText = (text, max = 42) => {
  const value = String(text || '').trim()
  if (value.length <= max) {
    return value
  }
  return `${value.slice(0, max - 1)}…`
}

const buildReadySummaryWithTouchPrompt = (spread) => {
  const ui = t.value.ui
  const themeLabel = t.value.themeLabels[selectedTheme.value] || t.value.themeLabels.default
  const subThemeLabelRaw =
    subThemeLabels.value?.[selectedTheme.value]?.[selectedSubTheme.value] ||
    subThemeLabels.value?.default?.[selectedSubTheme.value] ||
    selectedSubTheme.value
  const subThemeLabel = String(subThemeLabelRaw || '').trim()
  const question = clampText(selectedQuestion.value, 46)
  const spreadLabel = ui.spreadLabels[spread]
  const touchPrompt = pickVariant('ready', t.value.prompts.ready)
  const subThemeLine = subThemeLabel
    ? fillTemplate(ui.summarySubthemeLine, { subtheme: subThemeLabel })
    : ''

  return fillTemplate(ui.summaryLine, {
    theme: themeLabel,
    subtheme: subThemeLine,
    question,
    depth: spreadLabel,
    touch: touchPrompt,
  })
}

const setSpread = (spread, options = {}) => {
  const usesReward = Boolean(options.usesReward)
  selectedSpread.value = spread
  pendingSpreadRewardKey.value = usesReward ? RITUAL_REWARD_KEYS.extraTarotSpread : ''
  stage.value = 'ready'
  controlsUnlocked.value = false
  actionsSheetOpen.value = false
  isReadingActive.value = false
  spreadCards.value = []
  revealedCardsCount.value = 0
  flippedCardsCount.value = 0
  activeCardIndex.value = -1
  cardPreviewOpen.value = false
  cardPreviewIndex.value = -1
  resetInterpretationState()
  currentPrompt.value = buildReadySummaryWithTouchPrompt(spread)
}

const selectSpreadWithAccess = async (spread) => {
  void analytics.logEvent(TAROT_SESSION_EVENTS.spreadSelected, {
    spread: String(spread),
    theme: String(selectedTheme.value || 'unknown'),
    premium: hasPremiumAccess.value ? 'true' : 'false',
    premium_required: spread !== 1 && !hasPremiumAccess.value ? 'true' : 'false',
    has_reward_token: getExtraTarotSpreadTokens() > 0 ? 'true' : 'false',
  })

  if (spread === 1 && !hasPremiumAccess.value && hasUsedFreeTarotToday()) {
    notifyFreeTarotDailyLimit()
    return
  }

  if (spread === 1 || hasPremiumAccess.value) {
    setSpread(spread, { usesReward: false })
    return
  }

  const tokenCount = getExtraTarotSpreadTokens()
  if (tokenCount > 0) {
    setSpread(spread, { usesReward: true })
    return
  }

  notifyPremiumSpreadLock()
}

// Theme-aware position set for 3- and 5-card spreads (relationships → You/Them/…,
// decision → Option A/B/…). Returns null for 1-card or unknown themes, so those
// fall back to the generic Root/Focus/Vector labels — i.e. unchanged behaviour.
const resolveThemeSpread = (total) => {
  const totalKey = total === 3 ? 'three' : total === 5 ? 'five' : null
  if (!totalKey) return null
  const spreads = i18nT(currentLang.value, 'tarotSpreads')
  const set = spreads?.[selectedTheme.value]?.[totalKey]
  return Array.isArray(set) ? set : null
}

const getCardRole = (index, total) => {
  const themed = resolveThemeSpread(total)
  if (themed?.[index]?.label) return themed[index].label
  const ui = t.value.ui
  const fallback = `${ui.cardN} ${index + 1}`
  if (total === 1) return ui.roleCore
  if (total === 3) return ui.roles3[index] || fallback
  if (total === 5) return ui.roles5[index] || fallback
  return fallback
}

// The explanatory line shown under each position on the interpretation screen.
// Theme-aware when available, otherwise the generic per-position meanings.
const getPositionMeaning = (index, total) => {
  const themed = resolveThemeSpread(total)
  if (themed?.[index]?.meaning) return themed[index].meaning
  const generic = i18nT(currentLang.value, 'tarotInterpretation.positions')
  const totalKey = total === 1 ? 'one' : total === 3 ? 'three' : total === 5 ? 'five' : null
  const set = totalKey && generic ? generic[totalKey] : null
  return (Array.isArray(set) && set[index]) || ''
}

const getCardTitle = (card) =>
  (currentLang.value === 'uk' ? card?.titleUk : card?.titleEn) ||
  card?.titleEn ||
  card?.titleUk ||
  'Card'

const getCardImage = (card) => `/images/cards/${card.file}`
const previewCard = computed(() => spreadCards.value[cardPreviewIndex.value] || null)
const previewOrientationLabel = computed(() => {
  if (!previewCard.value) return ''
  const key = previewCard.value.reversed ? 'cardsPage.reversed' : 'cardsPage.upright'
  return i18nT(currentLang.value, key)
})
const previewKeywordsLabel = computed(() => i18nT(currentLang.value, 'cardsPage.keywords'))
const previewDescriptionLines = computed(() => {
  if (!previewCard.value) return []
  const orientation = previewCard.value.reversed ? 'reversed' : 'upright'
  const source =
    previewCard.value.description?.[orientation] || previewCard.value.meaning?.[orientation]
  return getCardText(source, currentLang.value)
})
const previewKeywords = computed(() => {
  if (!previewCard.value) return []
  return previewCard.value.keywords?.[currentLang.value] || previewCard.value.keywords?.en || []
})

const revealedCardList = computed(() =>
  spreadCards.value.slice(0, flippedCardsCount.value).map((card, index) => {
    const title = getCardTitle(card)
    const reversedSuffix = card?.reversed ? t.value.ui.reversedSuffix : ''

    return {
      index,
      title,
      label: `${index + 1}. ${title}${reversedSuffix}`,
    }
  }),
)

const revealedCardListText = computed(() =>
  revealedCardList.value.map((item) => item.label).join('\n'),
)

const buildCardRevealPrompt = (card, index, total) => {
  const role = getCardRole(index, total)
  const title = getCardTitle(card)
  const reversedTag = card?.reversed ? t.value.ui.reversedTag : ''

  return `${role}.\n${title}${reversedTag}.`
}

const getCardText = (source, locale) => {
  const text = source?.[locale] || source?.en || ''
  return String(text || '')
    .split('\n\n')
    .filter(Boolean)
}

const buildReadingReadyPrompt = () => t.value.ui.readingReady

const resetInterpretationState = () => {
  interpretationChoicesVisible.value = false
  interpretationDecision.value = ''
  interpretationLoading.value = false
  interpretationError.value = ''
  interpretationData.value = null
}

const getPositionKey = (index, total) => {
  if (total === 1) return ['core'][index] || 'core'
  if (total === 3) return ['root', 'focus', 'vector'][index] || `card_${index + 1}`
  if (total === 5) return ['base', 'past', 'now', 'shadow', 'vector'][index] || `card_${index + 1}`
  return `card_${index + 1}`
}

const getCardMeaningText = (card) => {
  const orientation = card?.reversed ? 'reversed' : 'upright'
  return card?.meaning?.[orientation]?.[currentLang.value] || card?.meaning?.[orientation]?.en || ''
}

const getCardKeywords = (card) => {
  return card?.keywords?.[currentLang.value] || card?.keywords?.en || []
}

const getCardDetailText = (card) => {
  const orientation = card?.reversed ? 'reversed' : 'upright'
  return (
    card?.description?.[orientation]?.[currentLang.value] ||
    card?.description?.[orientation]?.en ||
    card?.synopsis?.[currentLang.value] ||
    card?.synopsis?.en ||
    ''
  )
}

const buildInterpretationPayload = () => {
  const themeLabel = t.value.themeLabels[selectedTheme.value] || t.value.themeLabels.default
  const subThemeLabelRaw =
    subThemeLabels.value?.[selectedTheme.value]?.[selectedSubTheme.value] ||
    subThemeLabels.value?.default?.[selectedSubTheme.value] ||
    selectedSubTheme.value
  const subThemeLabel = String(subThemeLabelRaw || '').trim()
  const total = spreadCards.value.length || selectedSpread.value || 1

  return {
    locale: currentLang.value,
    theme: selectedTheme.value,
    themeLabel,
    subTheme: selectedSubTheme.value || '',
    subThemeLabel,
    question: selectedQuestion.value || '',
    clarifyQuestion: clarifierQuestion.value || '',
    clarifyAnswer: clarification.value || '',
    depth: total,
    cards: spreadCards.value.map((card, index) => ({
      position: getPositionKey(index, total),
      positionLabel: getCardRole(index, total),
      cardTitle: getCardTitle(card),
      reversed: Boolean(card?.reversed),
      meaning: getCardMeaningText(card),
      keywords: getCardKeywords(card),
    })),
  }
}

const buildBasicInterpretation = (payload) => {
  const ui = t.value.ui
  const total = spreadCards.value.length || selectedSpread.value || 1
  const cards = spreadCards.value.map((card, index) => {
    const message = String(getCardMeaningText(card) || '').trim()
    const detail = String(getCardDetailText(card) || '').trim()

    return {
      position: getPositionKey(index, total),
      positionLabel: getCardRole(index, total),
      cardTitle: getCardTitle(card),
      message: message || detail || getCardTitle(card),
      detail: detail && detail !== message ? detail : '',
      question: '',
    }
  })

  return {
    summaryTitle: ui.basicTitle,
    opening: ui.basicOpening,
    summary: payload?.question ? fillTemplate(ui.basicFocus, { question: payload.question }) : '',
    advice: '',
    cards,
  }
}

const trimInterpretationText = (value, max = 220) => {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return ''
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trimEnd()}…`
}

const buildPremiumStructuredFallback = (payload, { aiUnavailable = false } = {}) => {
  const ui = t.value.ui
  const total = spreadCards.value.length || selectedSpread.value || 1
  const cards = spreadCards.value.map((card, index) => {
    const role = getCardRole(index, total)
    const meaning = trimInterpretationText(getCardMeaningText(card), 170)
    const detail = trimInterpretationText(getCardDetailText(card), 220)
    const keywords = getCardKeywords(card).slice(0, 3)
    const keywordsLine = keywords.length
      ? fillTemplate(ui.premiumKeywords, { keywords: keywords.join(', ') })
      : ''
    const question = fillTemplate(ui.premiumActionFocus, { role })

    return {
      position: getPositionKey(index, total),
      positionLabel: role,
      cardTitle: getCardTitle(card),
      message: meaning || detail || getCardTitle(card),
      detail: [detail, keywordsLine].filter(Boolean).join(' '),
      question,
    }
  })

  const primary = cards[0]?.message || ''
  const secondary = cards[1]?.message || ''
  const allKeywords = spreadCards.value
    .flatMap((card) => getCardKeywords(card))
    .map((word) => String(word || '').trim())
    .filter(Boolean)
    .filter((word, index, arr) => arr.indexOf(word) === index)
    .slice(0, 6)
  const keywordsSummary = allKeywords.length
    ? fillTemplate(ui.premiumRecurring, { keywords: allKeywords.join(', ') })
    : ''
  const focusLabel =
    payload?.question || payload?.subThemeLabel || payload?.themeLabel || ui.premiumDefaultFocus

  const opening = aiUnavailable
    ? ui.premiumOpeningUnavailable
    : fillTemplate(ui.premiumOpeningFocus, { focus: focusLabel })

  const summary = [primary, secondary, keywordsSummary].filter(Boolean).join(' ')
  const advice = ui.premiumAdvice

  return {
    summaryTitle: ui.premiumTitle,
    opening,
    summary,
    advice,
    cards,
  }
}

const persistInterpretationAndOpen = async (data, payload) => {
  // Attach each position's explanatory line (theme-aware) so the interpretation
  // screen can show it regardless of source (basic, fallback, or AI).
  if (Array.isArray(data?.cards)) {
    const total = Number(payload?.depth) || data.cards.length
    data.cards = data.cards.map((card, index) => ({
      ...card,
      positionMeaning: card.positionMeaning || getPositionMeaning(index, total),
    }))
  }
  interpretationData.value = data
  try {
    sessionStorage.setItem(
      'tarot-interpretation-v1',
      JSON.stringify({
        reading: data,
        meta: {
          themeLabel: payload.themeLabel || '',
          subThemeLabel: payload.subThemeLabel || '',
          question: payload.question || '',
        },
        visuals: spreadCards.value.map((card) => ({
          file: card.file,
          reversed: Boolean(card.reversed),
        })),
      }),
    )
  } catch (error) {
    console.error(error)
  }

  router.push({ name: 'tarotInterpretation' }).catch(() => {})

  // Save in background so DB hiccups never block navigation to interpretation.
  void saveReadingToDatabase(data, payload).catch((error) => {
    console.error('Failed to save reading to database:', error)
  })
}

const getCardPromptHold = (card, index, total) => {
  const prompt = buildCardRevealPrompt(card, index, total)
  const baseDelay = currentLang.value === 'uk' ? 1800 : 1650
  return Math.max(baseDelay, Math.min(3000, baseDelay + prompt.length * 18))
}

const getSpreadCardStyle = (index, total) => {
  const fallback = { rotate: 0, rise: 0 }
  const map = {
    1: [{ rotate: 0, rise: 0 }],
    3: [
      { rotate: -8, rise: 2 },
      { rotate: 0, rise: -6 },
      { rotate: 8, rise: 2 },
    ],
    5: [
      { rotate: -13, rise: 7 },
      { rotate: -6, rise: 2 },
      { rotate: 0, rise: -8 },
      { rotate: 6, rise: 2 },
      { rotate: 13, rise: 7 },
    ],
  }
  const entry = map[total]?.[index] || fallback
  return {
    '--card-rot': `${entry.rotate}deg`,
    '--card-rise': `${entry.rise}px`,
  }
}

const startSpreadScene = () => {
  const count = selectedSpread.value || 1
  spreadCards.value = drawCards(count)
  revealedCardsCount.value = 0
  flippedCardsCount.value = 0
  activeCardIndex.value = -1
  isReadingActive.value = true

  schedule(DEAL_START_DELAY, () => {
    if (stage.value !== 'started') {
      return
    }
    const revealNextCard = (index) => {
      if (stage.value !== 'started') {
        return
      }

      const card = spreadCards.value[index]
      if (!card) {
        schedule(DEAL_FINISH_DELAY, () => {
          if (stage.value !== 'started') {
            return
          }
          activeCardIndex.value = spreadCards.value.length - 1
          void impact(ImpactStyle.Heavy)
          currentPrompt.value = buildReadingReadyPrompt()
          void analytics.logEvent(TAROT_SESSION_EVENTS.cardsRevealed, buildTarotFunnelPayload())
        })
        return
      }

      revealedCardsCount.value = index + 1
      activeCardIndex.value = index
      void impact(ImpactStyle.Light)

      schedule(DEAL_REVEAL_DELAY, () => {
        if (stage.value !== 'started') {
          return
        }
        currentPrompt.value = buildCardRevealPrompt(card, index, spreadCards.value.length)
      })

      schedule(DEAL_FLIP_DELAY, () => {
        if (stage.value !== 'started') {
          return
        }
        flippedCardsCount.value = Math.max(flippedCardsCount.value, index + 1)
        void impact(ImpactStyle.Medium)

        schedule(getCardPromptHold(card, index, spreadCards.value.length), () => {
          revealNextCard(index + 1)
        })
      })
    }

    revealNextCard(0)
  })
}

const touchDeck = async () => {
  if (stage.value !== 'ready' || !isDeckHotspotActive.value) {
    return
  }

  // Captured before consumeRitualReward clears pendingSpreadRewardKey below.
  const usesReward = !hasPremiumAccess.value && Boolean(pendingSpreadRewardKey.value)

  if (!hasPremiumAccess.value && hasUsedFreeTarotToday()) {
    notifyFreeTarotDailyLimit()
    return
  }

  if (!hasPremiumAccess.value && (selectedSpread.value || 1) === 1) {
    markFreeTarotUsedToday()
  }

  if (!hasPremiumAccess.value && pendingSpreadRewardKey.value) {
    const consumeResult = await consumeRitualReward(pendingSpreadRewardKey.value, {
      source: 'tarot_spread_start',
      userId: getRitualRewardUserId(),
    })
    if (!consumeResult.ok) {
      pendingSpreadRewardKey.value = ''
      notifyPremiumSpreadLock()
      await refreshRitualRewardAccess(true)
      return
    }
    pendingSpreadRewardKey.value = ''
    await refreshRitualRewardAccess(false)
  }

  markDailyActivity(DAILY_ACTIVITY_KEYS.tarot)
  void trackRitualActivityWithGuestFallback(DAILY_ACTIVITY_KEYS.tarot, {
    source: 'tarot_oracle',
    userId: authStore.state.user?.id || '',
  })

  void analytics.logEvent(TAROT_SESSION_EVENTS.drawStart, {
    ...buildTarotFunnelPayload(),
    uses_reward: usesReward ? 'true' : 'false',
  })

  void impact(ImpactStyle.Light)
  stage.value = 'started'
  currentPrompt.value = ''
  controlsUnlocked.value = false
  actionsSheetOpen.value = false
  isDeckHotspotActive.value = false
  cardPreviewOpen.value = false
  cardPreviewIndex.value = -1
  resetInterpretationState()
  startSpreadScene()
}

const onCardTap = (index) => {
  if (
    index < 0 ||
    index >= flippedCardsCount.value ||
    !spreadCards.value[index] ||
    flippedCardsCount.value < spreadCards.value.length
  ) {
    return
  }

  activeCardIndex.value = index
  void impact(ImpactStyle.Light)
  currentPrompt.value = buildCardRevealPrompt(
    spreadCards.value[index],
    index,
    spreadCards.value.length,
  )
  cardPreviewIndex.value = index
  cardPreviewOpen.value = true
}

const toQuestionMode = () => {
  if (selectedTheme.value === 'default') {
    openCustomQuestionInput({ resetDraft: false })
    return
  }

  if (!selectedSubTheme.value) {
    stage.value = 'subtheme'
    setPrompt('subTheme')
    revealControlsWithDelay(900)
    return
  }

  stage.value = 'question_mode'
  setPrompt('questionMode')
  revealControlsWithDelay(900)
}

const backFromQuestionInput = () => {
  if (selectedTheme.value === 'default') {
    askThemePrimary()
    return
  }
  toQuestionMode()
}

const historyRows = computed(() => {
  const rows = []
  const ui = t.value.ui
  const labelTheme = ui.histTheme
  const labelSubTheme = ui.histSubtheme
  const labelQuestion = ui.histQuestion
  const labelSpread = ui.histSpread
  const spreadLabels = ui.spreadLabels

  if (selectedTheme.value) {
    rows.push(
      `${labelTheme}: ${t.value.themeLabels[selectedTheme.value] || t.value.themeLabels.default}`,
    )
  }

  if (selectedTheme.value && selectedSubTheme.value) {
    const subThemeLabel =
      subThemeLabels.value?.[selectedTheme.value]?.[selectedSubTheme.value] ||
      subThemeLabels.value?.default?.[selectedSubTheme.value] ||
      selectedSubTheme.value
    rows.push(`${labelSubTheme}: ${subThemeLabel}`)
  }

  if (selectedQuestion.value) {
    const cut =
      selectedQuestion.value.length > 72
        ? `${selectedQuestion.value.slice(0, 72)}…`
        : selectedQuestion.value
    rows.push(`${labelQuestion}: ${cut}`)
  }

  if (selectedSpread.value) {
    rows.push(`${labelSpread}: ${spreadLabels[selectedSpread.value]}`)
  }

  return rows
})

const isReadingComplete = computed(
  () =>
    stage.value === 'started' &&
    spreadCards.value.length > 0 &&
    flippedCardsCount.value >= spreadCards.value.length,
)
const showInterpretationActions = computed(
  () =>
    isReadingComplete.value &&
    interpretationChoicesVisible.value &&
    !interpretationLoading.value &&
    !interpretationData.value,
)
const showInterpretationFinishActions = computed(
  () =>
    isReadingComplete.value &&
    interpretationDecision.value === 'no' &&
    !interpretationLoading.value &&
    !interpretationData.value,
)

const choices = computed(() => {
  if (stage.value === 'theme') {
    return withLeaveSession([
      { label: t.value.themeLabels.relationships, action: () => pickTheme('relationships') },
      { label: t.value.themeLabels.work, action: () => pickTheme('work') },
      { label: t.value.themeLabels.money, action: () => pickTheme('money') },
      { label: t.value.themeLabels.choice, action: () => pickTheme('choice') },
      { label: t.value.themeLabels.self, action: () => pickTheme('self') },
      { label: t.value.themeLabels.default, action: () => pickTheme('default') },
    ])
  }

  if (stage.value === 'theme_confirm') {
    return []
  }

  if (stage.value === 'clarify') {
    if (clarifierLoading.value) {
      return []
    }
    return withLeaveSession([
      ...clarifierOptions.value.map((option) => ({
        label: option,
        action: () => answerClarifier(option),
      })),
      { label: t.value.ui.clarifySkip, action: () => answerClarifier('') },
    ])
  }

  if (stage.value === 'subtheme') {
    const labels =
      subThemeLabels.value?.[selectedTheme.value] ?? subThemeLabels.value?.default ?? {}
    return withLeaveSession([
      ...Object.entries(labels).map(([key, label]) => ({
        label,
        action: () => pickSubTheme(key),
      })),
      { label: t.value.choices.back, action: askThemePrimary },
    ])
  }

  if (stage.value === 'question_mode') {
    const themeTemplates =
      questionTemplates.value?.[selectedTheme.value] ?? questionTemplates.value?.default ?? {}
    const templates =
      themeTemplates?.[selectedSubTheme.value] ?? questionTemplates.value?.default?.unknown ?? []
    return withLeaveSession([
      ...templates.map((template) => ({
        label: template.label,
        action: () => pickTemplate(template.text),
      })),
      { label: t.value.choices.back, action: toSubTheme },
    ])
  }

  if (stage.value === 'question_input') {
    return withLeaveSession([
      {
        label: t.value.choices.confirmQuestion,
        action: confirmQuestion,
        disabled: !isQuestionInputValid.value,
      },
      { label: t.value.choices.back, action: backFromQuestionInput },
    ])
  }

  if (stage.value === 'spread_primary') {
    const premiumLabel = i18nT(currentLang.value, 'premiumAccess.badge')
    const rewardLabel = t.value.ui.rewardBadge
    // A free user with an earned ritual token can unlock one multi-card spread.
    const hasRewardToken = !hasPremiumAccess.value && getExtraTarotSpreadTokens() > 0
    // Multi-card spread label: plain for premium, "· Reward" when a token is
    // available (tap consumes it), "· Premium" otherwise (tap opens the upsell).
    const multiSpreadLabel = (label) => {
      if (hasPremiumAccess.value) return label
      if (hasRewardToken) return `${label} · ${rewardLabel}`
      return `${label} · ${premiumLabel}`
    }

    return withLeaveSession([
      { label: t.value.choices.spread1, action: () => selectSpreadWithAccess(1) },
      { label: multiSpreadLabel(t.value.choices.spread3), action: () => selectSpreadWithAccess(3) },
      { label: multiSpreadLabel(t.value.choices.spread5), action: () => selectSpreadWithAccess(5) },
      { label: t.value.choices.back, action: toQuestionMode },
    ])
  }

  if (stage.value === 'ready') {
    return []
  }

  if (stage.value === 'started') {
    return []
  }

  return withLeaveSession([{ label: t.value.choices.start, action: askThemePrimary }])
})

const showQuestionInput = computed(() => stage.value === 'question_input')
const showChoices = computed(
  () => controlsUnlocked.value && stage.value !== 'intro' && choices.value.length > 0,
)
const activeBubbleText = computed(() => currentPrompt.value || narrationLine.value)
const bubbleText = computed(() => {
  if (isReadingComplete.value) {
    if (interpretationLoading.value) {
      return interpretationLoadingLine.value
    }
    if (interpretationDecision.value === 'no') {
      return t.value.ui.declinedHint
    }
    if (interpretationDecision.value === 'yes') {
      return interpretationLoadingLine.value
    }
  }
  if (stage.value === 'started' && revealedCardListText.value) {
    if (flippedCardsCount.value >= spreadCards.value.length && spreadCards.value.length > 0) {
      return `${revealedCardListText.value}\n\n${buildReadingReadyPrompt()}`
    }

    return revealedCardListText.value
  }

  return activeBubbleText.value
})
const bubbleKey = computed(() => (stage.value === 'started' ? 'started-list' : bubbleText.value))
const isSummaryBubble = computed(() => stage.value === 'ready')
const isClarifyBubble = computed(() => stage.value === 'clarify')
const showDeckHotspot = computed(() => stage.value === 'ready')
const questionValidationError = computed(() => {
  if (!showQuestionInput.value) {
    return ''
  }
  return getQuestionValidationError(draftQuestion.value)
})
const isQuestionInputValid = computed(() => {
  const value = normalizeQuestionDraft(draftQuestion.value)
  return Boolean(value) && !questionValidationError.value
})
const selectedChoice = computed(() => choices.value[selectedWheelIndex.value] || null)
const selectedChoiceDisabled = computed(
  () =>
    isChoiceTransitioning.value || !selectedChoice.value || Boolean(selectedChoice.value.disabled),
)

watch(isReadingComplete, (ready) => {
  if (!ready) {
    return
  }
  interpretationChoicesVisible.value = true
  void impact(ImpactStyle.Light)
  void analytics.logEvent(TAROT_SESSION_EVENTS.interpretationPromptShown, buildTarotFunnelPayload())
})

watch(interpretationLoading, (loading) => {
  if (loading) {
    loadingDots.value = 1
    if (loadingDotsTimer) {
      window.clearInterval(loadingDotsTimer)
    }
    loadingDotsTimer = window.setInterval(() => {
      loadingDots.value = loadingDots.value >= 3 ? 1 : loadingDots.value + 1
    }, 700)
    return
  }

  if (loadingDotsTimer) {
    window.clearInterval(loadingDotsTimer)
    loadingDotsTimer = null
  }
  loadingDots.value = 1
})

const saveReadingToDatabase = async (interpretationData, payload) => {
  // Saved reading history is a premium-only capability (docs/premium-matrix.md).
  // Free copy promises "today's reading is not saved to history", so free users
  // must not be persisted to the DB — saving them here is a misleading-claim risk.
  if (!hasPremiumAccess.value) {
    return
  }

  const { data: user } = await getUserNative(8000)
  if (!user) {
    // Not logged in — skip saving to database
    return
  }

  const cardsData = spreadCards.value.map((card) => ({
    id: card.id,
    reversed: Boolean(card.reversed),
  }))

  const { error } = await insertTarotReading(
    {
      user_id: user.id,
      spread_type: selectedSpread.value || spreadCards.value.length,
      cards: cardsData,
      question: payload.question || null,
      interpretation: interpretationData.interpretation || null,
    },
    8000,
  )

  // Failure is logged once by the background caller (persistInterpretationAndOpen).
  if (error) {
    throw error
  }
}

const buildInterpretationAnalyticsPayload = (payload) => {
  const depth = Number(payload?.depth || selectedSpread.value || spreadCards.value.length || 1)
  return {
    source: 'tarot_oracle',
    depth: String(Math.max(1, depth)),
    has_question: payload?.question ? 'true' : 'false',
    premium: hasPremiumAccess.value ? 'true' : 'false',
    ai_enabled: tarotAiEnabled ? 'true' : 'false',
    theme: String(payload?.theme || selectedTheme.value || 'unknown'),
  }
}

// Lightweight params shared by the mid-funnel tarot events.
const buildTarotFunnelPayload = () => ({
  spread: String(selectedSpread.value || spreadCards.value.length || 1),
  theme: String(selectedTheme.value || 'unknown'),
  premium: hasPremiumAccess.value ? 'true' : 'false',
})

const logInterpretationOutcome = (eventName, payload, extra = {}) => {
  void analytics.logEvent(eventName, {
    ...buildInterpretationAnalyticsPayload(payload),
    ...extra,
  })
}

const acceptInterpretation = async () => {
  if (interpretationLoading.value || interpretationDecision.value === 'yes') {
    return
  }
  void impact(ImpactStyle.Light)
  interpretationDecision.value = 'yes'
  interpretationError.value = ''
  interpretationChoicesVisible.value = false
  interpretationLoading.value = true
  const payload = buildInterpretationPayload()
  try {
    if (!hasPremiumAccess.value) {
      const data = buildBasicInterpretation(payload)
      logInterpretationOutcome(TAROT_SESSION_EVENTS.freeBasicInterpretation, payload, {
        reason: 'free_access',
      })
      await persistInterpretationAndOpen(data, payload)
      return
    }

    if (!tarotAiEnabled) {
      const data = buildPremiumStructuredFallback(payload)
      logInterpretationOutcome(TAROT_SESSION_EVENTS.premiumStructuredFallback, payload, { reason: 'ai_disabled' })
      await persistInterpretationAndOpen(data, payload)
      return
    }

    const data = await getTarotReading(payload)
    if (!data) {
      const fallbackData = buildPremiumStructuredFallback(payload, { aiUnavailable: true })
      logInterpretationOutcome(TAROT_SESSION_EVENTS.premiumStructuredFallback, payload, { reason: 'ai_no_data' })
      const fallbackMessage = t.value.ui.aiFallbackNotify
      $q.notify({
        message: fallbackMessage,
        color: 'dark',
        textColor: 'white',
        position: 'bottom',
      })
      await persistInterpretationAndOpen(fallbackData, payload)
      return
    }

    logInterpretationOutcome(TAROT_SESSION_EVENTS.premiumAiSuccess, payload)
    await persistInterpretationAndOpen(data, payload)
  } catch (error) {
    console.error(error)
    if (hasPremiumAccess.value) {
      try {
        const fallbackData = buildPremiumStructuredFallback(payload, { aiUnavailable: true })
        logInterpretationOutcome(TAROT_SESSION_EVENTS.premiumStructuredFallback, payload, {
          reason: 'ai_error',
        })
        const fallbackMessage = t.value.ui.aiFallbackNotify
        $q.notify({
          message: fallbackMessage,
          color: 'dark',
          textColor: 'white',
          position: 'bottom',
        })
        await persistInterpretationAndOpen(fallbackData, payload)
        return
      } catch (fallbackError) {
        console.error(fallbackError)
        logInterpretationOutcome(TAROT_SESSION_EVENTS.premiumAiErrorUnrecovered, payload, {
          reason: 'fallback_failed',
        })
      }
    }
    interpretationError.value = interpretationUnavailableLine.value
    interpretationDecision.value = ''
    interpretationChoicesVisible.value = true
  } finally {
    interpretationLoading.value = false
  }
}

const declineInterpretation = () => {
  if (interpretationLoading.value) {
    return
  }
  void impact(ImpactStyle.Light)
  interpretationDecision.value = 'no'
  interpretationChoicesVisible.value = false
  void analytics.logEvent(TAROT_SESSION_EVENTS.interpretationDeclined, buildTarotFunnelPayload())
}

watch(showChoices, (visible) => {
  actionsSheetOpen.value = visible
})

watch(showDeckHotspot, (visible) => {
  if (!visible) {
    isDeckHotspotActive.value = false
    return
  }
  schedule(0, updateDeckHotspotPosition)
  schedule(READY_HOTSPOT_REVEAL_DELAY, () => {
    if (stage.value !== 'ready') {
      return
    }
    isDeckHotspotActive.value = true
    triggerDeckReadyHaptic()
  })
})

watch(actionsSheetOpen, (open) => {
  document.body.classList.toggle('oracle-sheet-open', !!open)

  if (open) {
    if (Capacitor.isNativePlatform()) {
      void Haptics.selectionStart().catch(() => {})
    }
    schedule(40, () => {
      alignWheelToIndex(getFirstEnabledIndex(), 'auto')
    })
    return
  }

  if (Capacitor.isNativePlatform()) {
    void Haptics.selectionEnd().catch(() => {})
  }
})

watch(choices, (items) => {
  if (!items.length) {
    selectedWheelIndex.value = 0
    return
  }

  const next = Math.min(selectedWheelIndex.value, items.length - 1)
  const fallback = items[next] && !items[next].disabled ? next : getFirstEnabledIndex()
  selectedWheelIndex.value = fallback

  if (actionsSheetOpen.value) {
    schedule(40, () => {
      alignWheelToIndex(fallback, 'auto')
    })
  }
})

watch(
  () => authStore.state.user?.id || '',
  () => {
    void refreshRitualRewardAccess(true)
  },
  { immediate: true },
)

const runChoice = (choice) => {
  if (!choice || choice.disabled || isChoiceTransitioning.value) {
    return
  }

  isChoiceTransitioning.value = true
  controlsUnlocked.value = false
  actionsSheetOpen.value = false

  schedule(ACTIONS_HIDE_TO_NEXT_PROMPT_DELAY, () => {
    choice.action()
    isChoiceTransitioning.value = false
  })
}

const getFirstEnabledIndex = () => {
  const index = choices.value.findIndex((item) => !item.disabled)
  return index === -1 ? 0 : index
}

const alignWheelToIndex = (index, behavior = 'smooth') => {
  const target = wheelRef.value
  if (!target) {
    return
  }

  const maxIndex = Math.max(choices.value.length - 1, 0)
  const clampedIndex = Math.max(0, Math.min(index, maxIndex))
  selectedWheelIndex.value = clampedIndex
  target.scrollTo({
    top: clampedIndex * WHEEL_ITEM_HEIGHT,
    behavior,
  })
}

const triggerSelectionHaptic = async () => {
  try {
    const now = Date.now()
    if (now - lastWheelHapticAt.value < 65) {
      return
    }
    lastWheelHapticAt.value = now
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {
    // Haptics are cosmetic; retry once, then ignore unsupported-device failures.
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Light })
      }
    } catch {
      // ignore
    }
  }
}

const onWheelScroll = async (event) => {
  const target = event?.target
  if (!target) {
    return
  }

  const index = Math.max(
    0,
    Math.min(Math.round(target.scrollTop / WHEEL_ITEM_HEIGHT), choices.value.length - 1),
  )
  if (index !== selectedWheelIndex.value) {
    selectedWheelIndex.value = index
    await triggerSelectionHaptic()
  }
}

const onWheelItemTap = (index) => {
  alignWheelToIndex(index, 'smooth')
}

const confirmWheelSelection = () => {
  const choice = selectedChoice.value
  if (!choice || choice.disabled) {
    return
  }
  void triggerSelectionHaptic()
  runChoice(choice)
}

onMounted(() => {
  void loadCardPoolSafe()
  void refreshRitualRewardAccess(false)
  applyPlaybackRate()
  ensureVideoPlayback()
  updateDeckHotspotPosition()
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('pageshow', ensureVideoPlayback)
  window.addEventListener('focus', ensureVideoPlayback)
  window.addEventListener('resize', updateDeckHotspotPosition)
  window.addEventListener('orientationchange', updateDeckHotspotPosition)
  videoPlaybackWatchdog = window.setInterval(() => {
    const video = videoRef.value
    if (!video) {
      return
    }
    if (video.paused || video.readyState < 2) {
      ensureVideoPlayback()
      return
    }
    if (video.currentTime > 0) {
      isVideoPlaying.value = true
    }
  }, 1200)

  // Already saw the intro this session (e.g. returning from interpretation) —
  // go straight to theme selection, no narration replay.
  if (hasSeenIntroThisSession()) {
    askThemePrimary()
    return
  }
  markIntroSeenThisSession()

  const introSet = pickVariant('introSet', t.value.introSets)
  const introLines = Array.isArray(introSet)
    ? introSet.filter(Boolean).slice(0, INTRO_LINES_TO_SHOW)
    : []

  if (!introLines.length) {
    askThemePrimary()
    return
  }

  introLines.forEach((line, index) => {
    schedule(INTRO_LINE_START_DELAY + index * INTRO_LINE_STEP_DELAY, () => {
      narrationLine.value = line
    })
  })

  const introEndDelay =
    INTRO_LINE_START_DELAY + introLines.length * INTRO_LINE_STEP_DELAY + INTRO_TO_THEME_DELAY
  schedule(introEndDelay, () => {
    narrationLine.value = ''
    askThemePrimary()
  })
})

onActivated(() => {
  if (!cardPool.value.length) {
    void loadCardPoolSafe()
  }
  void refreshRitualRewardAccess(false)
  ensureVideoPlayback()
  updateDeckHotspotPosition()
})

onBeforeUnmount(() => {
  document.body.classList.remove('oracle-sheet-open')
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('pageshow', ensureVideoPlayback)
  window.removeEventListener('focus', ensureVideoPlayback)
  window.removeEventListener('resize', updateDeckHotspotPosition)
  window.removeEventListener('orientationchange', updateDeckHotspotPosition)
  if (videoPlaybackWatchdog !== null) {
    window.clearInterval(videoPlaybackWatchdog)
    videoPlaybackWatchdog = null
  }
  if (loadingDotsTimer) {
    window.clearInterval(loadingDotsTimer)
    loadingDotsTimer = null
  }
  if (Capacitor.isNativePlatform()) {
    void Haptics.selectionEnd().catch(() => {})
  }
  timers.forEach((timer) => window.clearTimeout(timer))
})
</script>

<style scoped>
/*noinspection CssUnusedSymbol*/
.tarot-page {
  --oracle-surface-top: rgba(18, 15, 14, 0.68);
  --oracle-surface-bottom: rgba(10, 9, 11, 0.64);
  --oracle-surface-soft-top: rgba(14, 14, 16, 0.3);
  --oracle-surface-soft-bottom: rgba(10, 10, 12, 0.24);
  --oracle-border-strong: rgba(198, 178, 136, 0.2);
  --oracle-border-soft: rgba(228, 232, 242, 0.18);
  --oracle-text-main: rgba(238, 235, 228, 0.94);
  --oracle-text-muted: rgba(196, 184, 161, 0.72);
  --oracle-text-soft: rgba(188, 177, 154, 0.62);
  --aura-core: rgba(248, 252, 255, 0.58);
  --aura-mid: rgba(224, 236, 255, 0.33);
  --aura-edge: rgba(194, 212, 240, 0.17);
  --aura-size: 96px;
  --aura-hit-size: 132px;
  --aura-fade: 2800ms;
  --aura-pulse: 3600ms;
  --aura-drift: 3600ms;
  --aura-halo: 3600ms;
  position: relative;
  min-height: 100dvh;
  background: #000;
  overflow-x: clip;
}

.oracle-video-layer {
  position: relative;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  overflow-x: clip;
  background: #000;
}

.oracle-video {
  display: block;
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100dvh;
  object-fit: contain;
  object-position: center center;
  background: #000;
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  opacity: 0;
  transition: opacity 220ms ease;
}

.oracle-video--visible {
  opacity: 1;
}

.oracle-smoke {
  position: absolute;
  inset: -18%;
  z-index: 2;
  pointer-events: none;
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
  filter: blur(1px);
  opacity: 0.7;
}

.oracle-smoke--one {
  opacity: 0.2;
  background-image: url('/oracle-media/oracle-smoke.jpg');
  animation: oracle-smoke-drift-a 28s linear infinite alternate;
}

.oracle-smoke--two {
  opacity: 0.14;
  background-image: url('/oracle-media/oracle-smoke.jpg');
  transform: scale(1.12);
  animation: oracle-smoke-drift-b 38s linear infinite alternate;
}

.oracle-deck-aura {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 5;
  width: var(--aura-size);
  height: var(--aura-size);
  border-radius: 999px;
  pointer-events: none;
  background: transparent;
  box-shadow:
    0 0 34px rgba(242, 248, 255, 0.24),
    0 0 108px rgba(214, 228, 248, 0.22);
  mix-blend-mode: screen;
  will-change: transform, opacity;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform: translate3d(-50%, -50%, 0);
  opacity: 0;
  filter: brightness(0.9);
  transition:
    opacity var(--aura-fade) cubic-bezier(0.19, 1, 0.22, 1),
    transform var(--aura-fade) cubic-bezier(0.19, 1, 0.22, 1),
    filter var(--aura-fade) cubic-bezier(0.19, 1, 0.22, 1);
}

.oracle-deck-aura--revealed {
  opacity: 1;
  transform: translate3d(-50%, -50%, 0) scale(1.02);
  filter: brightness(1.12);
  animation: oracle-deck-aura-breathe var(--aura-pulse) ease-in-out infinite;
  animation-play-state: running;
}

.oracle-deck-hit {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 6;
  width: var(--aura-hit-size);
  height: var(--aura-hit-size);
  transform: translate(-50%, -50%);
  border: 0;
  border-radius: 999px;
  background: transparent;
  pointer-events: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  opacity: 0;
  transition: opacity 1600ms cubic-bezier(0.19, 1, 0.22, 1);
}

.oracle-deck-hit--lit {
  pointer-events: auto;
  opacity: 1;
}

.oracle-deck-hit:active {
  transform: translate(-50%, -50%) scale(0.98);
}

.oracle-deck-aura::before,
.oracle-deck-aura::after {
  content: '';
  position: absolute;
  pointer-events: none;
}

.oracle-deck-aura::before {
  inset: 20%;
  border-radius: 999px;
  background: transparent;
  box-shadow:
    0 0 14px rgba(236, 244, 255, 0.3),
    0 0 36px rgba(180, 202, 244, 0.24),
    inset 0 0 22px rgba(236, 244, 255, 0.08);
  opacity: 0.94;
  animation: none;
  will-change: transform, opacity;
}

.oracle-deck-aura::after {
  inset: 2%;
  border-radius: 999px;
  box-shadow:
    0 0 28px rgba(214, 228, 248, 0.24),
    0 0 62px rgba(214, 228, 248, 0.14),
    inset 0 0 28px rgba(214, 228, 248, 0.05);
  opacity: 0.42;
  pointer-events: none;
  animation: none;
  will-change: transform, opacity;
}

.oracle-deck-aura--revealed::before {
  animation: oracle-deck-aura-ring-breathe var(--aura-drift) ease-in-out infinite;
}

.oracle-deck-aura--revealed::after {
  animation: oracle-deck-aura-halo-breathe var(--aura-halo) ease-in-out infinite;
}

.oracle-ui {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  overflow-x: clip;
}

.oracle-exit {
  position: fixed;
  left: 16px;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 36px);
  z-index: 30;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(8, 12, 18, 0.52);
  color: rgba(214, 225, 242, 0.7);
  font-size: 18px;
  display: grid;
  place-items: center;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  pointer-events: auto;
}

@media (prefers-reduced-motion: reduce) {
  /* Stop ambient drift/breathing for vestibular-sensitive users. */
  .oracle-smoke--one,
  .oracle-smoke--two,
  .oracle-deck-aura--revealed,
  .oracle-deck-aura--revealed::before,
  .oracle-deck-aura--revealed::after {
    animation: none;
  }
  /* Card flip and bubble fade resolve instantly instead of animating. */
  .oracle-card__inner {
    transition: none;
  }
  .oracle-bubble-fade-enter-active,
  .oracle-bubble-fade-leave-active {
    transition: opacity 120ms ease;
  }
  .oracle-bubble-fade-enter-from,
  .oracle-bubble-fade-leave-to {
    transform: none;
  }
}

.oracle-scene-dim {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    radial-gradient(62% 44% at 50% 66%, rgba(130, 152, 188, 0.08), rgba(130, 152, 188, 0)),
    linear-gradient(180deg, rgba(0, 0, 0, 0.28), rgba(0, 0, 0, 0.54));
  pointer-events: none;
}

.oracle-dim-fade-enter-active,
.oracle-dim-fade-leave-active {
  transition: opacity 680ms ease;
}

.oracle-dim-fade-enter-from,
.oracle-dim-fade-leave-to {
  opacity: 0;
}

.oracle-spread {
  position: absolute;
  left: 50%;
  /* 20% on normal/tall screens; floor keeps cards clear of the home indicator on
     the shortest devices (env() wins only when 20% would sit too low). */
  bottom: max(20%, calc(env(safe-area-inset-bottom, 0px) + 96px));
  transform: translateX(-50%);
  z-index: 3;
  width: 92vw;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 8px;
  pointer-events: none;
  perspective: 1100px;
}

.oracle-spread--1 {
  gap: 0;
}

.oracle-spread--5 {
  gap: 6px;
}

.oracle-card {
  --card-rot: 0deg;
  --card-rise: 0px;
  width: min(26vw, 124px);
  aspect-ratio: 0.62;
  border: 0;
  padding: 0;
  border-radius: 14px;
  background: transparent;
  pointer-events: auto;
  transform: translateY(calc(46px + var(--card-rise))) rotate(var(--card-rot)) scale(0.92);
  opacity: 0;
  transition:
    transform 980ms cubic-bezier(0.2, 0.9, 0.2, 1),
    opacity 780ms ease,
    box-shadow 780ms ease;
}

.oracle-card--revealed {
  transform: translateY(var(--card-rise)) rotate(var(--card-rot)) scale(1);
  opacity: 1;
}

.oracle-card--active {
  transform: translateY(calc(-14px + var(--card-rise))) rotate(var(--card-rot)) scale(1.06);
  z-index: 4;
}

.oracle-card__inner {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 1120ms cubic-bezier(0.22, 1, 0.36, 1);
  display: block;
}

.oracle-card--flipped .oracle-card__inner {
  transform: rotateY(180deg);
}

.oracle-card__face {
  position: absolute;
  inset: 0;
  border-radius: 14px;
  overflow: hidden;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  display: block;
}

.oracle-card__face--back {
  border: 1px solid rgba(204, 220, 247, 0.32);
  background:
    radial-gradient(80% 100% at 50% 0%, rgba(148, 171, 214, 0.24), rgba(148, 171, 214, 0) 60%),
    radial-gradient(90% 120% at 50% 100%, rgba(64, 90, 138, 0.28), rgba(64, 90, 138, 0)),
    linear-gradient(180deg, rgba(15, 24, 41, 0.98), rgba(5, 10, 19, 0.99));
  box-shadow:
    0 12px 24px rgba(0, 0, 0, 0.52),
    inset 0 1px 0 rgba(226, 237, 255, 0.22),
    inset 0 -1px 0 rgba(88, 118, 174, 0.2);
  opacity: 0.88;
  transition:
    opacity 320ms ease,
    box-shadow 420ms ease;
}

.oracle-card__face--front {
  transform: rotateY(180deg);
  border: 1px solid rgba(214, 227, 250, 0.46);
  box-shadow:
    0 12px 28px rgba(0, 0, 0, 0.56),
    0 0 20px rgba(180, 202, 244, 0.2);
  opacity: 0;
  transition: opacity 460ms ease 90ms;
}

.oracle-card--flipped .oracle-card__face--front {
  opacity: 1;
}

.oracle-card--flipped .oracle-card__face--back {
  opacity: 0.08;
}

.oracle-card:disabled {
  pointer-events: none;
}

.oracle-card__sigil {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: rgba(226, 237, 255, 0.8);
  font-size: 24px;
  text-shadow: 0 0 12px rgba(198, 220, 255, 0.46);
}

.oracle-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
}

.oracle-card__image--reversed {
  transform: translateZ(0) rotate(180deg);
  -webkit-transform: translateZ(0) rotate(180deg);
}

.oracle-card--active .oracle-card__face--front {
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.64);
}

.oracle-spread--1 .oracle-card {
  width: min(36vw, 170px);
}

.oracle-spread--5 .oracle-card {
  width: min(18.2vw, 90px);
}

.oracle-interpret {
  position: absolute;
  left: 50%;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 14%);
  transform: translateX(-50%);
  z-index: 6;
  width: min(92vw, 420px);
  display: grid;
  gap: 8px;
  pointer-events: auto;
}

.oracle-interpret--finish {
  bottom: calc(env(safe-area-inset-bottom, 0px) + 24px);
}

.oracle-interpret__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.oracle-interpret__error {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  text-align: center;
  color: rgba(255, 180, 180, 0.92);
}

.oracle-dialogue {
  position: absolute;
  width: min(92vw, 540px);
  padding: 0;
  background: transparent;
  color: var(--oracle-text-muted);
  display: flex;
  justify-content: flex-end;
  transform: translate(-50%, -108%);
  pointer-events: none;
  z-index: 7;
}

.oracle-dialogue__prompt {
  margin: 0 0 6px;
  font-size: 15px;
  line-height: 1.35;
}

.oracle-history {
  margin: 0 0 10px;
  display: grid;
  gap: 3px;
}

.oracle-history__item {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  color: rgba(210, 222, 238, 0.78);
}

.oracle-dialogue__prompt {
  color: var(--oracle-text-main);
  font-weight: 560;
  width: fit-content;
  max-width: min(92vw, 540px);
  margin: 22px 0 0 auto;
  letter-spacing: 0.02em;
}

.oracle-bubble--normal {
  margin-top: 98px;
}

.oracle-bubble {
  --oracle-bubble-border: rgba(100, 120, 160, 0.18);
  position: relative;
  display: flex;
  align-items: center;
  border: 1px solid var(--oracle-bubble-border);
  border-radius: 24px;
  min-height: 56px;
  padding: 14px 22px;
  background:
    radial-gradient(140% 200% at 20% 0%, rgba(60, 80, 120, 0.08), rgba(50, 70, 100, 0)),
    linear-gradient(165deg, rgba(8, 12, 20, 0.98), rgba(4, 6, 12, 0.99));
  line-height: 1.5;
  white-space: pre-line;
  overflow: visible;
  box-shadow:
    0 18px 40px -12px rgba(4, 8, 16, 0.62),
    inset 0 1px 0 rgba(150, 170, 210, 0.12);
  backdrop-filter: blur(12px) saturate(140%);
  -webkit-backdrop-filter: blur(12px) saturate(140%);
}

.oracle-bubble::before {
  content: '';
  position: absolute;
  inset: 1px;
  border-radius: 23px;
  background:
    radial-gradient(130% 150% at 50% -24%, rgba(120, 145, 195, 0.06), rgba(110, 135, 180, 0) 60%),
    linear-gradient(170deg, rgba(130, 155, 200, 0.04), rgba(120, 145, 190, 0) 50%);
  pointer-events: none;
}

/* When the oracle asks a clarifying question, lift the edge subtly. */
.oracle-bubble--clarify {
  --oracle-bubble-border: rgba(140, 170, 215, 0.34);
}

.oracle-bubble-fade-enter-active {
  transition:
    opacity 420ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
}

.oracle-bubble-fade-leave-active {
  transition:
    opacity 240ms ease,
    transform 240ms ease;
}

.oracle-bubble-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.oracle-bubble-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.oracle-actions {
  width: 100vw;
  max-width: 100vw;
  margin: 0 auto;
  margin-bottom: 0;
  border-radius: 22px 22px 0 0;
  padding: 8px 12px calc(env(safe-area-inset-bottom, 0px) + 24px);
  /* backdrop-filter: blur(30px) saturate(120%);
  -webkit-backdrop-filter: blur(30px) saturate(120%); */
  box-shadow: 0 -16px 46px rgba(0, 0, 0, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #ffffff;
  pointer-events: auto;
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
  margin-bottom: 6px;
}

.oracle-actions__hint {
  margin: 0 0 8px;
  padding-left: 2px;
  font-size: 12px;
  line-height: 1.2;
  color: var(--oracle-text-soft);
}

.oracle-question {
  width: 100%;
  margin: 0 0 6px;
  border: 1px solid var(--oracle-border-strong);
  border-radius: 12px;
  padding: 10px 11px;
  background: linear-gradient(180deg, var(--oracle-surface-top), var(--oracle-surface-bottom));
  color: var(--oracle-text-main);
  box-shadow: inset 0 0 0 1px rgba(245, 216, 150, 0.05);
  resize: none;
}

.oracle-question-wrap {
  margin: 0 0 6px;
}

.oracle-question__label {
  margin: 0 0 6px;
  padding-left: 2px;
  font-size: 12px;
  line-height: 1.2;
  color: rgba(233, 236, 244, 0.84);
}

.oracle-question__error {
  margin: 0;
  padding-left: 2px;
  font-size: 13px;
  line-height: 1.2;
  color: rgba(255, 168, 168, 0.9);
}

.oracle-question::placeholder {
  color: rgba(197, 205, 220, 0.72);
}

.oracle-wheel {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  overflow-x: hidden;
  /* border: 1px solid rgba(255, 255, 255, 0.16);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03)),
    linear-gradient(180deg, rgba(10, 10, 12, 0.34), rgba(8, 8, 10, 0.4)); */
  touch-action: pan-y;
}

.oracle-wheel::before,
.oracle-wheel::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 40px;
  z-index: 2;
  pointer-events: none;
}

.oracle-wheel::before {
  top: 0;
  /* background: linear-gradient(180deg, rgba(10, 10, 12, 0.74), rgba(10, 10, 12, 0)); */
}

.oracle-wheel::after {
  bottom: 0;
  /* background: linear-gradient(0deg, rgba(10, 10, 12, 0.74), rgba(10, 10, 12, 0)); */
}

.oracle-wheel__window {
  position: absolute;
  left: 6px;
  right: 6px;
  top: 50%;
  height: 44px;
  transform: translateY(-50%);
  border-radius: 9px;
  border: 1px solid rgba(138, 161, 204, 0.16);
  background: black;
  box-shadow:
    0 14px 30px rgba(0, 0, 0, 0.46),
    inset 0 1px 0 rgba(198, 218, 255, 0.13),
    inset 0 -1px 0 rgba(68, 96, 141, 0.13),
    inset 0 0 14px rgba(56, 82, 124, 0.1);
  backdrop-filter: blur(6px) saturate(118%);
  -webkit-backdrop-filter: blur(6px) saturate(118%);
  z-index: 1;
  pointer-events: none;
}

.oracle-wheel__scroll {
  position: relative;
  height: 152px;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: y mandatory;
  z-index: 3;
  scrollbar-width: none;
  touch-action: pan-y;
  overscroll-behavior-y: contain;
}

.oracle-wheel__spacer {
  height: 54px;
}

.oracle-wheel__item {
  display: block;
  width: 100%;
  min-height: 44px;
  height: 44px;
  padding: 0 10px;
  margin: 0;
  border: 0;
  background: transparent;
  color: rgba(231, 225, 211, 0.7);
  font-size: 15px;
  line-height: 1.2;
  scroll-snap-align: center;
  transition:
    color 140ms ease,
    transform 140ms ease;
}

.oracle-wheel__item--active {
  color: rgba(244, 238, 227, 0.97);
  transform: scale(1.01);
}

.oracle-wheel__item--disabled {
  color: rgba(196, 188, 173, 0.34);
}

.oracle-wheel__scroll::-webkit-scrollbar {
  display: none;
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

.oracle-card-preview {
  width: 100vw;
  max-width: 100vw;
  margin: 0 auto;
  border-radius: 0;
  padding: calc(env(safe-area-inset-top, 0px) + 70px) 16px
    calc(env(safe-area-inset-bottom, 0px) + 24px);
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow:
    0 -24px 56px rgba(0, 0, 0, 0.6),
    0 -4px 16px rgba(60, 90, 140, 0.12),
    inset 0 1px 0 rgba(186, 207, 247, 0.08);
  border: 1px solid rgba(130, 156, 200, 0.22);
  color: #ffffff;
  pointer-events: auto;
  background: linear-gradient(165deg, rgba(8, 12, 20, 0.98), rgba(4, 6, 12, 0.99));
}

.oracle-card-preview__header {
  position: relative;
  display: grid;
  align-items: center;
  justify-items: center;
  padding: 0 44px;
  margin-bottom: 4px;
}

.oracle-card-preview__back {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(10, 14, 22, 0.7);
  color: rgba(214, 225, 242, 0.8);
  display: grid;
  place-items: center;
}

.oracle-card-preview__content {
  display: grid;
  gap: 16px;
  overflow: auto;
  flex: 1;
  min-height: 0;
  padding-bottom: 16px;
}

.oracle-card-preview__media {
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

.oracle-card-preview__image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.oracle-card-preview__image--reversed {
  transform: rotate(180deg);
}

.oracle-card-preview__title {
  margin: 0;
  text-align: center;
  color: rgba(235, 242, 255, 0.96);
  font-size: 16px;
  line-height: 1.3;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 600;
}

.oracle-card-preview__meta {
  font-size: 13px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.68);
  text-align: center;
  font-weight: 500;
}

.oracle-card-preview__text {
  width: 100%;
  font-size: 14px;
  line-height: 1.65;
  color: rgba(224, 234, 251, 0.88);
  text-align: left;
  padding: 0 2px;
}

.oracle-card-preview__text p {
  margin: 0 0 10px;
}

.oracle-card-preview__label {
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.62);
  font-weight: 600;
  margin-bottom: 8px;
}

.oracle-card-preview__keywords {
  display: grid;
  gap: 10px;
}

.oracle-card-preview__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.oracle-card-preview__tag {
  font-size: 13px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(8, 12, 20, 0.7);
  border: 1px solid rgba(130, 156, 200, 0.2);
  color: rgba(235, 242, 255, 0.88);
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.oracle-card-preview .oracle-actions__footer {
  margin-top: auto;
}

:deep(.oracle-actions-dialog .q-dialog__backdrop) {
  background: rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

:deep(.oracle-card-preview-dialog .q-dialog__backdrop) {
  background: rgba(0, 0, 0, 0.88);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

:deep(.oracle-card-preview-dialog .q-dialog__inner) {
  padding: 0;
}

:deep(.oracle-actions-dialog .q-dialog__inner) {
  padding: 0;
}

@media (max-width: 480px) {
  .oracle-dialogue {
    width: min(94vw, 520px);
  }

  .oracle-actions {
    width: 100vw;
  }

  .oracle-wheel__scroll {
    height: 146px;
  }

  .oracle-spread {
    bottom: 22%;
    gap: 8px;
  }

  .oracle-card {
    width: min(25vw, 104px);
  }

  .oracle-spread--1 .oracle-card {
    width: min(40vw, 172px);
  }

  .oracle-spread--5 .oracle-card {
    width: min(18.6vw, 88px);
  }

  .oracle-interpret {
    bottom: calc(env(safe-area-inset-bottom, 0px) + 12.5%);
  }
}

@keyframes oracle-smoke-drift-a {
  0% {
    transform: translate3d(-8%, 6%, 0) scale(1.08);
  }

  50% {
    transform: translate3d(2%, -3%, 0) scale(1.14);
  }

  100% {
    transform: translate3d(8%, -8%, 0) scale(1.1);
  }
}

@keyframes oracle-smoke-drift-b {
  0% {
    transform: translate3d(10%, -4%, 0) scale(1.2);
  }

  50% {
    transform: translate3d(0, 2%, 0) scale(1.14);
  }

  100% {
    transform: translate3d(-10%, 8%, 0) scale(1.22);
  }
}

@keyframes oracle-deck-aura-breathe {
  0%,
  100% {
    transform: translate3d(-50%, -50%, 0) scale(1);
    opacity: 0.86;
    box-shadow:
      0 0 26px rgba(242, 248, 255, 0.2),
      0 0 70px rgba(214, 228, 248, 0.14);
  }
  50% {
    transform: translate3d(-50%, -50%, 0) scale(1.048);
    opacity: 1;
    box-shadow:
      0 0 44px rgba(242, 248, 255, 0.32),
      0 0 116px rgba(214, 228, 248, 0.26);
  }
}

@keyframes oracle-deck-aura-ring-breathe {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.72;
    box-shadow:
      0 0 12px rgba(236, 244, 255, 0.22),
      0 0 28px rgba(180, 202, 244, 0.14),
      inset 0 0 14px rgba(236, 244, 255, 0.05);
  }
  50% {
    transform: scale(1.04);
    opacity: 0.96;
    box-shadow:
      0 0 24px rgba(236, 244, 255, 0.4),
      0 0 54px rgba(180, 202, 244, 0.28),
      inset 0 0 20px rgba(236, 244, 255, 0.1);
  }
}

@keyframes oracle-deck-aura-halo-breathe {
  0%,
  100% {
    opacity: 0.22;
    transform: scale(0.99);
  }
  50% {
    opacity: 0.46;
    transform: scale(1.12);
  }
}
</style>
