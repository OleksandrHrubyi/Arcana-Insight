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
        <source src="/tarrotTest/test2.mp4" type="video/mp4" />
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
        :aria-label="currentLang === 'uk' ? 'Торкнутися колоди' : 'Touch the deck'"
        @click.stop="touchDeck"
      ></button>
    </div>

    <div class="oracle-ui">
      <button
        type="button"
        class="oracle-exit"
        :aria-label="currentLang === 'uk' ? 'Вийти' : 'Exit'"
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
            :class="['oracle-dialogue__prompt', 'oracle-bubble', isSummaryBubble ? 'oracle-bubble--summary' : 'oracle-bubble--normal']"
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

      <section
        v-if="showInterpretationActions"
        class="oracle-interpret"
        aria-live="polite"
      >
        <div class="oracle-interpret__actions">
          <button
            type="button"
            class="oracle-interpret__btn oracle-interpret__btn--ghost"
            :disabled="interpretationLoading"
            @click="declineInterpretation"
          >
            {{ noTitle }}
          </button>
          <button
            type="button"
            class="oracle-interpret__btn"
            :disabled="interpretationLoading"
            @click="acceptInterpretation"
          >
            {{ yesTitle }}
          </button>
        </div>
      </section>

      <q-dialog
        v-model="cardPreviewOpen"
        transition-show="scale"
        transition-hide="scale"
        class="oracle-card-preview-dialog"
      >
        <div
          v-if="previewCard"
          class="oracle-card-preview"
          role="dialog"
          :aria-label="getCardTitle(previewCard)"
          @click.stop
        >
          <button
            type="button"
            class="oracle-card-preview__close"
            :aria-label="currentLang === 'uk' ? 'Закрити карту' : 'Close card'"
            @click="cardPreviewOpen = false"
          >
            ×
          </button>
          <img
            class="oracle-card-preview__image"
            :class="{ 'oracle-card-preview__image--reversed': previewCard.reversed }"
            :src="getCardImage(previewCard)"
            :alt="getCardTitle(previewCard)"
          />
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
            <p v-if="questionValidationError" class="oracle-question__error">{{ questionValidationError }}</p>
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
              class="oracle-actions__ok"
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
import { useRouter } from 'vue-router'
import { currentLocale, t as i18nT } from 'src/i18n'
import { loadTarotData } from 'src/helpers/tarotData'
import { getTarotReading } from 'src/services/tarotOracle'

const videoRef = ref(null)
const sceneRef = ref(null)
const narrationLine = ref('')
const currentPrompt = ref('')
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
const router = useRouter()

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
const loadingDots = ref(1)
let loadingDotsTimer = null

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
const READY_HOTSPOT_REVEAL_DELAY = 1800
const QUESTION_MIN_LENGTH = 10
const QUESTION_MAX_LENGTH = 220
const DEAL_START_DELAY = 680
const DEAL_REVEAL_DELAY = 620
const DEAL_FLIP_DELAY = 620
const DEAL_FINISH_DELAY = 1100
let controlsRevealToken = 0
const DECK_ANCHOR = Object.freeze({
  x: 0.728,
  y: 0.668,
  size: 0.18,
  offsetX: 20,
  offsetY: 80,
})

function onExit() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
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
const interpretationLoadingBase = computed(() =>
  currentLang.value === 'uk'
    ? 'Добре. Дай мені мить — формую тлумачення'
    : 'All right. Give me a moment — shaping the interpretation',
)
const interpretationLoadingLine = computed(() => `${interpretationLoadingBase.value}${'.'.repeat(loadingDots.value)}`)
const interpretationUnavailableLine = computed(() =>
  i18nT(currentLang.value, 'errors.generic'),
)

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
    }))
}

const pickVariant = (key, variants) => {
  if (!variants || variants.length === 0) {
    return ''
  }

  const prev = lastVariantByKey.value[key]
  let nextIndex = Math.floor(Math.random() * variants.length)

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
    const j = Math.floor(Math.random() * (i + 1))
    const temp = deck[i]
    deck[i] = deck[j]
    deck[j] = temp
  }
  return deck.slice(0, Math.max(1, count)).map((card) => ({
    ...card,
    reversed: Math.random() < 0.24,
  }))
}

