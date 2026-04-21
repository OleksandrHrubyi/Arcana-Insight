<template>
  <q-page class="compat-page">
    <div class="compat-bg" aria-hidden="true"></div>

    <div class="compat-content">
      <header class="compat-topbar">
        <button type="button" class="compat-back" @click="onBack">
          <q-icon name="chevron_left" size="18px" />
        </button>
        <div class="compat-topbar__text">
          <div class="compat-topbar__title">{{ copy.title }}</div>
          <div class="compat-topbar__subtitle">{{ copy.subtitle }}</div>
        </div>
        <div class="compat-topbar__ghost"></div>
      </header>

      <section class="compat-shell">
        <div class="compat-card compat-card--hero">
          <div class="compat-card__eyebrow">{{ copy.heroEyebrow }}</div>

          <div class="compat-hero-copy">
            <div class="compat-hero-copy__title">{{ copy.heroTitle }}</div>
            <div class="compat-hero-copy__text">{{ copy.heroText }}</div>
          </div>

          <div class="compat-pair-stage">
            <button type="button" class="compat-sign-pill" @click="openPicker('a')">
              <span class="compat-sign-pill__label">{{ copy.you }}</span>
              <span class="compat-sign-pill__value">{{ selectedLabelA }}</span>
            </button>

            <button
              type="button"
              class="compat-swap"
              :disabled="!hasPair"
              :aria-label="copy.swap"
              @click="swapSigns"
            >
              <q-icon name="swap_horiz" size="18px" />
            </button>

            <button type="button" class="compat-sign-pill" @click="openPicker('b')">
              <span class="compat-sign-pill__label">{{ copy.partner }}</span>
              <span class="compat-sign-pill__value">{{ selectedLabelB }}</span>
            </button>
          </div>

          <div v-if="recentPairsWithLabels.length" class="compat-recents">
            <div class="compat-recents__label">{{ copy.recentTitle }}</div>
            <div class="compat-recents__row">
              <button
                v-for="pair in recentPairsWithLabels"
                :key="pair.key"
                type="button"
                class="compat-recent-chip"
                @click="applyRecentPair(pair)"
              >
                {{ pair.label }}
              </button>
            </div>
          </div>
        </div>

        <div class="compat-card compat-card--preview">
          <template v-if="hasPair">
            <div class="compat-preview-top">
              <div class="compat-preview-top__copy">
                <div class="compat-card__eyebrow">{{ copy.previewEyebrow }}</div>
                <div class="compat-preview-top__title">{{ pairTitle }}</div>
                <div class="compat-preview-top__line">{{ pairLine }}</div>
              </div>
              <div class="compat-preview-top__meta">{{ confidenceLabel }}</div>
            </div>

            <div class="compat-score-shell" :style="resultStyle">
              <div class="compat-score-block">
                <div class="compat-score-block__value">
                  <span>{{ displayScore }}</span>
                  <small>%</small>
                </div>
                <div class="compat-score-block__label">{{ copy.scoreLabel }}</div>
              </div>

              <div class="compat-score-copy">
                <div class="compat-score-copy__headline">{{ overallLabel }}</div>
                <div class="compat-score-copy__summary">{{ summaryText }}</div>
                <div class="compat-score-copy__hint">{{ cautionText }}</div>
              </div>
            </div>

            <div class="compat-meter">
              <span class="compat-meter__fill" :style="{ width: `${displayScore}%` }"></span>
            </div>

            <div class="compat-spheres">
              <div v-for="item in sphereItems" :key="item.key" class="compat-sphere-card">
                <div class="compat-sphere-card__header">
                  <span class="compat-sphere-card__title">{{ item.label }}</span>
                  <span class="compat-sphere-card__value">{{ item.value }}%</span>
                </div>
                <div class="compat-sphere-card__bar">
                  <span :style="{ width: `${item.value}%` }"></span>
                </div>
                <div class="compat-sphere-card__text">{{ item.text }}</div>
              </div>
            </div>

            <div class="compat-advice-grid">
              <div class="compat-advice-card">
                <div class="compat-advice-card__label">{{ copy.advice.strength }}</div>
                <div class="compat-advice-card__text">{{ strengthText }}</div>
              </div>

              <div class="compat-advice-card">
                <div class="compat-advice-card__label">{{ copy.advice.tension }}</div>
                <div class="compat-advice-card__text">{{ cautionText }}</div>
              </div>

              <div class="compat-advice-card">
                <div class="compat-advice-card__label">{{ copy.advice.approach }}</div>
                <div class="compat-advice-card__text">{{ approachText }}</div>
              </div>
            </div>

            <div v-if="hasPremiumAccess" class="compat-deep-card">
              <div class="compat-deep-card__title">{{ copy.deepTitle }}</div>
              <div class="compat-deep-card__row">
                <div class="compat-deep-card__label">{{ copy.deepLabels.chemistry }}</div>
                <div class="compat-deep-card__text">{{ resultText }}</div>
              </div>
              <div class="compat-deep-card__row">
                <div class="compat-deep-card__label">{{ copy.deepLabels.rhythm }}</div>
                <div class="compat-deep-card__text">{{ paceText }}</div>
              </div>
              <div class="compat-deep-card__row">
                <div class="compat-deep-card__label">{{ copy.deepLabels.support }}</div>
                <div class="compat-deep-card__text">{{ insightText }}</div>
              </div>
            </div>

            <div v-else class="compat-premium-card">
              <div class="compat-premium-card__badge">{{ tt('premiumAccess.badge') }}</div>
              <div class="compat-premium-card__title">{{ copy.premiumTitle }}</div>
              <div class="compat-premium-card__text">{{ copy.premiumText }}</div>
              <ul class="compat-premium-card__list">
                <li v-for="item in premiumBullets" :key="item">{{ item }}</li>
              </ul>
              <button type="button" class="compat-premium-card__cta" @click="goPremium">
                <q-icon name="workspace_premium" size="16px" />
                <span>{{ tt('premiumAccess.cta') }}</span>
              </button>
            </div>

            <button type="button" class="compat-details-link" @click="onDetailsOpen">
              <q-icon name="info" size="16px" />
              <span>{{ copy.detailsCta }}</span>
            </button>
          </template>

          <div v-else class="compat-empty">
            <div class="compat-empty__title">{{ copy.emptyTitle }}</div>
            <div class="compat-empty__text">{{ copy.emptyText }}</div>
          </div>
        </div>
      </section>
    </div>

    <q-dialog
      v-model="sheetOpen"
      position="bottom"
      transition-show="slide-up"
      transition-hide="slide-down"
      :transition-duration="420"
      class="oracle-actions-dialog"
    >
      <section class="oracle-actions">
        <div class="sheet-handle" aria-hidden="true"></div>
        <div class="sheet-title">{{ activePicker === 'a' ? copy.pickYou : copy.pickPartner }}</div>

        <div class="oracle-wheel">
          <div class="oracle-wheel__window" aria-hidden="true"></div>
          <div ref="wheelRef" class="oracle-wheel__scroll" @scroll.passive="onWheelScroll">
            <div class="oracle-wheel__spacer"></div>
            <button
              v-for="(label, index) in signLabels"
              :key="label"
              type="button"
              class="oracle-wheel__item"
              :class="{ 'oracle-wheel__item--active': index === selectedWheelIndex }"
              @click="onWheelItemTap(index)"
            >
              {{ label }}
            </button>
            <div class="oracle-wheel__spacer"></div>
          </div>
        </div>

        <div class="oracle-actions__footer">
          <button type="button" class="oracle-actions__ok" @click="sheetOpen = false">
            {{ tt('common.close') }}
          </button>
        </div>
      </section>
    </q-dialog>

    <q-dialog
      v-model="detailsOpen"
      position="bottom"
      transition-show="slide-up"
      transition-hide="slide-down"
      :transition-duration="420"
      class="oracle-actions-dialog oracle-actions-dialog--details"
    >
      <section class="oracle-actions">
        <div class="sheet-handle" aria-hidden="true"></div>
        <div class="sheet-title">{{ copy.detailsTitle }}</div>

        <div class="details-tabs">
          <button
            v-for="tab in detailsTabs"
            :key="tab.id"
            type="button"
            class="details-tab"
            :class="{ 'details-tab--active': detailsTab === tab.id }"
            @click="onDetailsTabClick(tab.id)"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="details-body">
          <div v-if="detailsTab === 'chemistry'" class="details-stack">
            <div class="details-card">
              <div class="details-card__label">{{ copy.detailsSections.pair }}</div>
              <div class="details-card__title">{{ pairTitle }}</div>
              <div class="details-card__text">{{ pairLine }}</div>
            </div>

            <div class="details-card">
              <div class="details-card__label">{{ copy.detailsSections.chemistry }}</div>
              <div class="details-card__title">{{ strengthText }}</div>
              <div class="details-card__text">{{ resultText }}</div>
            </div>

            <div class="details-card">
              <div class="details-card__label">{{ copy.detailsSections.support }}</div>
              <div class="details-card__title">{{ copy.advice.approach }}</div>
              <div class="details-card__text">{{ approachText }}</div>
            </div>
          </div>

          <div v-else-if="detailsTab === 'rhythm'" class="details-stack">
            <div class="details-card">
              <div class="details-card__label">{{ copy.detailsSections.rhythm }}</div>
              <div class="details-card__title">{{ modalityPairLabel }}</div>
              <div class="details-card__text">{{ paceText }}</div>
            </div>

            <div class="details-card">
              <div class="details-card__label">{{ copy.detailsSections.watch }}</div>
              <div class="details-card__title">{{ overallLabel }}</div>
              <div class="details-card__text">{{ cautionText }}</div>
            </div>
          </div>

          <div v-else class="details-stack">
            <div class="details-card">
              <div class="details-card__label">{{ copy.detailsSections.method }}</div>
              <div class="details-card__title">{{ copy.methodTitle }}</div>
              <div class="details-card__text">{{ copy.methodText }}</div>
            </div>

            <div class="details-card">
              <div class="details-row">
                <span class="details-row__label">{{ copy.methodScores.element }}</span>
                <span class="details-row__value">{{ elementScore }}%</span>
              </div>
              <div class="details-row">
                <span class="details-row__label">{{ copy.methodScores.modality }}</span>
                <span class="details-row__value">{{ modalityScore }}%</span>
              </div>
              <div class="details-row details-row--final">
                <span class="details-row__label">{{ copy.methodScores.final }}</span>
                <span class="details-row__value">{{ compatibilityScore }}%</span>
              </div>
            </div>

            <div class="details-card">
              <div class="details-card__label">{{ copy.detailsSections.transparency }}</div>
              <div class="details-card__text">{{ copy.transparencyText }}</div>
            </div>
          </div>
        </div>

        <div class="oracle-actions__footer">
          <button type="button" class="oracle-actions__ok" @click="onDetailsClose">
            {{ copy.confirm }}
          </button>
        </div>
      </section>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { t, currentLocale } from 'src/i18n'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'
import { usePremiumAccess } from 'src/stores/premiumAccess'

const router = useRouter()
const { hasPremiumAccess } = usePremiumAccess()

const locale = computed(() => (currentLocale.value || 'en').toLowerCase().startsWith('uk') ? 'uk' : 'en')
const tt = (key) => t(locale.value, key)

const copyByLocale = {
  en: {
    title: 'Compatibility',
    subtitle: 'Read the dynamic between two signs in a clearer, more useful way.',
    heroEyebrow: 'Relationship insight',
    heroTitle: 'Compare two signs',
    heroText: 'Pick your sign and the other person to see the emotional flow, communication style, and long-term rhythm.',
    you: 'You',
    partner: 'Partner',
    pickPlaceholder: 'Choose sign',
    swap: 'Swap signs',
    recentTitle: 'Recent pairs',
    previewEyebrow: 'Live preview',
    scoreLabel: 'Overall resonance',
    emptyTitle: 'Pick two signs',
    emptyText: 'Select both signs to unlock the preview with strengths, tension points, and the best approach for this pair.',
    premiumTitle: 'Unlock the full compatibility reading',
    premiumText: 'The free preview shows the core dynamic. Premium adds deeper relationship guidance and a clearer explanation of where friction comes from.',
    detailsCta: 'Why this match looks like this',
    detailsTitle: 'Compatibility details',
    detailsTabs: {
      chemistry: 'Chemistry',
      rhythm: 'Rhythm',
      method: 'Method',
    },
    advice: {
      strength: 'Strength',
      tension: 'Watch',
      approach: 'Best approach',
    },
    approaches: {
      high: 'Lean into what already works, but keep the connection intentional so ease does not become autopilot.',
      mid: 'This pair works best when expectations are named clearly and both sides adjust pace instead of assuming.',
      low: 'Slow the dynamic down, name the difference early, and treat clarity as part of care instead of conflict.',
    },
    deepTitle: 'Premium depth',
    deepLabels: {
      chemistry: 'Element chemistry',
      rhythm: 'Relationship pace',
      support: 'What helps this pair',
    },
    overall: {
      high: 'High resonance',
      mid: 'Good potential',
      low: 'Contrast with growth',
    },
    warnings: {
      cardinal_cardinal: 'Both people want to lead. Decisions work better when control is shared early.',
      cardinal_fixed: 'One pushes forward while the other stabilizes. Pace matters more than intensity here.',
      cardinal_mutable: 'This pair moves easily, but direction has to stay clear or energy scatters.',
      fixed_fixed: 'Strong loyalty is here, but stubborn moments can freeze the connection.',
      fixed_mutable: 'Different pace is the main tension: one protects, the other shifts.',
      mutable_mutable: 'There is flexibility and ease, but the pair needs structure to stay grounded.',
    },
    strengths: {
      air_air: 'Fast mental chemistry and easy conversation create momentum quickly.',
      air_earth: 'Ideas meet structure, so this pair can turn thoughts into something tangible.',
      air_fire: 'There is spark, movement, and strong inspiration between these two signs.',
      air_water: 'This pair brings thought and feeling together when both sides stay patient.',
      earth_earth: 'Consistency and trust grow naturally here and become a strong base.',
      earth_fire: 'One brings drive, the other turns it into real-world progress.',
      earth_water: 'Care and stability support each other well in this match.',
      fire_fire: 'High energy and mutual courage make this pair feel alive fast.',
      fire_water: 'Intensity and sensitivity create depth when the tone stays gentle.',
      water_water: 'This is naturally intuitive, emotionally rich, and deeply receptive.',
    },
    spheres: {
      emotion: {
        high: 'Warm and emotionally available.',
        mid: 'Feelings work, but need a little translation.',
        low: 'Sensitivity needs more care and patience.',
      },
      communication: {
        high: 'Talking things through feels natural.',
        mid: 'Works best with timing and clarity.',
        low: 'Misreads happen when reactions are too fast.',
      },
      stability: {
        high: 'Strong long-term potential.',
        mid: 'Needs shared rhythm and routines.',
        low: 'Different needs can pull in separate directions.',
      },
    },
    detailsSections: {
      pair: 'Selected pair',
      chemistry: 'Element chemistry',
      support: 'Best support',
      rhythm: 'Relationship rhythm',
      watch: 'Main tension',
      method: 'Calculation',
      transparency: 'Transparency',
    },
    methodTitle: 'The score blends element chemistry and modality pace.',
    methodText: 'Element chemistry carries 65% of the score, while modality pace carries 35%. Then the page translates that into a clearer relationship preview.',
    methodScores: {
      element: 'Element score',
      modality: 'Modality score',
      final: 'Final score',
    },
    transparencyText: 'This is still a sun-sign compatibility model, not a full synastry chart. It should feel like guidance, not a final verdict.',
    pickYou: 'Pick your sign',
    pickPartner: 'Pick the other sign',
    confirm: 'OK',
  },
  uk: {
    title: 'Сумісність',
    subtitle: 'Подивись на динаміку між двома знаками більш зрозуміло й корисно.',
    heroEyebrow: 'Інсайт стосунків',
    heroTitle: 'Порівняй два знаки',
    heroText: 'Обери свій знак і знак іншої людини, щоб побачити емоційну динаміку, стиль комунікації та довгий ритм пари.',
    you: 'Ти',
    partner: 'Партнер',
    pickPlaceholder: 'Обрати знак',
    swap: 'Поміняти знаки місцями',
    recentTitle: 'Останні пари',
    previewEyebrow: 'Живий preview',
    scoreLabel: 'Загальний резонанс',
    emptyTitle: 'Обери два знаки',
    emptyText: 'Вибери обидва знаки, щоб відкрити preview з сильними сторонами, точками напруги й найкращим підходом для цієї пари.',
    premiumTitle: 'Відкрий повне читання сумісності',
    premiumText: 'Безкоштовний preview показує базову динаміку. Преміум додає глибше пояснення стосунків і чіткіше показує, звідки береться напруга.',
    detailsCta: 'Чому ця пара виглядає саме так',
    detailsTitle: 'Деталі сумісності',
    detailsTabs: {
      chemistry: 'Хімія',
      rhythm: 'Ритм',
      method: 'Метод',
    },
    advice: {
      strength: 'Сила',
      tension: 'Слабке місце',
      approach: 'Найкращий підхід',
    },
    approaches: {
      high: 'Спирайтесь на те, що вже працює, але тримайте зв’язок усвідомленим, щоб легкість не стала автопілотом.',
      mid: 'Ця пара працює найкраще, коли очікування озвучені прямо, а обидві сторони підлаштовують темп замість здогадок.',
      low: 'Сповільніть динаміку, рано називайте відмінності й сприймайте ясність як частину турботи, а не конфлікту.',
    },
    deepTitle: 'Преміум-глибина',
    deepLabels: {
      chemistry: 'Хімія елементів',
      rhythm: 'Ритм стосунків',
      support: 'Що допомагає цій парі',
    },
    overall: {
      high: 'Сильний резонанс',
      mid: 'Хороший потенціал',
      low: 'Контраст із точкою росту',
    },
    warnings: {
      cardinal_cardinal: 'Обидва хочуть вести. Рішення працюють краще, коли контроль ділиться з самого початку.',
      cardinal_fixed: 'Один штовхає вперед, інший стабілізує. Тут темп важливіший за інтенсивність.',
      cardinal_mutable: 'Пара рухається легко, але напрямок має лишатися ясним, інакше енергія розсіюється.',
      fixed_fixed: 'Тут є сильна вірність, але вперті моменти можуть заморожувати зв’язок.',
      fixed_mutable: 'Головна напруга тут у різному темпі: один тримає, інший змінює.',
      mutable_mutable: 'Тут є гнучкість і легкість, але парі потрібна структура, щоб не втрачати ґрунт.',
    },
    strengths: {
      air_air: 'Сильна ментальна хімія й легка розмова швидко запускають зв’язок.',
      air_earth: 'Ідеї зустрічаються зі структурою, тому ця пара може втілювати думки в реальність.',
      air_fire: 'Між цими знаками є іскра, рух і сильне взаємне натхнення.',
      air_water: 'Ця пара зводить думку й почуття разом, коли обидві сторони не поспішають.',
      earth_earth: 'Стабільність і довіра тут ростуть природно й стають сильною базою.',
      earth_fire: 'Один приносить драйв, інший перетворює його на реальний результат.',
      earth_water: 'Турбота й стабільність добре підтримують одна одну в цій парі.',
      fire_fire: 'Висока енергія й взаємна сміливість швидко роблять цю пару живою.',
      fire_water: 'Інтенсивність і чутливість створюють глибину, якщо тон лишається м’яким.',
      water_water: 'Тут природно багато інтуїції, емоційної глибини й чутливості.',
    },
    spheres: {
      emotion: {
        high: 'Тепло й емоційна відкритість.',
        mid: 'Почуття працюють, але їм треба трохи перекладу.',
        low: 'Чутливість потребує більше делікатності й терпіння.',
      },
      communication: {
        high: 'Домовлятися між собою тут природно.',
        mid: 'Найкраще працює з таймінгом і ясністю.',
        low: 'Непорозуміння з’являються, коли реакції занадто швидкі.',
      },
      stability: {
        high: 'Сильний потенціал на довгу дистанцію.',
        mid: 'Потрібні спільний ритм і звички.',
        low: 'Різні потреби можуть тягнути в різні боки.',
      },
    },
    detailsSections: {
      pair: 'Обрана пара',
      chemistry: 'Хімія елементів',
      support: 'Найкраща підтримка',
      rhythm: 'Ритм стосунків',
      watch: 'Головна напруга',
      method: 'Розрахунок',
      transparency: 'Прозорість',
    },
    methodTitle: 'Оцінка поєднує хімію елементів і ритм модальностей.',
    methodText: 'Хімія елементів дає 65% оцінки, а ритм модальностей 35%. Потім сторінка переводить це в більш людський preview стосунків.',
    methodScores: {
      element: 'Бал елементів',
      modality: 'Бал модальностей',
      final: 'Фінальний бал',
    },
    transparencyText: 'Це все ще модель сумісності по сонячних знаках, а не повна синастрія. Її краще сприймати як підказку, а не остаточний вердикт.',
    pickYou: 'Обери свій знак',
    pickPartner: 'Обери інший знак',
    confirm: 'OK',
  },
}