const impact = async (style = ImpactStyle.Light) => {
  if (!Capacitor.isNativePlatform()) {
    return
  }
  try {
    await Haptics.impact({ style })
  } catch (error) {
    console.error(error)
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
  const size = Math.max(72, Math.min(136, Math.round(Math.min(rect.width, rect.height) * DECK_ANCHOR.size)))

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

const withLeaveSession = (items) => [...items, { label: t.value.choices.leaveSession, action: leaveSession }]

const askThemePrimary = () => {
  selectedTheme.value = ''
  selectedSubTheme.value = ''
  selectedQuestion.value = ''
  selectedSpread.value = 0
  draftQuestion.value = ''
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
  stage.value = 'spread_primary'
  setPrompt('spread')
  revealControlsWithDelay(850)
}

const normalizeQuestionDraft = (value) => String(value || '').replace(/\s+/g, ' ').trim()

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
  stage.value = 'spread_primary'
  setPrompt('spread')
  revealControlsWithDelay(850)
}

const clampText = (text, max = 42) => {
  const value = String(text || '').trim()
  if (value.length <= max) {
    return value
  }
  return `${value.slice(0, max - 1)}…`
}

const buildReadySummaryWithTouchPrompt = (spread) => {
  const isUk = currentLang.value === 'uk'
  const themeLabel = t.value.themeLabels[selectedTheme.value] || t.value.themeLabels.default
  const subThemeLabelRaw =
    subThemeLabels.value?.[selectedTheme.value]?.[selectedSubTheme.value] ||
    subThemeLabels.value?.default?.[selectedSubTheme.value] ||
    selectedSubTheme.value
  const subThemeLabel = String(subThemeLabelRaw || '').trim()
  const question = clampText(selectedQuestion.value, 46)
  const spreadLabel = isUk ? { 1: '1 карта', 3: '3 карти', 5: '5 карт' }[spread] : { 1: '1 card', 3: '3 cards', 5: '5 cards' }[spread]
  const touchPrompt = pickVariant('ready', t.value.prompts.ready)
  const subThemeLineUk = subThemeLabel ? `Підтема: «${subThemeLabel}»\n` : ''
  const subThemeLineEn = subThemeLabel ? `Subtheme: “${subThemeLabel}”\n` : ''

  if (isUk) {
    return `Тема: «${themeLabel}»
${subThemeLineUk}Питання: «${question}»
Глибина: ${spreadLabel}
${touchPrompt}`
  }

  return `Theme: “${themeLabel}”
${subThemeLineEn}Question: “${question}”
Depth: ${spreadLabel}
${touchPrompt}`
}

const setSpread = (spread) => {
  selectedSpread.value = spread
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

const getCardRole = (index, total) => {
  const isUk = currentLang.value === 'uk'
  if (total === 1) {
    return isUk ? 'Суть' : 'Core'
  }
  if (total === 3) {
    return (
      (isUk ? ['Корінь', 'Фокус', 'Вектор'] : ['Root', 'Focus', 'Vector'])[index] ||
      (isUk ? `Карта ${index + 1}` : `Card ${index + 1}`)
    )
  }
  if (total === 5) {
    return (
      (isUk ? ['Основа', 'Минуле', 'Тепер', 'Тінь', 'Вектор'] : ['Base', 'Past', 'Now', 'Shadow', 'Vector'])[index] ||
      (isUk ? `Карта ${index + 1}` : `Card ${index + 1}`)
    )
  }
  return isUk ? `Карта ${index + 1}` : `Card ${index + 1}`
}

const getCardTitle = (card) => (currentLang.value === 'uk' ? card?.titleUk : card?.titleEn) || card?.titleEn || card?.titleUk || 'Card'

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
  const source = previewCard.value.description?.[orientation] || previewCard.value.meaning?.[orientation]
  return getCardText(source, currentLang.value)
})
const previewKeywords = computed(() => {
  if (!previewCard.value) return []
  return previewCard.value.keywords?.[currentLang.value] || previewCard.value.keywords?.en || []
})

const revealedCardList = computed(() =>
  spreadCards.value.slice(0, flippedCardsCount.value).map((card, index) => {
    const title = getCardTitle(card)
    const reversedSuffix = card?.reversed ? (currentLang.value === 'uk' ? ' (перевернута)' : ' (reversed)') : ''

    return {
      index,
      title,
      label: `${index + 1}. ${title}${reversedSuffix}`,
    }
  }),
)

const revealedCardListText = computed(() => revealedCardList.value.map((item) => item.label).join('\n'))

const buildCardRevealPrompt = (card, index, total) => {
  const role = getCardRole(index, total)
  const title = getCardTitle(card)
  const reversedTag = card?.reversed ? (currentLang.value === 'uk' ? ', перевернута' : ', reversed') : ''

  if (currentLang.value === 'uk') {
    return `${role}.\n${title}${reversedTag}.`
  }

  return `${role}.\n${title}${reversedTag}.`
}