const copy = computed(() => copyByLocale[locale.value] || copyByLocale.en)

const RECENT_PAIRS_KEY = 'arcana_compatibility_recent_pairs_v1'

const signs = [
  { key: 'aries', element: 'fire', modality: 'cardinal' },
  { key: 'taurus', element: 'earth', modality: 'fixed' },
  { key: 'gemini', element: 'air', modality: 'mutable' },
  { key: 'cancer', element: 'water', modality: 'cardinal' },
  { key: 'leo', element: 'fire', modality: 'fixed' },
  { key: 'virgo', element: 'earth', modality: 'mutable' },
  { key: 'libra', element: 'air', modality: 'cardinal' },
  { key: 'scorpio', element: 'water', modality: 'fixed' },
  { key: 'sagittarius', element: 'fire', modality: 'mutable' },
  { key: 'capricorn', element: 'earth', modality: 'cardinal' },
  { key: 'aquarius', element: 'air', modality: 'fixed' },
  { key: 'pisces', element: 'water', modality: 'mutable' },
]

const signLabels = computed(() => signs.map((sign) => tt(`zodiac.${sign.key}`)))
const selectedIndexA = ref(null)
const selectedIndexB = ref(null)
const selectedWheelIndex = ref(0)
const activePicker = ref('a')
const sheetOpen = ref(false)
const detailsOpen = ref(false)
const detailsTab = ref('chemistry')
const wheelRef = ref(null)
const lastHapticAt = ref(0)
const displayScore = ref(0)
const recentPairs = ref([])
let scoreAnimFrame = 0