const getCardText = (source, locale) => {
  const text = source?.[locale] || source?.en || ''
  return String(text || '').split('\n\n').filter(Boolean)
}

const buildReadingReadyPrompt = () => {
  if (currentLang.value === 'uk') {
    return 'Карти відкриті. Бажаєш, щоб я перейшла до тлумачення?'
  }

  return 'The cards are open. Do you want me to move to the interpretation?'
}

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
  return (
    card?.meaning?.[orientation]?.[currentLang.value] ||
    card?.meaning?.[orientation]?.en ||
    ''
  )
}

const getCardKeywords = (card) => {
  return card?.keywords?.[currentLang.value] || card?.keywords?.en || []
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

const getCardPromptHold = (card, index, total) => {
  const prompt = buildCardRevealPrompt(card, index, total)
  const baseDelay = currentLang.value === 'uk' ? 1800 : 1650
  return Math.max(baseDelay, Math.min(3000, baseDelay + prompt.length * 18))
}

const getSpreadCardStyle = (index, total) => {
  const fallback = { rotate: 0, rise: 0 }
  const map = {
    1: [{ rotate: 0, rise: 0 }],
    3: [{ rotate: -8, rise: 2 }, { rotate: 0, rise: -6 }, { rotate: 8, rise: 2 }],
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

const touchDeck = () => {
  if (stage.value !== 'ready' || !isDeckHotspotActive.value) {
    return
  }
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
  currentPrompt.value = buildCardRevealPrompt(spreadCards.value[index], index, spreadCards.value.length)
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
  const isUk = currentLang.value === 'uk'
  const labelTheme = isUk ? 'Тема' : 'Theme'
  const labelSubTheme = isUk ? 'Підтема' : 'Subtheme'
  const labelQuestion = isUk ? 'Питання' : 'Question'
  const labelSpread = isUk ? 'Розклад' : 'Spread'
  const spreadLabels = isUk
    ? { 1: '1 карта', 3: '3 карти', 5: '5 карт' }
    : { 1: '1 card', 3: '3 cards', 5: '5 cards' }

  if (selectedTheme.value) {
    rows.push(`${labelTheme}: ${t.value.themeLabels[selectedTheme.value] || t.value.themeLabels.default}`)
  }

  if (selectedTheme.value && selectedSubTheme.value) {
    const subThemeLabel =
      subThemeLabels.value?.[selectedTheme.value]?.[selectedSubTheme.value] ||
      subThemeLabels.value?.default?.[selectedSubTheme.value] ||
      selectedSubTheme.value
    rows.push(`${labelSubTheme}: ${subThemeLabel}`)
  }

  if (selectedQuestion.value) {
    const cut = selectedQuestion.value.length > 72 ? `${selectedQuestion.value.slice(0, 72)}…` : selectedQuestion.value
    rows.push(`${labelQuestion}: ${cut}`)
  }

  if (selectedSpread.value) {
    rows.push(`${labelSpread}: ${spreadLabels[selectedSpread.value]}`)
  }

  return rows
})

const isReadingComplete = computed(
  () => stage.value === 'started' && spreadCards.value.length > 0 && flippedCardsCount.value >= spreadCards.value.length,
)
const showInterpretationActions = computed(
  () => isReadingComplete.value && interpretationChoicesVisible.value && !interpretationLoading.value && !interpretationData.value,
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

  if (stage.value === 'subtheme') {
    const labels = subThemeLabels.value?.[selectedTheme.value] ?? subThemeLabels.value?.default ?? {}
    return withLeaveSession([
      ...Object.entries(labels).map(([key, label]) => ({
        label,
        action: () => pickSubTheme(key),
      })),
      { label: t.value.choices.back, action: askThemePrimary },
    ])
  }

  if (stage.value === 'question_mode') {
    const themeTemplates = questionTemplates.value?.[selectedTheme.value] ?? questionTemplates.value?.default ?? {}
    const templates =
      themeTemplates?.[selectedSubTheme.value] ??
      questionTemplates.value?.default?.unknown ??
      []
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
    return withLeaveSession([
      { label: t.value.choices.spread1, action: () => setSpread(1) },
      { label: t.value.choices.spread3, action: () => setSpread(3) },
      { label: t.value.choices.spread5, action: () => setSpread(5) },
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
const showChoices = computed(() => controlsUnlocked.value && stage.value !== 'intro' && choices.value.length > 0)
const activeBubbleText = computed(() => currentPrompt.value || narrationLine.value)
const bubbleText = computed(() => {
  if (isReadingComplete.value) {
    if (interpretationLoading.value) {
      return interpretationLoadingLine.value
    }
    if (interpretationDecision.value === 'no') {
      return currentLang.value === 'uk'
        ? 'Добре. Якщо захочеш тлумачення — просто скажи.'
        : 'All right. If you want the interpretation, just say so.'
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
  () => isChoiceTransitioning.value || !selectedChoice.value || Boolean(selectedChoice.value.disabled),
)

watch(isReadingComplete, (ready) => {
  if (!ready) {
    return
  }
  interpretationChoicesVisible.value = true
  void impact(ImpactStyle.Light)
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
    const data = await getTarotReading(payload)
    if (!data) {
      interpretationError.value = interpretationUnavailableLine.value
      interpretationDecision.value = ''
      interpretationChoicesVisible.value = true
      return
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
  } catch (error) {
    console.error(error)
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
  } catch (error) {
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Light })
      }
    } catch (innerError) {
      console.error(innerError)
    }
    console.error(error)
  }
}

const onWheelScroll = async (event) => {
  const target = event?.target
  if (!target) {
    return
  }

  const index = Math.max(0, Math.min(Math.round(target.scrollTop / WHEEL_ITEM_HEIGHT), choices.value.length - 1))
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
  void loadCardPool()
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

  const introSet = pickVariant('introSet', t.value.introSets)
  const introLines = Array.isArray(introSet) ? introSet.filter(Boolean).slice(0, INTRO_LINES_TO_SHOW) : []

  if (!introLines.length) {
    askThemePrimary()
    return
  }

  introLines.forEach((line, index) => {
    schedule(INTRO_LINE_START_DELAY + index * INTRO_LINE_STEP_DELAY, () => {
      narrationLine.value = line
    })
  })

  const introEndDelay = INTRO_LINE_START_DELAY + introLines.length * INTRO_LINE_STEP_DELAY + INTRO_TO_THEME_DELAY
  schedule(introEndDelay, () => {
    narrationLine.value = ''
    askThemePrimary()
  })
})

onActivated(() => {
  if (!cardPool.value.length) {
    void loadCardPool()
  }
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
  background-image: url('/tarrotTest/smoke-opt.jpg');
  animation: oracle-smoke-drift-a 28s linear infinite alternate;
}

.oracle-smoke--two {
  opacity: 0.14;
  background-image: url('/tarrotTest/smoke-opt.jpg');
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
  bottom: 20%;
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
  transition: opacity 320ms ease, box-shadow 420ms ease;
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

.oracle-interpret__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.oracle-interpret__btn {
  min-height: 44px;
  border-radius: 12px;
  border: 1px solid rgba(156, 184, 235, 0.36);
  padding: 10px 12px;
  background: linear-gradient(180deg, rgba(28, 38, 58, 0.92), rgba(10, 15, 27, 0.98));
  color: var(--oracle-text-main);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.oracle-interpret__btn--ghost {
  background: rgba(8, 12, 18, 0.62);
  border-color: rgba(156, 184, 235, 0.18);
  color: rgba(214, 225, 242, 0.88);
}

.oracle-interpret__btn:disabled {
  opacity: 0.5;
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
  letter-spacing: 0.01em;
}

.oracle-bubble--normal {
  margin-top: 98px;
}

.oracle-bubble {
  --oracle-bubble-border: rgba(112, 136, 178, 0.16);
  position: relative;
  display: flex;
  align-items: center;
  border: 1px solid var(--oracle-bubble-border);
  border-radius: 20px;
  min-height: 52px;
  padding: 8px 18px;
  background:
    radial-gradient(120% 180% at 16% 0%, rgba(90, 120, 170, 0.08), rgba(90, 120, 170, 0)),
    linear-gradient(180deg, rgba(6, 10, 17, 0.78), rgba(3, 6, 12, 0.82));
  line-height: 1.32;
  white-space: pre-line;
  overflow: visible;
  box-shadow:
    0 10px 24px rgba(0, 0, 0, 0.42),
    0 0 12px rgba(72, 100, 156, 0.06),
    inset 0 1px 0 rgba(176, 196, 232, 0.08),
    inset 0 -1px 0 rgba(44, 64, 102, 0.12),
    inset 0 0 0 1px rgba(68, 92, 142, 0.1);
  backdrop-filter: blur(8px) saturate(120%);
  -webkit-backdrop-filter: blur(8px) saturate(120%);
}

.oracle-bubble::before {
  content: '';
  position: absolute;
  inset: 1px;
  border-radius: 18px;
  background:
    radial-gradient(120% 140% at 50% -20%, rgba(146, 171, 224, 0.05), rgba(146, 171, 224, 0) 56%),
    linear-gradient(165deg, rgba(162, 183, 220, 0.04), rgba(162, 183, 220, 0) 45%);
  pointer-events: none;
}

.oracle-bubble::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -7px;
  width: 12px;
  height: 12px;
  transform: translateX(-50%) rotate(45deg);
  background: rgba(2, 4, 10, 0.97);
  border-right: 1px solid var(--oracle-bubble-border);
  border-bottom: 1px solid var(--oracle-bubble-border);
}

.oracle-bubble-fade-enter-active,
.oracle-bubble-fade-leave-active {
  transition: opacity 1200ms cubic-bezier(0.22, 1, 0.36, 1);
}

.oracle-bubble-fade-enter-from,
.oracle-bubble-fade-leave-to {
  opacity: 0;
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
  font-size: 11px;
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
  font-size: 11px;
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
  transition: color 140ms ease, transform 140ms ease;
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

.oracle-actions__ok {
  width: 100%;
  min-height: 48px;
  border-radius: 12px;
  border: 1px solid rgba(156, 184, 235, 0.36);
  padding: 12px 14px;
  background: linear-gradient(180deg, rgba(28, 38, 58, 0.92), rgba(10, 15, 27, 0.98));
  color: var(--oracle-text-main);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: none;
  box-shadow: none;
  transition: transform 120ms ease, box-shadow 160ms ease, border-color 160ms ease, filter 160ms ease;
}

.oracle-actions__ok:active:not(:disabled) {
  transform: translateY(1px);
  border-color: rgba(156, 184, 235, 0.28);
  filter: saturate(0.92);
  box-shadow: none;
}

.oracle-actions__ok:disabled {
  opacity: 0.42;
  border-color: rgba(120, 146, 194, 0.18);
  background:
    linear-gradient(180deg, rgba(20, 29, 46, 0.72), rgba(6, 10, 19, 0.82));
  box-shadow: inset 0 1px 0 rgba(214, 229, 255, 0.08);
}

.oracle-card-preview {
  width: min(82vw, 340px);
  display: grid;
  gap: 12px;
  justify-items: center;
  transform: translateY(-40px);
  padding: 14px 14px 18px;
  border-radius: 24px;
  background:
    radial-gradient(140% 180% at 50% 0%, rgba(42, 54, 83, 0.34), rgba(42, 54, 83, 0)),
    linear-gradient(180deg, rgba(8, 11, 18, 0.94), rgba(3, 5, 10, 0.98));
  border: 1px solid rgba(188, 204, 235, 0.18);
  box-shadow:
    0 26px 64px rgba(0, 0, 0, 0.52),
    inset 0 1px 0 rgba(223, 233, 255, 0.12);
}

.oracle-card-preview__close {
  justify-self: end;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid rgba(188, 204, 235, 0.18);
  border-radius: 999px;
  background: rgba(6, 10, 18, 0.86);
  color: rgba(244, 238, 227, 0.92);
  font-size: 24px;
  line-height: 1;
  box-shadow: inset 0 1px 0 rgba(223, 233, 255, 0.1);
}

.oracle-card-preview__image {
  display: block;
  width: min(72vw, 300px);
  aspect-ratio: 0.62;
  object-fit: cover;
  border-radius: 20px;
  box-shadow:
    0 20px 44px rgba(0, 0, 0, 0.48),
    0 0 0 1px rgba(228, 236, 255, 0.08);
}

.oracle-card-preview__image--reversed {
  transform: rotate(180deg);
}

.oracle-card-preview__title {
  margin: 0;
  text-align: center;
  color: rgba(244, 238, 227, 0.94);
  font-size: 14px;
  line-height: 1.25;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.oracle-card-preview__meta {
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(200, 210, 226, 0.7);
  text-align: center;
}

.oracle-card-preview__text {
  width: 100%;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(214, 225, 242, 0.88);
  text-align: left;
}

.oracle-card-preview__text p {
  margin: 0 0 8px;
}

.oracle-card-preview__label {
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(200, 210, 226, 0.64);
  margin-bottom: 6px;
}

.oracle-card-preview__keywords {
  width: 100%;
}

.oracle-card-preview__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.oracle-card-preview__tag {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(12, 16, 24, 0.82);
  border: 1px solid rgba(156, 184, 235, 0.18);
  color: rgba(232, 236, 244, 0.86);
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
  padding: 12px;
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