const premiumBullets = computed(() => [
  tt('premiumAccess.compatibility.bullets.report'),
  tt('premiumAccess.compatibility.bullets.scores'),
  tt('premiumAccess.compatibility.bullets.insight'),
])

const selectedSignA = computed(() => (selectedIndexA.value == null ? null : signs[selectedIndexA.value] || null))
const selectedSignB = computed(() => (selectedIndexB.value == null ? null : signs[selectedIndexB.value] || null))
const hasPair = computed(() => Boolean(selectedSignA.value && selectedSignB.value))

const selectedLabelAReal = computed(() => (selectedSignA.value ? tt(`zodiac.${selectedSignA.value.key}`) : ''))
const selectedLabelBReal = computed(() => (selectedSignB.value ? tt(`zodiac.${selectedSignB.value.key}`) : ''))
const selectedLabelA = computed(() => selectedLabelAReal.value || copy.value.pickPlaceholder)
const selectedLabelB = computed(() => selectedLabelBReal.value || copy.value.pickPlaceholder)

const elementAKey = computed(() => selectedSignA.value?.element || '')
const elementBKey = computed(() => selectedSignB.value?.element || '')
const modalityAKey = computed(() => selectedSignA.value?.modality || '')
const modalityBKey = computed(() => selectedSignB.value?.modality || '')

const elementPairKey = computed(() => (hasPair.value ? [elementAKey.value, elementBKey.value].sort().join('_') : ''))
const modalityPairKey = computed(() => (hasPair.value ? [modalityAKey.value, modalityBKey.value].sort().join('_') : ''))

const elementA = computed(() => (elementAKey.value ? tt(`compatibilityPage.elements.${elementAKey.value}`) : ''))
const elementB = computed(() => (elementBKey.value ? tt(`compatibilityPage.elements.${elementBKey.value}`) : ''))
const modalityLabelA = computed(() => (modalityAKey.value ? tt(`compatibilityPage.modalities.${modalityAKey.value}`) : ''))
const modalityLabelB = computed(() => (modalityBKey.value ? tt(`compatibilityPage.modalities.${modalityBKey.value}`) : ''))
const modalityPairLabel = computed(() =>
  hasPair.value ? `${modalityLabelA.value} + ${modalityLabelB.value}` : '',
)

const pairTitle = computed(() => (hasPair.value ? `${selectedLabelAReal.value} + ${selectedLabelBReal.value}` : ''))
const pairLine = computed(() =>
  hasPair.value
    ? formatText(tt('compatibilityPage.elementLine'), { a: elementA.value, b: elementB.value })
    : '',
)

const elementScoreMap = {
  air_air: 84,
  air_earth: 58,
  air_fire: 78,
  air_water: 64,
  earth_earth: 83,
  earth_fire: 64,
  earth_water: 78,
  fire_fire: 86,
  fire_water: 58,
  water_water: 82,
}

const modalityScoreMap = {
  cardinal_cardinal: 64,
  fixed_fixed: 66,
  mutable_mutable: 68,
  cardinal_fixed: 60,
  cardinal_mutable: 76,
  fixed_mutable: 62,
}

const elementScore = computed(() => {
  if (!hasPair.value) return 0
  return elementScoreMap[elementPairKey.value] ?? 70
})

const modalityScore = computed(() => {
  if (!hasPair.value) return 0
  return modalityScoreMap[modalityPairKey.value] ?? 70
})

const compatibilityScore = computed(() => {
  if (!hasPair.value) return 0
  return Math.round(elementScore.value * 0.65 + modalityScore.value * 0.35)
})

const scoreTier = computed(() => {
  if (compatibilityScore.value >= 82) return 'high'
  if (compatibilityScore.value >= 70) return 'mid'
  return 'low'
})

const overallLabel = computed(() => copy.value.overall[scoreTier.value])
const summaryText = computed(() => (hasPair.value ? tt(`compatibilityPage.summary.${scoreTier.value}`) : ''))
const confidenceLabel = computed(() => (hasPair.value ? tt(`compatibilityPage.confidence.${scoreTier.value}`) : ''))
const resultText = computed(() => (hasPair.value ? tt(`compatibilityPage.elementTexts.${elementPairKey.value}`) : ''))
const insightText = computed(() => (hasPair.value ? tt(`compatibilityPage.insights.${elementPairKey.value}`) : ''))
const paceText = computed(() => (hasPair.value ? tt(`compatibilityPage.modalityTexts.${modalityPairKey.value}`) : ''))
const strengthText = computed(() => (hasPair.value ? copy.value.strengths[elementPairKey.value] : ''))
const cautionText = computed(() => (hasPair.value ? copy.value.warnings[modalityPairKey.value] : ''))
const approachText = computed(() => (hasPair.value ? copy.value.approaches[scoreTier.value] : ''))

const elementColorMap = {
  fire: '#F18E72',
  earth: '#99CF9D',
  air: '#8DBEF0',
  water: '#7A9FF1',
}

const resultStyle = computed(() => ({
  '--compat-accent-a': elementColorMap[elementAKey.value] || '#8DBEF0',
  '--compat-accent-b': elementColorMap[elementBKey.value] || '#7A9FF1',
}))

const sphereItems = computed(() => {
  if (!hasPair.value) return []
  const scores = getSphereScores()
  return [
    {
      key: 'emotion',
      label: tt('compatibilityPage.spheres.emotion'),
      value: scores.emotion,
      text: getSphereText('emotion', scores.emotion),
    },
    {
      key: 'communication',
      label: tt('compatibilityPage.spheres.communication'),
      value: scores.communication,
      text: getSphereText('communication', scores.communication),
    },
    {
      key: 'stability',
      label: tt('compatibilityPage.spheres.stability'),
      value: scores.stability,
      text: getSphereText('stability', scores.stability),
    },
  ]
})

const recentPairsWithLabels = computed(() =>
  recentPairs.value
    .map((pair) => {
      const first = signs[pair.a]
      const second = signs[pair.b]
      if (!first || !second) return null
      return {
        ...pair,
        key: `${pair.a}-${pair.b}`,
        label: `${tt(`zodiac.${first.key}`)} + ${tt(`zodiac.${second.key}`)}`,
      }
    })
    .filter(Boolean),
)

const detailsTabs = computed(() => [
  { id: 'chemistry', label: copy.value.detailsTabs.chemistry },
  { id: 'rhythm', label: copy.value.detailsTabs.rhythm },
  { id: 'method', label: copy.value.detailsTabs.method },
])

function formatText(template, vars) {
  if (!template) return ''
  return Object.entries(vars || {}).reduce((acc, [key, value]) => acc.replaceAll(`{${key}}`, value), template)
}

function clamp(value) {
  return Math.max(30, Math.min(90, Math.round(value)))
}

function getSphereScores() {
  const elements = [elementAKey.value, elementBKey.value]
  return {
    emotion: clamp(50 + elements.filter((el) => el === 'water').length * 18 - elements.filter((el) => el === 'air').length * 6),
    communication: clamp(50 + elements.filter((el) => el === 'air').length * 18 - elements.filter((el) => el === 'earth').length * 6),
    stability: clamp(50 + elements.filter((el) => el === 'earth').length * 18 - elements.filter((el) => el === 'fire').length * 6),
  }
}

function getSphereText(key, score) {
  if (score >= 78) return copy.value.spheres[key].high
  if (score >= 62) return copy.value.spheres[key].mid
  return copy.value.spheres[key].low
}

async function hapticSelect() {
  if (!Capacitor.isNativePlatform()) return
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {
    // ignore haptic failures
  }
}

function setHideBottomNav(enabled) {
  if (typeof document === 'undefined') return
  document.body.classList.toggle('hide-bottom-nav', enabled)
}

function loadRecentPairs() {
  if (typeof window === 'undefined') return
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_PAIRS_KEY) || '[]')
    if (!Array.isArray(parsed)) return
    recentPairs.value = parsed
      .filter((item) => Number.isInteger(item?.a) && Number.isInteger(item?.b))
      .filter((item) => item.a >= 0 && item.a < signs.length && item.b >= 0 && item.b < signs.length)
      .slice(0, 4)
  } catch {
    recentPairs.value = []
  }
}

function persistRecentPairs() {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(RECENT_PAIRS_KEY, JSON.stringify(recentPairs.value))
}

function rememberPair(a, b) {
  if (!Number.isInteger(a) || !Number.isInteger(b)) return
  recentPairs.value = [{ a, b }, ...recentPairs.value.filter((item) => item.a !== a || item.b !== b)].slice(0, 4)
  persistRecentPairs()
}

function animateScore(target) {
  if (typeof requestAnimationFrame !== 'function') {
    displayScore.value = target
    return
  }
  cancelAnimationFrame(scoreAnimFrame)
  const start = performance.now()
  const from = displayScore.value
  const duration = 480
  const tick = (now) => {
    const progress = Math.min(1, (now - start) / duration)
    displayScore.value = Math.round(from + (target - from) * progress)
    if (progress < 1) {
      scoreAnimFrame = requestAnimationFrame(tick)
    }
  }
  scoreAnimFrame = requestAnimationFrame(tick)
}

async function onBack() {
  await hapticSelect()
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back()
    return
  }
  await router.replace({ name: 'menu' })
}

async function goPremium() {
  await hapticSelect()
  await router.push({
    name: 'premium',
    query: { source: hasPair.value ? 'compatibility_preview' : 'compatibility_entry', entry: 'compatibility' },
  })
}

function openPicker(which) {
  activePicker.value = which
  selectedWheelIndex.value = which === 'a' ? selectedIndexA.value ?? 0 : selectedIndexB.value ?? 0
  sheetOpen.value = true
  void hapticSelect()
  nextTick(() => scrollWheelTo(selectedWheelIndex.value, false))
}

function onWheelScroll() {
  const wheel = wheelRef.value
  if (!wheel) return
  const rawIndex = Math.round(wheel.scrollTop / 44)
  const nextIndex = Math.min(signs.length - 1, Math.max(0, rawIndex))
  if (nextIndex === selectedWheelIndex.value) return
  selectedWheelIndex.value = nextIndex
  const now = Date.now()
  if (now - lastHapticAt.value > 80) {
    void hapticSelect()
    lastHapticAt.value = now
  }
}

function onWheelItemTap(index) {
  selectedWheelIndex.value = index
  scrollWheelTo(index, true)
  applyWheelSelection(index)
  void hapticSelect()
}

function scrollWheelTo(index, smooth) {
  const wheel = wheelRef.value
  if (!wheel) return
  const top = index * 44
  wheel.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' })
}

function applyWheelSelection(nextIndex) {
  if (activePicker.value === 'a') {
    selectedIndexA.value = nextIndex
  } else {
    selectedIndexB.value = nextIndex
  }
  if ((activePicker.value === 'a' ? nextIndex : selectedIndexA.value) != null && (activePicker.value === 'b' ? nextIndex : selectedIndexB.value) != null) {
    rememberPair(
      activePicker.value === 'a' ? nextIndex : selectedIndexA.value,
      activePicker.value === 'b' ? nextIndex : selectedIndexB.value,
    )
  }
  detailsOpen.value = false
  detailsTab.value = 'chemistry'
}

async function swapSigns() {
  if (!hasPair.value) return
  const nextA = selectedIndexB.value
  const nextB = selectedIndexA.value
  selectedIndexA.value = nextA
  selectedIndexB.value = nextB
  rememberPair(nextA, nextB)
  await hapticSelect()
}

async function applyRecentPair(pair) {
  selectedIndexA.value = pair.a
  selectedIndexB.value = pair.b
  detailsOpen.value = false
  detailsTab.value = 'chemistry'
  rememberPair(pair.a, pair.b)
  await hapticSelect()
}

async function onDetailsOpen() {
  if (!hasPair.value) return
  detailsOpen.value = true
  await hapticSelect()
}

async function onDetailsClose() {
  detailsOpen.value = false
  await hapticSelect()
}

async function onDetailsTabClick(tabId) {
  detailsTab.value = tabId
  await hapticSelect()
}

watch(
  () => sheetOpen.value || detailsOpen.value,
  (value) => {
    setHideBottomNav(value)
  },
)

watch(
  [selectedIndexA, selectedIndexB],
  () => {
    detailsOpen.value = false
    detailsTab.value = 'chemistry'
    if (!hasPair.value) {
      displayScore.value = 0
      cancelAnimationFrame(scoreAnimFrame)
      return
    }
    animateScore(compatibilityScore.value)
  },
  { immediate: true },
)

watch(
  () => hasPremiumAccess.value,
  (enabled) => {
    if (enabled) return
    detailsOpen.value = false
  },
)

onMounted(() => {
  loadRecentPairs()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(scoreAnimFrame)
  setHideBottomNav(false)
})
</script>

<style scoped lang="scss">
.compat-page {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  color: #edf2f8;
  background: #050d15;
}

.compat-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(110% 58% at 50% 0%, rgba(28, 70, 105, 0.32) 0%, rgba(11, 22, 33, 0.14) 42%, rgba(5, 13, 21, 0) 72%),
    linear-gradient(180deg, #08131d 0%, #050d15 100%);
}

.compat-content {
  position: relative;
  z-index: 1;
  padding:
    calc(90px + env(safe-area-inset-top, 0px))
    16px
    calc(86px + env(safe-area-inset-bottom, 0px) + 10px);
  max-width: 520px;
  margin: 0 auto;
  display: grid;
  gap: 14px;
}

.compat-topbar {
  display: grid;
  grid-template-columns: 36px 1fr 36px;
  gap: 8px;
  align-items: center;
}

.compat-back {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(240, 245, 252, 0.82);
  display: grid;
  place-items: center;
}

.compat-topbar__text {
  display: grid;
  gap: 3px;
  justify-items: center;
  text-align: center;
}

.compat-topbar__title {
  font-size: 16px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.94);
}

.compat-topbar__subtitle {
  font-size: 11px;
  line-height: 1.35;
  color: rgba(219, 229, 242, 0.48);
  max-width: 280px;
}

.compat-topbar__ghost {
  width: 36px;
}

.compat-shell {
  display: grid;
  gap: 14px;
}

.compat-card {
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background:
    radial-gradient(120% 120% at 100% 0%, rgba(83, 123, 170, 0.16) 0%, rgba(83, 123, 170, 0) 55%),
    linear-gradient(160deg, rgba(12, 20, 31, 0.96), rgba(6, 11, 19, 0.98));
  box-shadow:
    0 18px 38px rgba(1, 6, 12, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
  padding: 16px;
}

.compat-card--hero {
  display: grid;
  gap: 14px;
}

.compat-card--preview {
  display: grid;
  gap: 14px;
}

.compat-card__eyebrow {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(186, 207, 232, 0.56);
}

.compat-hero-copy {
  display: grid;
  gap: 5px;
}

.compat-hero-copy__title {
  font-size: 24px;
  line-height: 1.1;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.96);
  letter-spacing: -0.02em;
}

.compat-hero-copy__text {
  font-size: 13px;
  line-height: 1.55;
  color: rgba(230, 238, 248, 0.62);
}

.compat-pair-stage {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 8px;
  align-items: center;
}

.compat-sign-pill {
  min-height: 76px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  padding: 12px 14px;
  display: grid;
  gap: 6px;
  text-align: left;
}

.compat-sign-pill__label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(186, 207, 232, 0.5);
}

.compat-sign-pill__value {
  font-size: 16px;
  line-height: 1.2;
  font-weight: 600;
  color: rgba(248, 250, 253, 0.94);
}

.compat-swap {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(218, 230, 245, 0.86);
  display: grid;
  place-items: center;
}

.compat-swap:disabled {
  opacity: 0.4;
}

.compat-recents {
  display: grid;
  gap: 8px;
}

.compat-recents__label {
  font-size: 11px;
  color: rgba(214, 225, 242, 0.52);
}

.compat-recents__row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.compat-recent-chip {
  padding: 8px 11px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(236, 242, 251, 0.8);
  font-size: 12px;
}

.compat-preview-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.compat-preview-top__copy {
  display: grid;
  gap: 4px;
}

.compat-preview-top__title {
  font-size: 22px;
  line-height: 1.1;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.96);
  letter-spacing: -0.02em;
}

.compat-preview-top__line {
  font-size: 12px;
  color: rgba(214, 225, 242, 0.54);
}

.compat-preview-top__meta {
  flex-shrink: 0;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(230, 238, 248, 0.78);
  font-size: 11px;
  font-weight: 600;
}

.compat-score-shell {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 14px;
  align-items: center;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  background:
    radial-gradient(110% 160% at 0% 0%, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0) 54%),
    linear-gradient(135deg, rgba(7, 12, 20, 0.9), rgba(9, 14, 24, 0.98));
}

.compat-score-block {
  display: grid;
  gap: 4px;
  min-width: 94px;
}

.compat-score-block__value {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  font-size: 48px;
  line-height: 0.95;
  font-weight: 700;
  background: linear-gradient(135deg, var(--compat-accent-a), var(--compat-accent-b));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.compat-score-block__value small {
  font-size: 18px;
  line-height: 1.2;
}

.compat-score-block__label {
  font-size: 11px;
  color: rgba(214, 225, 242, 0.52);
}

.compat-score-copy {
  display: grid;
  gap: 6px;
}

.compat-score-copy__headline {
  font-size: 18px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.94);
}

.compat-score-copy__summary {
  font-size: 13px;
  line-height: 1.5;
  color: rgba(231, 238, 249, 0.8);
}

.compat-score-copy__hint {
  font-size: 12px;
  line-height: 1.5;
  color: rgba(205, 218, 235, 0.56);
}

.compat-meter {
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.compat-meter__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--compat-accent-a), var(--compat-accent-b));
  box-shadow: 0 0 12px rgba(123, 172, 232, 0.26);
  transition: width 380ms ease;
}

.compat-spheres {
  display: grid;
  gap: 10px;
}

.compat-sphere-card {
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(255, 255, 255, 0.03);
  padding: 12px;
  display: grid;
  gap: 8px;
}

.compat-sphere-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.compat-sphere-card__title {
  font-size: 12px;
  font-weight: 600;
  color: rgba(245, 248, 252, 0.88);
}

.compat-sphere-card__value {
  font-size: 12px;
  font-weight: 700;
  color: rgba(212, 226, 244, 0.72);
}

.compat-sphere-card__bar {
  height: 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
  overflow: hidden;
}

.compat-sphere-card__bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, rgba(121, 177, 233, 0.92), rgba(185, 218, 248, 0.96));
}

.compat-sphere-card__text {
  font-size: 12px;
  line-height: 1.45;
  color: rgba(215, 227, 242, 0.6);
}

.compat-advice-grid {
  display: grid;
  gap: 10px;
}

.compat-advice-card,
.compat-deep-card,
.compat-premium-card,
.details-card {
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(255, 255, 255, 0.03);
}

.compat-advice-card {
  padding: 14px;
  display: grid;
  gap: 6px;
}

.compat-advice-card__label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(186, 207, 232, 0.54);
}

.compat-advice-card__text {
  font-size: 13px;
  line-height: 1.55;
  color: rgba(236, 242, 251, 0.82);
}

.compat-deep-card,
.compat-premium-card {
  padding: 14px;
  display: grid;
  gap: 12px;
}

.compat-deep-card__title,
.compat-premium-card__title {
  font-size: 16px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.94);
}

.compat-deep-card__row {
  display: grid;
  gap: 4px;
}

.compat-deep-card__label,
.compat-premium-card__badge {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(186, 207, 232, 0.54);
}

.compat-deep-card__text,
.compat-premium-card__text {
  font-size: 13px;
  line-height: 1.55;
  color: rgba(236, 242, 251, 0.76);
}

.compat-premium-card__badge {
  justify-self: start;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid rgba(186, 207, 247, 0.2);
  background: rgba(87, 123, 190, 0.18);
  color: rgba(238, 245, 255, 0.86);
}

.compat-premium-card__list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
  color: rgba(236, 242, 251, 0.76);
  font-size: 12px;
  line-height: 1.5;
}

.compat-premium-card__cta,
.compat-details-link,
.oracle-actions__ok {
  min-height: 46px;
  border-radius: 14px;
  border: 1px solid rgba(156, 184, 235, 0.24);
  background: linear-gradient(180deg, rgba(28, 38, 58, 0.92), rgba(10, 15, 27, 0.98));
  color: #edf2f8;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
}

.compat-details-link {
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.07);
}

.compat-empty {
  padding: 32px 14px;
  text-align: center;
  display: grid;
  gap: 10px;
}

.compat-empty__title {
  font-size: 18px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
}

.compat-empty__text {
  font-size: 13px;
  line-height: 1.55;
  color: rgba(214, 225, 242, 0.6);
}

.oracle-actions {
  width: 100vw;
  max-width: 100vw;
  border-radius: 22px 22px 0 0;
  padding: 8px 12px calc(env(safe-area-inset-bottom, 0px) + 20px);
  background: #050d15;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 -18px 40px rgba(0, 0, 0, 0.36);
  color: #fff;
}

.oracle-actions-dialog--details .oracle-actions {
  min-height: 72vh;
  display: flex;
  flex-direction: column;
}

.oracle-actions-dialog--details .oracle-actions__footer {
  margin-top: auto;
}

.sheet-handle {
  width: 36px;
  height: 3px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  margin: 0 auto 10px;
}

.sheet-title {
  text-align: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.76);
  margin-bottom: 8px;
}

.oracle-wheel {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
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
  background: linear-gradient(180deg, rgba(5, 13, 21, 0.96), rgba(5, 13, 21, 0));
}

.oracle-wheel::after {
  bottom: 0;
  background: linear-gradient(0deg, rgba(5, 13, 21, 0.96), rgba(5, 13, 21, 0));
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
  height: 220px;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: y mandatory;
  z-index: 3;
  scrollbar-width: none;
  touch-action: pan-y;
  overscroll-behavior-y: contain;
}

.oracle-wheel__scroll::-webkit-scrollbar {
  display: none;
}

.oracle-wheel__spacer {
  height: 88px;
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

.details-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.details-tab {
  min-height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(218, 228, 242, 0.6);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.details-tab--active {
  color: rgba(255, 255, 255, 0.95);
  border-color: rgba(159, 216, 246, 0.25);
  background: rgba(104, 142, 191, 0.16);
}

.details-body {
  min-height: 340px;
  padding-top: 10px;
}

.details-stack {
  display: grid;
  gap: 10px;
}

.details-card {
  padding: 14px;
  display: grid;
  gap: 6px;
}

.details-card__label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(186, 207, 232, 0.54);
}

.details-card__title {
  font-size: 15px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.94);
}

.details-card__text {
  font-size: 13px;
  line-height: 1.55;
  color: rgba(236, 242, 251, 0.74);
}

.details-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.details-row__label {
  font-size: 12px;
  color: rgba(214, 225, 242, 0.62);
}

.details-row__value {
  font-size: 13px;
  font-weight: 700;
  color: rgba(244, 248, 252, 0.9);
}

.details-row--final .details-row__value {
  color: rgba(255, 255, 255, 0.98);
}

@media (max-height: 760px) {
  .compat-content {
    gap: 12px;
  }

  .compat-hero-copy__title,
  .compat-preview-top__title {
    font-size: 20px;
  }

  .compat-sign-pill {
    min-height: 68px;
  }
}

@media (hover: hover) {
  .compat-sign-pill:hover,
  .compat-recent-chip:hover,
  .compat-swap:hover,
  .compat-premium-card__cta:hover,
  .compat-details-link:hover,
  .oracle-actions__ok:hover {
    border-color: rgba(255, 255, 255, 0.12);
  }
}
</style>
