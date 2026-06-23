<template>
  <q-page class="zodiac-page">
    <div class="zodiac-bg" aria-hidden="true"></div>

    <div class="zodiac-content">
      <header class="zodiac-hero zodiac-hero--with-back">
        <button type="button" class="zodiac-back" @click="onBack">
          <q-icon name="chevron_left" size="18px" />
        </button>
        <div class="zodiac-hero__text">
          <div class="zodiac-title">{{ tt('zodiacGuidePage.title') }}</div>
          <div class="zodiac-kicker">{{ tt('zodiacGuidePage.subtitle') }}</div>
        </div>
      </header>

      <p class="zodiac-lead">{{ tt('zodiacGuidePage.introText') }}</p>

      <button
        v-if="mySignCard"
        type="button"
        class="mysign-jump"
        :style="{ '--accent': mySignCard.accent, '--accent-soft': mySignCard.accentSoft }"
        @click="goToSign(mySignCard.key)"
      >
        <span class="mysign-jump__glyph">{{ mySignCard.emoji }}</span>
        <span class="mysign-jump__text">
          <span class="mysign-jump__label">{{ tt('zodiacGuidePage.mySign.title') }}</span>
          <span class="mysign-jump__name">{{ mySignCard.name }}</span>
        </span>
        <q-icon name="arrow_forward" size="16px" class="mysign-jump__arrow" />
      </button>

      <button type="button" class="compat-banner" @click="goToCompatibility">
        <div class="compat-banner__text">
          <div class="compat-banner__title">{{ tt('zodiacGuidePage.compatCta.title') }}</div>
          <div class="compat-banner__sub">{{ tt('zodiacGuidePage.compatCta.text') }}</div>
        </div>
        <span class="compat-banner__cta">
          <span>{{ tt('zodiacGuidePage.compatCta.button') }}</span>
          <q-icon name="arrow_forward" size="16px" />
        </span>
      </button>

      <section v-if="favoriteSigns.length" class="zodiac-card zodiac-card--favorites">
        <div class="zodiac-card__title">{{ tt('zodiacGuidePage.favorites.title') }}</div>
        <div class="favorite-list">
          <button
            v-for="sign in favoriteSigns"
            :key="sign.key"
            type="button"
            class="favorite-chip"
            @click="goToSign(sign.key)"
          >
            <span>{{ sign.emoji }}</span>
            <span>{{ sign.name }}</span>
          </button>
        </div>
      </section>

      <div class="element-filters">
        <button
          v-for="item in filterItems"
          :key="item.key"
          type="button"
          class="element-chip"
          :class="{ 'element-chip--active': activeElement === item.key }"
          @click="setElement(item.key)"
        >
          {{ item.label }}
        </button>
      </div>

      <transition-group name="card-list" tag="section" class="zodiac-grid">
        <article
          v-for="(sign, index) in filteredSigns"
          :key="sign.key"
          :ref="setSignRef(sign.key)"
          class="zodiac-card zodiac-card--sign"
          :class="{ 'zodiac-card--mine': sign.mine }"
          :style="{ '--accent': sign.accent, '--accent-soft': sign.accentSoft, '--i': index }"
        >
          <header class="sign-head">
            <div class="sign-head__icon">{{ sign.emoji }}</div>
            <div class="sign-head__text">
              <div class="sign-head__name">
                <span>{{ sign.name }}</span>
                <span v-if="sign.mine" class="sign-mine-badge">{{ tt('zodiacGuidePage.mySign.title') }}</span>
              </div>
              <div class="sign-head__dates">{{ sign.dates }}</div>
              <div class="sign-head__archetype">{{ sign.archetype }}</div>
            </div>
            <button type="button" class="head-fav-btn" @click="toggleFavorite(sign.key)">
              <q-icon :name="isFavorite(sign.key) ? 'favorite' : 'favorite_border'" size="18px" />
            </button>
          </header>

          <div class="sign-tags">
            <span class="sign-tag">{{ tt('zodiacGuidePage.labels.element') }}: {{ sign.elementLabel }}</span>
            <span class="sign-tag">{{ tt('zodiacGuidePage.labels.modality') }}: {{ sign.modalityLabel }}</span>
          </div>

          <p class="sign-summary">{{ sign.summary }}</p>

          <div class="traits">
            <div class="traits__label">{{ tt('zodiacGuidePage.labels.traits') }}</div>
            <div class="traits__list">
              <span v-for="trait in sign.traits" :key="trait" class="trait-chip">{{ trait }}</span>
            </div>
          </div>

          <transition name="expand-fade">
            <div v-if="expandedSign === sign.key" class="sign-details">
              <div class="quick-grid">
                <div class="quick-card">
                  <div class="quick-card__label">{{ tt('zodiacGuidePage.labels.strengths') }}</div>
                  <p class="quick-card__text">{{ sign.strengths }}</p>
                </div>
                <div class="quick-card">
                  <div class="quick-card__label">{{ tt('zodiacGuidePage.labels.challenge') }}</div>
                  <p class="quick-card__text">{{ sign.challenge }}</p>
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-row__label">{{ tt('zodiacGuidePage.labels.deepProfile') }}</div>
                <p class="detail-row__text">{{ sign.deepProfile }}</p>
              </div>
              <div class="detail-row">
                <div class="detail-row__label">{{ tt('zodiacGuidePage.labels.love') }}</div>
                <p class="detail-row__text">{{ sign.love }}</p>
              </div>
              <div class="detail-row">
                <div class="detail-row__label">{{ tt('zodiacGuidePage.labels.career') }}</div>
                <p class="detail-row__text">{{ sign.career }}</p>
              </div>
              <div class="detail-row">
                <div class="detail-row__label">{{ tt('zodiacGuidePage.labels.focus') }}</div>
                <p class="detail-row__text">{{ sign.focus }}</p>
              </div>
              <div v-if="sign.matches.length" class="detail-row detail-row--matches">
                <div class="detail-row__label">{{ tt('zodiacGuidePage.labels.bestMatches') }}</div>
                <div class="match-chips">
                  <button
                    v-for="match in sign.matches"
                    :key="match.key"
                    type="button"
                    class="match-chip"
                    @click="goToSign(match.key)"
                  >
                    <span class="match-chip__glyph">{{ match.emoji }}</span>
                    <span>{{ match.name }}</span>
                  </button>
                </div>
              </div>
              <div class="detail-row detail-row--mantra">
                <div class="detail-row__label">{{ tt('zodiacGuidePage.labels.mantra') }}</div>
                <p class="detail-row__text">{{ sign.mantra }}</p>
              </div>
            </div>
          </transition>

          <div class="actions-row">
            <button type="button" class="action-btn" @click="shareSign(sign)">
              <q-icon name="share" size="16px" />
              <span>{{ tt('zodiacGuidePage.labels.share') }}</span>
            </button>

            <button type="button" class="expand-btn" @click="toggleSign(sign.key)">
              <span>{{ expandedSign === sign.key ? tt('zodiacGuidePage.labels.showLess') : tt('zodiacGuidePage.labels.showMore') }}</span>
              <q-icon
                name="expand_more"
                size="18px"
                class="expand-btn__icon"
                :class="{ 'expand-btn__icon--open': expandedSign === sign.key }"
              />
            </button>
          </div>
        </article>
      </transition-group>
    </div>
  </q-page>
</template>

<script setup>
import { computed, ref, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { t, currentLocale } from 'src/i18n'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'stores/authStore.js'
import { selectAppUser } from 'src/services/supabaseNative'
import { Preferences } from '@capacitor/preferences'
import { resolveUserSignSnapshot } from 'src/helpers/zodiacUserSignCore.js'

const locale = computed(() => currentLocale.value || 'en')
const tt = (key) => t(locale.value, key)
const router = useRouter()
const $q = useQuasar()
const authStore = useAuthStore()

const FAVORITES_KEY = 'zodiac-guide-favorites-v1'

const signs = [
  { key: 'aries', emoji: '♈', dates: '21.03 – 19.04', element: 'fire', modality: 'cardinal' },
  { key: 'taurus', emoji: '♉', dates: '20.04 – 20.05', element: 'earth', modality: 'fixed' },
  { key: 'gemini', emoji: '♊', dates: '21.05 – 20.06', element: 'air', modality: 'mutable' },
  { key: 'cancer', emoji: '♋', dates: '21.06 – 22.07', element: 'water', modality: 'cardinal' },
  { key: 'leo', emoji: '♌', dates: '23.07 – 22.08', element: 'fire', modality: 'fixed' },
  { key: 'virgo', emoji: '♍', dates: '23.08 – 22.09', element: 'earth', modality: 'mutable' },
  { key: 'libra', emoji: '♎', dates: '23.09 – 22.10', element: 'air', modality: 'cardinal' },
  { key: 'scorpio', emoji: '♏', dates: '23.10 – 21.11', element: 'water', modality: 'fixed' },
  { key: 'sagittarius', emoji: '♐', dates: '22.11 – 21.12', element: 'fire', modality: 'mutable' },
  { key: 'capricorn', emoji: '♑', dates: '22.12 – 19.01', element: 'earth', modality: 'cardinal' },
  { key: 'aquarius', emoji: '♒', dates: '20.01 – 18.02', element: 'air', modality: 'fixed' },
  { key: 'pisces', emoji: '♓', dates: '19.02 – 20.03', element: 'water', modality: 'mutable' },
]

const zodiacByMonthDay = (month, day) => {
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'aries'
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'taurus'
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'gemini'
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'cancer'
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'leo'
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'virgo'
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'libra'
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'scorpio'
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'sagittarius'
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'capricorn'
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'aquarius'
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return 'pisces'
  return ''
}

const zodiacFromRawDate = (rawDate) => {
  const raw = String(rawDate || '').trim()
  if (!raw) return ''

  if (raw.includes('.')) {
    const [dd, mm] = raw.split('.').map((v) => parseInt(v, 10))
    if (!dd || !mm) return ''
    return zodiacByMonthDay(mm, dd)
  }

  if (raw.includes('-')) {
    const [yyyy, mm, dd] = raw.split('-').map((v) => parseInt(v, 10))
    if (!yyyy || !dd || !mm) return ''
    return zodiacByMonthDay(mm, dd)
  }

  return ''
}

const elementPalette = {
  fire: { accent: '#ff8f66', soft: 'rgba(255, 143, 102, 0.22)' },
  earth: { accent: '#98d98e', soft: 'rgba(152, 217, 142, 0.22)' },
  air: { accent: '#85c9ff', soft: 'rgba(133, 201, 255, 0.22)' },
  water: { accent: '#8aa8ff', soft: 'rgba(138, 168, 255, 0.22)' },
}

const signProfiles = {
  aries: {
    uk: {
      traits: ['Ініціативність', 'Сміливість', 'Прямота'],
      strengths: 'Швидко запускає нові справи і добре тримає темп, коли є чітка ціль.',
      challenge: 'Імпульсивність і різкі реакції можуть псувати сильні ідеї.',
      love: 'Потребує щирості, живої динаміки та відчуття спільного руху вперед.',
      career: 'Найкраще працює в ролях, де потрібні рішення, швидкість і відповідальність.',
      focus: 'Перед стартом фіксуй 1 головний пріоритет, щоб енергія не розпорошувалась.',
    },
    en: {
      traits: ['Initiative', 'Courage', 'Directness'],
      strengths: 'Starts fast and keeps momentum well when the goal is clear.',
      challenge: 'Impulsive reactions can damage strong ideas.',
      love: 'Needs honesty, emotional spark, and a shared sense of movement.',
      career: 'Performs best in roles that require speed, ownership, and action.',
      focus: 'Set one main priority before you start to avoid scattered energy.',
    },
  },
  taurus: {
    uk: {
      traits: ['Стабільність', 'Практичність', 'Витривалість'],
      strengths: 'Створює надійну базу і доводить справи до результату без хаосу.',
      challenge: 'Опір змінам і затягування рішень у нових ситуаціях.',
      love: 'Цінує передбачуваність, турботу і спокійну лояльність у стосунках.',
      career: 'Сильний у довгих проєктах, фінансовій дисципліні та якості виконання.',
      focus: 'Додавай маленькі оновлення в рутину, щоб не застрягати в інерції.',
    },
    en: {
      traits: ['Stability', 'Practicality', 'Endurance'],
      strengths: 'Builds reliable systems and consistently delivers results.',
      challenge: 'Can resist change and delay decisions in new contexts.',
      love: 'Values safety, care, and calm loyalty in relationships.',
      career: 'Strong in long-term projects, financial discipline, and execution quality.',
      focus: 'Add small updates to your routine to avoid inertia.',
    },
  },
  gemini: {
    uk: {
      traits: ['Гнучкість', 'Комунікація', 'Допитливість'],
      strengths: 'Швидко вчиться, легко зʼєднує людей та ідеї між собою.',
      challenge: 'Розфокус і перевантаження інформацією.',
      love: 'Потрібні діалог, легкість і відчуття інтелектуального контакту.',
      career: 'Сильний у медіа, переговорах, продажах, навчанні та контенті.',
      focus: 'Закривай одне завдання до кінця перед наступним переключенням.',
    },
    en: {
      traits: ['Flexibility', 'Communication', 'Curiosity'],
      strengths: 'Learns quickly and connects people and ideas effectively.',
      challenge: 'Can become scattered and overloaded with information.',
      love: 'Needs dialogue, lightness, and mental connection.',
      career: 'Strong in media, sales, negotiations, education, and content.',
      focus: 'Finish one key task before switching to the next.',
    },
  },
  cancer: {
    uk: {
      traits: ['Емпатія', 'Турбота', 'Інтуїція'],
      strengths: 'Глибоко відчуває людей і вміє будувати безпечний простір.',
      challenge: 'Закритість або емоційні хвилі під стресом.',
      love: 'Потрібні довіра, мʼяка близькість і відчуття “ми в одній команді”.',
      career: 'Сильний у сервісі, допомозі людям, менеджменті турботи та спільнот.',
      focus: 'Тримай емоційні межі, щоб не брати на себе чужий стан.',
    },
    en: {
      traits: ['Empathy', 'Care', 'Intuition'],
      strengths: 'Feels people deeply and creates emotional safety.',
      challenge: 'Can withdraw or become emotionally reactive under stress.',
      love: 'Needs trust, tenderness, and team feeling in relationships.',
      career: 'Strong in care-driven roles, support, service, and community work.',
      focus: 'Keep emotional boundaries so you do not carry everyone else.',
    },
  },
  leo: {
    uk: {
      traits: ['Харизма', 'Творчість', 'Впевненість'],
      strengths: 'Надихає інших і підсвічує сильні сторони команди.',
      challenge: 'Потреба в постійному визнанні або драматизація.',
      love: 'Любить щедрість, увагу, тепло і щиру взаємну повагу.',
      career: 'Сильний у лідерстві, публічних ролях, креативі та презентації ідей.',
      focus: 'Будуй авторитет через стабільність, а не лише через емоційний імпульс.',
    },
    en: {
      traits: ['Charisma', 'Creativity', 'Confidence'],
      strengths: 'Inspires others and highlights team strengths.',
      challenge: 'May over-need validation or dramatize situations.',
      love: 'Values warmth, generosity, attention, and mutual respect.',
      career: 'Strong in leadership, creative work, and public-facing roles.',
      focus: 'Build authority through consistency, not only intensity.',
    },
  },
  virgo: {
    uk: {
      traits: ['Системність', 'Точність', 'Аналітика'],
      strengths: 'Бачить деталі, оптимізує процеси і підвищує якість результату.',
      challenge: 'Перфекціонізм і надмірна самокритика.',
      love: 'Показує почуття через дії, надійність і щоденну турботу.',
      career: 'Сильна в операційці, аналітиці, продакт-мисленні, медицині та сервісі.',
      focus: 'Визначай “достатньо добре”, щоб не блокувати прогрес.',
    },
    en: {
      traits: ['Structure', 'Precision', 'Analysis'],
      strengths: 'Improves systems and raises quality through details.',
      challenge: 'Perfectionism and excessive self-criticism.',
      love: 'Shows care through practical actions and consistency.',
      career: 'Strong in operations, analytics, product work, and service fields.',
      focus: 'Define “good enough” to keep progress moving.',
    },
  },
  libra: {
    uk: {
      traits: ['Баланс', 'Дипломатія', 'Смак'],
      strengths: 'Добре знімає напругу і знаходить рішення, що враховують усіх.',
      challenge: 'Нерішучість і відкладання складних розмов.',
      love: 'Потрібні партнерство, взаємність, естетика і повага до меж.',
      career: 'Сильна у переговорах, бренді, HR, дизайні та побудові партнерств.',
      focus: 'Тренуй швидкий вибір у малому, щоб впевненіше приймати великі рішення.',
    },
    en: {
      traits: ['Balance', 'Diplomacy', 'Aesthetics'],
      strengths: 'Reduces tension and finds fair, collaborative decisions.',
      challenge: 'Can hesitate and avoid difficult conversations.',
      love: 'Needs partnership, reciprocity, and respectful boundaries.',
      career: 'Strong in negotiation, branding, people roles, and design.',
      focus: 'Practice small fast decisions to improve bigger ones.',
    },
  },
  scorpio: {
    uk: {
      traits: ['Глибина', 'Сила волі', 'Проникливість'],
      strengths: 'Бачить суть і має ресурс для сильних трансформацій.',
      challenge: 'Контроль, підозри або емоційна жорсткість.',
      love: 'Потребує чесності, лояльності та емоційної глибини без ігор.',
      career: 'Сильний у кризових задачах, дослідженнях, стратегії та психології.',
      focus: 'Говори прямо про потреби, а не перевіряй людину мовчанням.',
    },
    en: {
      traits: ['Depth', 'Willpower', 'Insight'],
      strengths: 'Sees the core and handles deep transformation well.',
      challenge: 'Control patterns, suspicion, or emotional rigidity.',
      love: 'Needs honesty, loyalty, and depth without games.',
      career: 'Strong in strategy, research, crisis tasks, and psychology.',
      focus: 'Name needs directly instead of testing people silently.',
    },
  },
  sagittarius: {
    uk: {
      traits: ['Свобода', 'Оптимізм', 'Широкий погляд'],
      strengths: 'Дає перспективу, заряджає сенсом і запускає розвиток.',
      challenge: 'Різкість у словах або недоведення справ до кінця.',
      love: 'Потрібні чесність, простір і спільний рух до нового досвіду.',
      career: 'Сильний у навчанні, медіа, подорожах, стратегії і міжнародних темах.',
      focus: 'Поєднуй великі ідеї з конкретним планом на 7 днів.',
    },
    en: {
      traits: ['Freedom', 'Optimism', 'Big Picture'],
      strengths: 'Brings perspective, meaning, and growth momentum.',
      challenge: 'Can be blunt or leave things unfinished.',
      love: 'Needs honesty, space, and shared exploration.',
      career: 'Strong in education, media, strategy, and global contexts.',
      focus: 'Pair vision with a concrete 7-day action plan.',
    },
  },
  capricorn: {
    uk: {
      traits: ['Дисципліна', 'Стратегія', 'Надійність'],
      strengths: 'Будує довгу гру і стабільно тримає відповідальність.',
      challenge: 'Жорсткість до себе та емоційна дистанція.',
      love: 'Показує почуття через вчинки, стабільність і захист.',
      career: 'Сильний у менеджменті, бізнес-плануванні, фінансах і системних ролях.',
      focus: 'Додавай відпочинок у графік як частину продуктивності.',
    },
    en: {
      traits: ['Discipline', 'Strategy', 'Reliability'],
      strengths: 'Builds long-term results and carries responsibility steadily.',
      challenge: 'Can become overly rigid or emotionally distant.',
      love: 'Shows love through actions, protection, and consistency.',
      career: 'Strong in management, planning, finance, and operations.',
      focus: 'Schedule recovery as part of performance, not after it.',
    },
  },
  aquarius: {
    uk: {
      traits: ['Оригінальність', 'Незалежність', 'Системне мислення'],
      strengths: 'Бачить нестандартні рішення і мислить на рівні систем.',
      challenge: 'Емоційна відстороненість або впертість у власній логіці.',
      love: 'Потрібні повага до свободи, дружба і чесний інтелектуальний контакт.',
      career: 'Сильний у технологіях, інноваціях, продуктах і соціальних проєктах.',
      focus: 'Приземляй ідеї в конкретні кроки та дедлайни.',
    },
    en: {
      traits: ['Originality', 'Independence', 'Systems Thinking'],
      strengths: 'Generates unconventional solutions and sees systems clearly.',
      challenge: 'Can detach emotionally or become fixed in own logic.',
      love: 'Needs freedom, friendship, and honest intellectual connection.',
      career: 'Strong in tech, innovation, product, and social impact work.',
      focus: 'Translate ideas into concrete steps and deadlines.',
    },
  },
  pisces: {
    uk: {
      traits: ['Інтуїція', 'Уява', 'Співчуття'],
      strengths: 'Добре відчуває контекст і приносить глибину сенсів у спілкування.',
      challenge: 'Розмиті межі, втеча від реальності або перевтома емоціями.',
      love: 'Потребує ніжності, безпеки і тонкого емоційного резонансу.',
      career: 'Сильні сторони в творчості, допомозі людям, мистецтві та wellness-напрямах.',
      focus: 'Закріплюй інтуїцію фактами: записуй рішення і перевіряй їх дією.',
    },
    en: {
      traits: ['Intuition', 'Imagination', 'Compassion'],
      strengths: 'Feels context deeply and brings emotional meaning.',
      challenge: 'Blurred boundaries or emotional overload.',
      love: 'Needs tenderness, safety, and subtle emotional resonance.',
      career: 'Strong in creative, healing, and people-support fields.',
      focus: 'Ground intuition with written decisions and real actions.',
    },
  },
}

const premiumNarratives = {
  uk: {
    aries: {
      archetype: 'Архетип: Ініціатор змін',
      deepProfile: 'Овен найсильніший там, де треба почати першим і взяти темп на себе. Його ресурс у сміливості, але справжня майстерність приходить, коли енергія поєднується зі стратегією.',
      mantra: 'Я спрямовую силу в чітку дію, а не в хаотичний ривок.',
    },
    taurus: {
      archetype: 'Архетип: Архітектор стабільності',
      deepProfile: 'Телець будує результат через системність, надійність і витримку. Його перевага в довгій дистанції, коли інші втомлюються або відволікаються.',
      mantra: 'Я зміцнюю основу щодня і зростаю через послідовність.',
    },
    gemini: {
      archetype: 'Архетип: Провідник ідей',
      deepProfile: 'Близнюки швидко бачать звʼязки між людьми, сенсами й можливостями. Справжній прорив у них відбувається, коли фокус не розпадається між десятком напрямків.',
      mantra: 'Я обираю головне і доводжу думку до результату.',
    },
    cancer: {
      archetype: 'Архетип: Емоційний хранитель',
      deepProfile: 'Рак тонко відчуває атмосферу і формує довіру там, де інші бачать лише задачі. Його сила розкривається, коли турбота не переходить у самопожертву.',
      mantra: 'Я зберігаю близькість, не втрачаючи власні межі.',
    },
    leo: {
      archetype: 'Архетип: Сонячний лідер',
      deepProfile: 'Лев піднімає енергію команди і надихає через особисту присутність. Його найкраща версія проявляється, коли яскравість підкріплена дисципліною.',
      mantra: 'Я світжу стабільно і веду прикладом, а не тиском.',
    },
    virgo: {
      archetype: 'Архетип: Майстер систем',
      deepProfile: 'Діва бачить, де саме система втрачає якість, і вміє це виправляти точно. Її ключ до росту - менше самокритики, більше завершених ітерацій.',
      mantra: 'Я обираю прогрес замість перфекціонізму.',
    },
    libra: {
      archetype: 'Архетип: Дипломат балансу',
      deepProfile: 'Терези створюють гармонію між різними інтересами і зберігають здоровий тон взаємодії. Їхній прорив - у сміливості приймати рішення без затяжних сумнівів.',
      mantra: 'Я тримаю баланс і сміливо роблю вибір у потрібний момент.',
    },
    scorpio: {
      archetype: 'Архетип: Стратег глибини',
      deepProfile: 'Скорпіон працює на рівні суті, а не поверхні, тому здатний на сильні трансформації. Його сила максимальна, коли контроль замінюється чесним діалогом.',
      mantra: 'Я обираю прозорість і спрямовую глибину в зрілі рішення.',
    },
    sagittarius: {
      archetype: 'Архетип: Дослідник горизонтів',
      deepProfile: 'Стрілець мислить масштабно, піднімає планку сенсів і запалює розвиток. Реальний результат приходить, коли велика ідея одразу має конкретний план дій.',
      mantra: 'Я переводжу натхнення в маршрут і кроки.',
    },
    capricorn: {
      archetype: 'Архетип: Стратег вершини',
      deepProfile: 'Козоріг має рідкісну здатність будувати складні цілі в довгу і тримати відповідальність. Його баланс - не плутати жорсткість із силою.',
      mantra: 'Я рухаюсь до вершини, зберігаючи ресурс і гнучкість.',
    },
    aquarius: {
      archetype: 'Архетип: Архітектор майбутнього',
      deepProfile: 'Водолій бачить системні зміни і формує рішення, яких ще немає в шаблоні. Його потенціал розкривається повністю, коли ідея приземляється у виконання.',
      mantra: 'Я перетворюю новизну на працюючу реальність.',
    },
    pisces: {
      archetype: 'Архетип: Інтуїтивний провідник',
      deepProfile: 'Риби відчувають глибокі пласти емоцій і сенсів, додаючи мʼякості та людяності. Їхня сила стає стійкою, коли інтуїція опирається на межі та структуру.',
      mantra: 'Я довіряю чуттю і заземлюю його в конкретні дії.',
    },
  },
  en: {
    aries: {
      archetype: 'Archetype: Catalyst',
      deepProfile: 'Aries performs best when action and leadership are needed right now. The true upgrade is channeling raw drive into strategic execution.',
      mantra: 'I direct my fire into precise action.',
    },
    taurus: {
      archetype: 'Archetype: Builder',
      deepProfile: 'Taurus creates durable outcomes through consistency and grounded choices. Long-term rhythm is the edge that compounds over time.',
      mantra: 'I grow through consistency and calm discipline.',
    },
    gemini: {
      archetype: 'Archetype: Connector',
      deepProfile: 'Gemini sees patterns quickly and links people, ideas, and opportunities. Focus turns that mental speed into real impact.',
      mantra: 'I choose one clear thread and finish it.',
    },
    cancer: {
      archetype: 'Archetype: Protector',
      deepProfile: 'Cancer builds emotional safety and trust with rare sensitivity. Strength grows when care is paired with healthy boundaries.',
      mantra: 'I care deeply without abandoning myself.',
    },
    leo: {
      archetype: 'Archetype: Radiant Leader',
      deepProfile: 'Leo amplifies confidence and momentum in any room. Lasting influence comes from pairing charisma with consistency.',
      mantra: 'I shine with purpose and steady leadership.',
    },
    virgo: {
      archetype: 'Archetype: Refiner',
      deepProfile: 'Virgo upgrades systems through detail, precision, and practical intelligence. Progress scales when perfection pressure is reduced.',
      mantra: 'I prioritize progress over perfection.',
    },
    libra: {
      archetype: 'Archetype: Harmonizer',
      deepProfile: 'Libra balances perspectives and turns friction into workable alignment. Growth comes from decisive timing, not endless weighing.',
      mantra: 'I choose with clarity and keep the balance.',
    },
    scorpio: {
      archetype: 'Archetype: Alchemist',
      deepProfile: 'Scorpio works at depth and transforms complexity into power. The next level is openness over control.',
      mantra: 'I turn intensity into conscious direction.',
    },
    sagittarius: {
      archetype: 'Archetype: Explorer',
      deepProfile: 'Sagittarius expands vision and meaning, opening larger possibilities. Results accelerate when vision gets structure.',
      mantra: 'I convert inspiration into a clear route.',
    },
    capricorn: {
      archetype: 'Archetype: Strategist',
      deepProfile: 'Capricorn builds long-horizon outcomes with discipline and responsibility. Sustainable success includes recovery and adaptability.',
      mantra: 'I build high with structure and balance.',
    },
    aquarius: {
      archetype: 'Archetype: Innovator',
      deepProfile: 'Aquarius sees systems ahead of the curve and introduces fresh models. Value scales when ideas become implementation.',
      mantra: 'I ground innovation in practical execution.',
    },
    pisces: {
      archetype: 'Archetype: Mystic',
      deepProfile: 'Pisces brings intuition, empathy, and imaginative depth to people and projects. Clarity grows when sensitivity is anchored.',
      mantra: 'I trust intuition and anchor it in action.',
    },
  },
}

const activeElement = ref('all')
const expandedSign = ref(null)
const favoriteKeys = ref([])
const userSignKey = ref('')
const signRefs = new Map()

const filterItems = computed(() => [
  { key: 'all', label: tt('zodiacGuidePage.labels.allElements') },
  { key: 'fire', label: tt('compatibilityPage.elements.fire') },
  { key: 'earth', label: tt('compatibilityPage.elements.earth') },
  { key: 'air', label: tt('compatibilityPage.elements.air') },
  { key: 'water', label: tt('compatibilityPage.elements.water') },
])

// Append U+FE0E so zodiac glyphs render as elegant monochrome symbols (matching
// the compatibility page), not colored emoji tiles.
const TEXT_VS = '︎'

// Element harmony: same element + complementary (fire↔air, earth↔water).
const ELEMENT_HARMONY = {
  fire: ['fire', 'air'],
  earth: ['earth', 'water'],
  air: ['air', 'fire'],
  water: ['water', 'earth'],
}

function compatibleMatches(signKey) {
  const self = signs.find((s) => s.key === signKey)
  if (!self) return []
  const good = ELEMENT_HARMONY[self.element] || []
  return signs
    .filter((s) => s.key !== signKey && good.includes(s.element))
    .sort((a, b) => (a.element === self.element ? 0 : 1) - (b.element === self.element ? 0 : 1))
    .map((s) => ({ key: s.key, emoji: s.emoji + TEXT_VS, name: tt(`zodiac.${s.key}`) }))
}

const signCards = computed(() =>
  signs.map((sign) => {
    const lang = locale.value === 'uk' ? 'uk' : 'en'
    const profile = signProfiles[sign.key]?.[lang] || signProfiles[sign.key]?.en
    const premium = premiumNarratives[lang]?.[sign.key] || premiumNarratives.en?.[sign.key] || {}
    const palette = elementPalette[sign.element] || elementPalette.air
    return {
      ...sign,
      emoji: sign.emoji + TEXT_VS,
      mine: sign.key === userSignKey.value,
      matches: compatibleMatches(sign.key),
      accent: palette.accent,
      accentSoft: palette.soft,
      name: tt(`zodiac.${sign.key}`),
      elementLabel: tt(`compatibilityPage.elements.${sign.element}`),
      modalityLabel: tt(`compatibilityPage.modalities.${sign.modality}`),
      summary: tt(`zodiacGuidePage.signs.${sign.key}`),
      traits: profile?.traits || [],
      strengths: profile?.strengths || '',
      challenge: profile?.challenge || '',
      love: profile?.love || '',
      career: profile?.career || '',
      focus: profile?.focus || '',
      archetype: premium?.archetype || '',
      deepProfile: premium?.deepProfile || '',
      mantra: premium?.mantra || '',
    }
  }),
)

const filteredSigns = computed(() => {
  const list = activeElement.value === 'all'
    ? signCards.value
    : signCards.value.filter((sign) => sign.element === activeElement.value)

  if (!userSignKey.value) return list

  const idx = list.findIndex((sign) => sign.key === userSignKey.value)
  if (idx <= 0) return list

  return [list[idx], ...list.slice(0, idx), ...list.slice(idx + 1)]
})

const favoriteSigns = computed(() =>
  signCards.value.filter((sign) => favoriteKeys.value.includes(sign.key)),
)

const mySignCard = computed(() =>
  userSignKey.value ? signCards.value.find((sign) => sign.key === userSignKey.value) || null : null,
)

const loadFavorites = () => {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    const parsed = JSON.parse(raw || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const saveFavorites = () => {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteKeys.value))
}

const setSignRef = (key) => (el) => {
  if (el) signRefs.set(key, el)
  else signRefs.delete(key)
}

const isFavorite = (signKey) => favoriteKeys.value.includes(signKey)

const toggleFavorite = async (signKey) => {
  if (isFavorite(signKey)) {
    favoriteKeys.value = favoriteKeys.value.filter((key) => key !== signKey)
  } else {
    favoriteKeys.value = [...favoriteKeys.value, signKey]
  }
  saveFavorites()
  await hapticTap()
}

const goToSign = async (signKey) => {
  const sign = signCards.value.find((item) => item.key === signKey)
  if (!sign) return
  if (activeElement.value !== 'all' && activeElement.value !== sign.element) {
    activeElement.value = 'all'
    await nextTick()
  }
  const el = signRefs.get(signKey)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  await hapticTap()
}

const goToCompatibility = async () => {
  await hapticTap()
  router.push({ name: 'compatibility' }).catch(() => {})
}

const normalizeText = (text = '') =>
  String(text)
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

const hexToRgba = (hex, alpha = 1) => {
  const value = String(hex || '').replace('#', '')
  if (value.length !== 6) return `rgba(133, 201, 255, ${alpha})`
  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const drawRoundedRect = (ctx, x, y, w, h, r) => {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

const drawWrappedText = ({
  ctx,
  text,
  x,
  y,
  maxWidth,
  lineHeight,
  maxLines = 4,
}) => {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''

  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width <= maxWidth) {
      line = test
    } else {
      if (line) lines.push(line)
      line = word
      if (lines.length >= maxLines) break
    }
  }
  if (line && lines.length < maxLines) lines.push(line)

  const clipped = words.length && lines.length >= maxLines
  const output = clipped
    ? [...lines.slice(0, -1), `${lines[lines.length - 1].replace(/[.,;:!?]*$/, '')}…`]
    : lines

  output.forEach((item, index) => {
    ctx.fillText(item, x, y + index * lineHeight)
  })

  return y + output.length * lineHeight
}

const drawElementMotif = ({ ctx, element, accent, width, height }) => {
  ctx.save()
  ctx.strokeStyle = hexToRgba(accent, 0.24)
  ctx.fillStyle = hexToRgba(accent, 0.2)

  if (element === 'fire') {
    for (let i = 0; i < 18; i += 1) {
      const x = 100 + i * 50
      const y = height - 180 - (i % 3) * 14
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + 12, y - 22)
      ctx.lineTo(x + 24, y)
      ctx.closePath()
      ctx.fill()
    }
  } else if (element === 'earth') {
    ctx.lineWidth = 2
    for (let y = 0; y < 5; y += 1) {
      const offset = y * 18
      ctx.beginPath()
      ctx.moveTo(120, height - 170 - offset)
      ctx.lineTo(width - 120, height - 170 - offset)
      ctx.stroke()
    }
    for (let x = 0; x < 12; x += 1) {
      const dotX = 150 + x * 70
      const dotY = height - 120 - (x % 2) * 14
      ctx.beginPath()
      ctx.arc(dotX, dotY, 4, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (element === 'air') {
    ctx.lineWidth = 2.4
    for (let i = 0; i < 6; i += 1) {
      const y = 180 + i * 52
      ctx.beginPath()
      ctx.moveTo(120, y)
      ctx.bezierCurveTo(320, y - 34, 760, y + 34, width - 120, y - 10)
      ctx.stroke()
    }
  } else if (element === 'water') {
    ctx.lineWidth = 2.6
    for (let i = 0; i < 7; i += 1) {
      const y = height - 360 + i * 34
      ctx.beginPath()
      for (let x = 120; x <= width - 120; x += 20) {
        const wave = Math.sin((x + i * 18) * 0.05) * 8
        if (x === 120) ctx.moveTo(x, y + wave)
        else ctx.lineTo(x, y + wave)
      }
      ctx.stroke()
    }
  }

  ctx.restore()
}

const buildShareCardImage = async (sign) => {
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1440
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const accent = sign.accent || '#85c9ff'
  const accentSoft = hexToRgba(accent, 0.24)
  const accentGlow = hexToRgba(accent, 0.32)
  const elementSymbolMap = {
    fire: '🔥',
    earth: '🌿',
    air: '💨',
    water: '🌊',
  }

  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height)
  bg.addColorStop(0, '#0a2233')
  bg.addColorStop(0.5, '#07131d')
  bg.addColorStop(1, '#050d15')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const glowTop = ctx.createRadialGradient(canvas.width * 0.2, 80, 20, canvas.width * 0.2, 80, 460)
  glowTop.addColorStop(0, accentGlow)
  glowTop.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glowTop
  ctx.fillRect(0, 0, canvas.width, 520)

  const glowCenter = ctx.createRadialGradient(canvas.width * 0.8, canvas.height * 0.3, 20, canvas.width * 0.8, canvas.height * 0.3, 500)
  glowCenter.addColorStop(0, hexToRgba(accent, 0.2))
  glowCenter.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glowCenter
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  drawElementMotif({
    ctx,
    element: sign.element,
    accent,
    width: canvas.width,
    height: canvas.height,
  })

  drawRoundedRect(ctx, 28, 28, canvas.width - 56, canvas.height - 56, 36)
  ctx.strokeStyle = hexToRgba(accent, 0.4)
  ctx.lineWidth = 3
  ctx.stroke()

  drawRoundedRect(ctx, 48, 48, canvas.width - 96, canvas.height - 96, 28)
  ctx.strokeStyle = 'rgba(230, 240, 255, 0.2)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  const corners = [
    [84, 84],
    [canvas.width - 84, 84],
    [84, canvas.height - 84],
    [canvas.width - 84, canvas.height - 84],
  ]
  for (const [x, y] of corners) {
    ctx.fillStyle = hexToRgba(accent, 0.9)
    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(240, 246, 255, 0.95)'
    ctx.beginPath()
    ctx.arc(x, y, 1.2, 0, Math.PI * 2)
    ctx.fill()
  }

  for (let i = 0; i < 56; i += 1) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height * 0.48
    const size = 0.8 + Math.random() * 2.6
    ctx.fillStyle = i % 3 === 0 ? hexToRgba(accent, 0.7) : 'rgba(255,255,255,0.82)'
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.fillStyle = 'rgba(230, 240, 255, 0.72)'
  ctx.font = '600 30px Nunito, sans-serif'
  ctx.letterSpacing = '3px'
  ctx.textAlign = 'center'
  ctx.fillText(tt('appName').toUpperCase(), canvas.width / 2, 110)

  drawRoundedRect(ctx, 760, 78, 220, 52, 16)
  ctx.fillStyle = 'rgba(9, 16, 25, 0.68)'
  ctx.fill()
  ctx.strokeStyle = accentSoft
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = 'rgba(235, 242, 255, 0.9)'
  ctx.font = '600 22px Nunito, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`${elementSymbolMap[sign.element] || '✦'} ${sign.elementLabel}`, 870, 113)

  drawRoundedRect(ctx, 110, 170, 860, 260, 34)
  ctx.fillStyle = 'rgba(8, 14, 22, 0.6)'
  ctx.fill()
  ctx.strokeStyle = accentSoft
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.font = '700 150px Nunito, sans-serif'
  ctx.fillText(sign.emoji, canvas.width / 2, 330)

  ctx.fillStyle = 'rgba(236, 244, 255, 0.96)'
  ctx.font = '700 58px Nunito, sans-serif'
  ctx.fillText(sign.name, canvas.width / 2, 485)

  ctx.fillStyle = 'rgba(208, 220, 242, 0.76)'
  ctx.font = '600 30px Nunito, sans-serif'
  ctx.fillText(sign.dates, canvas.width / 2, 535)

  drawRoundedRect(ctx, 110, 580, 860, 92, 24)
  ctx.fillStyle = 'rgba(11, 18, 28, 0.78)'
  ctx.fill()
  ctx.strokeStyle = accentSoft
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = 'rgba(235, 242, 255, 0.92)'
  ctx.font = '600 28px Nunito, sans-serif'
  ctx.fillText(
    `${tt('zodiacGuidePage.labels.element')}: ${sign.elementLabel}  •  ${tt('zodiacGuidePage.labels.modality')}: ${sign.modalityLabel}`,
    canvas.width / 2,
    637,
  )

  const sections = [
    { title: tt('zodiacGuidePage.labels.strengths'), text: sign.strengths },
    { title: tt('zodiacGuidePage.labels.challenge'), text: sign.challenge },
    { title: tt('zodiacGuidePage.labels.focus'), text: sign.focus },
  ]

  let y = 710
  for (const section of sections) {
    drawRoundedRect(ctx, 110, y, 860, 170, 24)
    ctx.fillStyle = 'rgba(8, 14, 22, 0.64)'
    ctx.fill()
    ctx.strokeStyle = accentSoft
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = hexToRgba(accent, 0.96)
    ctx.font = '700 27px Nunito, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(section.title, 148, y + 48)

    ctx.fillStyle = 'rgba(225, 235, 250, 0.92)'
    ctx.font = '500 24px Nunito, sans-serif'
    drawWrappedText({
      ctx,
      text: section.text,
      x: 148,
      y: y + 88,
      maxWidth: 780,
      lineHeight: 34,
      maxLines: 2,
    })

    y += 188
  }

  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(214, 226, 246, 0.78)'
  ctx.font = '600 25px Nunito, sans-serif'
  ctx.fillText(`✦ ${tt('zodiacGuidePage.title')} ✦`, canvas.width / 2, canvas.height - 70)

  const blob = await new Promise((resolve) => {
    canvas.toBlob((result) => resolve(result), 'image/png', 1)
  })

  return {
    blob,
    dataUrl: canvas.toDataURL('image/png'),
  }
}

const buildShareTextCard = (sign) => {
  const title = `${sign.emoji} ${sign.name} (${sign.dates})`
  return normalizeText([
    tt('zodiacGuidePage.title'),
    title,
    `${tt('zodiacGuidePage.labels.element')}: ${sign.elementLabel}`,
    `${tt('zodiacGuidePage.labels.modality')}: ${sign.modalityLabel}`,
    '━━━━━━━━━━━━',
    `${tt('zodiacGuidePage.labels.strengths')}: ${sign.strengths}`,
    `${tt('zodiacGuidePage.labels.challenge')}: ${sign.challenge}`,
    `${tt('zodiacGuidePage.labels.focus')}: ${sign.focus}`,
  ].join('\n'))
}

const dataUrlToBase64 = (dataUrl = '') => {
  const commaIndex = String(dataUrl).indexOf(',')
  if (commaIndex < 0) return ''
  return dataUrl.slice(commaIndex + 1)
}

const writeShareImageToCache = async (signKey, dataUrl) => {
  const base64 = dataUrlToBase64(dataUrl)
  if (!base64) return null

  const filePath = `share/${signKey}-${Date.now()}.png`
  const { uri } = await Filesystem.writeFile({
    path: filePath,
    data: base64,
    directory: Directory.Cache,
    recursive: true,
  })

  if (!uri) return null
  return { uri, filePath }
}

const removeCachedShareImage = async (filePath) => {
  if (!filePath) return
  try {
    await Filesystem.deleteFile({
      path: filePath,
      directory: Directory.Cache,
    })
  } catch (e) {
    console.warn('Share temp file cleanup failed', e)
  }
}

const copyText = async (text) => {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // continue to legacy fallback
    }
  }

  if (typeof document === 'undefined') return false

  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.top = '-9999px'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.focus()
  area.select()

  try {
    return Boolean(document.execCommand('copy'))
  } catch {
    return false
  } finally {
    document.body.removeChild(area)
  }
}

const shareSign = async (sign) => {
  await hapticTap()
  const shareTitle = `${sign.emoji} ${sign.name}`
  const shareText = buildShareTextCard(sign)
  const sharePayload = { title: shareTitle, text: shareText, dialogTitle: shareTitle }

  // Native-first path: most reliable on iOS/Android
  if (Capacitor.isNativePlatform()) {
    let tempFilePath = ''
    try {
      const image = await buildShareCardImage(sign)
      if (image?.dataUrl) {
        const cachedFile = await writeShareImageToCache(sign.key, image.dataUrl)
        if (cachedFile?.uri) {
          tempFilePath = cachedFile.filePath
          await Share.share({
            title: shareTitle,
            dialogTitle: shareTitle,
            files: [cachedFile.uri],
          })
          return
        }
      }
    } catch (e) {
      console.warn('Native image share failed, fallback to text share', e)
    } finally {
      await removeCachedShareImage(tempFilePath)
    }

    try {
      await Share.share({
        ...sharePayload,
      })
      return
    } catch (e) {
      console.warn('Native text share failed, fallback to web share', e)
    }
  }

  // Mobile web path: call immediately from user gesture.
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
      })
      return
    } catch (e) {
      console.warn('Web navigator.share failed/cancelled', e)
    }
  }

  try {
    await Share.share(sharePayload)
    return
  } catch (e) {
    console.warn('Share failed, trying copy fallback', e)
  }

  try {
    const image = await buildShareCardImage(sign)
    if (image?.blob && typeof navigator !== 'undefined' && navigator.canShare && navigator.share) {
      const file = new File([image.blob], `${sign.key}-zodiac.png`, { type: 'image/png' })
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: shareTitle,
          files: [file],
        })
        return
      }
    }
  } catch (e) {
    console.warn('Image share fallback failed', e)
  }

  const copied = await copyText(shareText)
  if (copied) {
    $q.notify({
      message: locale.value === 'uk'
        ? 'Текст скопійовано. Можна вставити вручну.'
        : 'Text copied. You can paste it manually.',
      color: 'dark',
      textColor: 'white',
      position: 'bottom',
    })
    return
  }

  $q.notify({
    type: 'negative',
    message: locale.value === 'uk'
      ? 'Не вдалося відкрити меню поширення.'
      : 'Unable to open share menu.',
    position: 'bottom',
  })
}

const loadUserSign = async () => {
  const snapshot = await resolveUserSignSnapshot({
    readProfileCacheValue: async () => {
      const { value } = await Preferences.get({ key: 'profile_cache_v1' })
      return value || ''
    },
    getCurrentUserId: () => authStore.state.user?.id || '',
    fetchUserDateOfBirthById: async (userId) => {
      const { data } = await selectAppUser(userId, 6000, 'date_of_birth')
      return data?.date_of_birth || ''
    },
    zodiacFromRawDate,
  })

  if (snapshot.errors.length) {
    console.warn('[ZodiacGuide] loadUserSign degraded:', snapshot.errors.join(','))
  }

  userSignKey.value = snapshot.signKey || ''
}

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

const setElement = async (elementKey) => {
  activeElement.value = elementKey
  if (expandedSign.value) {
    const stillVisible = filteredSigns.value.some((sign) => sign.key === expandedSign.value)
    if (!stillVisible) expandedSign.value = null
  }
  await hapticTap()
}

const toggleSign = async (signKey) => {
  expandedSign.value = expandedSign.value === signKey ? null : signKey
  await hapticTap()
}

const initializeZodiacGuide = async () => {
  favoriteKeys.value = loadFavorites()
  try {
    if (!authStore.state.user) {
      await authStore.syncSession({ refresh: false })
    }
  } catch (e) {
    console.warn('[ZodiacGuide] syncSession failed', e)
  }
  await loadUserSign()
}

const initializeZodiacGuideSafe = async () => {
  try {
    await initializeZodiacGuide()
  } catch (error) {
    userSignKey.value = ''
    console.warn('[ZodiacGuide] init failed', error)
  }
}

onMounted(() => {
  void initializeZodiacGuideSafe()
})
</script>

<style scoped lang="scss">
.zodiac-page {
  min-height: 100vh;
  color: #e9edf4;
  position: relative;
  overflow: hidden;
}

.zodiac-bg {
  position: fixed;
  inset: 0;
  background:
    radial-gradient(1px 1px at 18% 16%, rgba(255, 255, 255, 0.5), transparent 60%),
    radial-gradient(1px 1px at 67% 11%, rgba(255, 255, 255, 0.32), transparent 60%),
    radial-gradient(1.6px 1.6px at 83% 28%, rgba(180, 210, 245, 0.55), transparent 60%),
    radial-gradient(1px 1px at 37% 24%, rgba(255, 255, 255, 0.3), transparent 60%),
    radial-gradient(1px 1px at 11% 38%, rgba(255, 255, 255, 0.22), transparent 60%),
    radial-gradient(1.4px 1.4px at 90% 52%, rgba(200, 180, 245, 0.4), transparent 60%),
    radial-gradient(1px 1px at 52% 44%, rgba(255, 255, 255, 0.18), transparent 60%),
    radial-gradient(120% 65% at 50% -8%, rgba(120, 150, 230, 0.16) 0%, transparent 55%),
    radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 42%, #050d15 100%);
  z-index: 0;
}

.zodiac-content {
  position: relative;
  z-index: 1;
  padding: calc(90px + env(safe-area-inset-top)) 18px calc(32px + env(safe-area-inset-bottom) + 84px);
  max-width: 560px;
  margin: 0 auto;
  display: grid;
  gap: 14px;
}

.zodiac-hero {
  display: grid;
  gap: 3px;
}

.zodiac-hero--with-back {
  position: relative;
  grid-template-columns: 1fr;
  align-items: center;
  justify-items: center;
  gap: 10px;
}

.zodiac-hero__text {
  text-align: center;
  display: grid;
  gap: 3px;
  justify-items: center;
  padding: 0 44px;
}

.zodiac-title {
  font-size: clamp(20px, 5vw, 24px);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.zodiac-kicker {
  font-size: 13px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.62);
}

.zodiac-back {
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

.zodiac-grid {
  display: grid;
  gap: 12px;
}

.zodiac-card {
  padding: 16px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(11, 15, 24, 0.8);
  box-shadow:
    0 18px 40px rgba(2, 6, 12, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  display: grid;
  gap: 10px;
}

.zodiac-card__title {
  font-size: 13px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.62);
}

.zodiac-lead {
  margin: -2px 2px 0;
  font-size: 14px;
  line-height: 1.55;
  color: rgba(206, 218, 240, 0.74);
}

.mysign-jump {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 15px;
  border: 1px solid color-mix(in srgb, var(--accent) 42%, transparent);
  background:
    linear-gradient(150deg, color-mix(in srgb, var(--accent) 18%, transparent), rgba(11, 15, 24, 0.85));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  transition: transform 130ms ease;
}

.mysign-jump:active {
  transform: scale(0.99);
}

.mysign-jump__glyph {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 11px;
  border: 1px solid var(--accent-soft);
  background: var(--accent-soft);
  font-size: 21px;
  line-height: 1;
  color: var(--accent);
  text-shadow: 0 0 12px color-mix(in srgb, var(--accent) 45%, transparent);
}

.mysign-jump__text {
  display: grid;
  gap: 1px;
  flex: 1;
  min-width: 0;
  text-align: left;
}

.mysign-jump__label {
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.62);
}

.mysign-jump__name {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: rgba(238, 244, 255, 0.97);
}

.mysign-jump__arrow {
  flex-shrink: 0;
  color: color-mix(in srgb, var(--accent) 80%, white 10%);
}

.compat-banner {
  width: 100%;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(170, 150, 245, 0.28);
  background:
    radial-gradient(120% 120% at 100% 0%, rgba(150, 130, 235, 0.22), transparent 60%),
    linear-gradient(150deg, rgba(40, 36, 68, 0.7), rgba(11, 15, 24, 0.85));
  box-shadow:
    0 18px 40px rgba(2, 6, 12, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  transition: transform 130ms ease;
}

.compat-banner:active {
  transform: scale(0.99);
}

.compat-banner__text {
  display: grid;
  gap: 3px;
  flex: 1;
  min-width: 0;
}

.compat-banner__title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: rgba(238, 242, 255, 0.97);
}

.compat-banner__sub {
  font-size: 13px;
  line-height: 1.45;
  color: rgba(214, 222, 245, 0.74);
}

.compat-banner__cta {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  padding: 8px 13px;
  border-radius: 999px;
  background: rgba(180, 165, 250, 0.16);
  border: 1px solid rgba(180, 165, 250, 0.4);
  color: rgba(232, 226, 255, 0.96);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.zodiac-card--favorites {
  gap: 10px;
}

.favorite-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.favorite-chip {
  border: 1px solid rgba(255, 178, 203, 0.3);
  background: rgba(255, 125, 172, 0.12);
  color: rgba(245, 228, 236, 0.96);
  border-radius: 999px;
  padding: 7px 11px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  letter-spacing: 0.04em;
}

.favorite-chip:active {
  transform: scale(0.97);
}

.element-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.element-chip {
  border: 1px solid rgba(156, 184, 235, 0.22);
  background: rgba(83, 112, 170, 0.12);
  color: rgba(214, 225, 242, 0.9);
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  transition: all 180ms ease;
}

.element-chip:active {
  transform: scale(0.97);
}

.element-chip--active {
  border-color: rgba(173, 210, 255, 0.56);
  background: rgba(110, 166, 255, 0.2);
  color: rgba(235, 242, 255, 0.98);
  box-shadow: 0 0 0 1px rgba(173, 210, 255, 0.16) inset;
}

.zodiac-card--sign {
  border-color: rgba(255, 255, 255, 0.14);
  background:
    linear-gradient(155deg, var(--accent-soft), rgba(8, 12, 20, 0.9)),
    rgba(11, 15, 24, 0.88);
  animation: cardIn 460ms ease both;
  animation-delay: calc(var(--i) * 42ms);
}

.zodiac-card--mine {
  border-color: color-mix(in srgb, var(--accent) 50%, transparent);
  box-shadow:
    0 18px 40px rgba(2, 6, 12, 0.5),
    0 0 0 1px color-mix(in srgb, var(--accent) 22%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.sign-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sign-head__icon {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  border: 1px solid var(--accent-soft);
  background: var(--accent-soft);
  display: grid;
  place-items: center;
  font-size: 21px;
  line-height: 1;
  color: var(--accent);
  text-shadow: 0 0 12px color-mix(in srgb, var(--accent) 45%, transparent);
}

.sign-head__text {
  display: grid;
  gap: 2px;
}

.sign-head__name {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 18px;
  letter-spacing: 0.04em;
  color: rgba(235, 242, 255, 0.96);
  font-weight: 600;
}

.sign-mine-badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
  border-radius: 999px;
  padding: 2px 8px;
  line-height: 1.4;
}

.sign-head__dates {
  font-size: 13px;
  letter-spacing: 0.05em;
  color: rgba(214, 225, 242, 0.72);
}

.sign-head__archetype {
  font-size: 13px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.62);
}

.head-fav-btn {
  margin-left: auto;
  width: 36px;
  height: 36px;
  padding: 0;
  line-height: 0;
  appearance: none;
  -webkit-appearance: none;
  border-radius: 10px;
  border: 1px solid rgba(255, 178, 203, 0.28);
  background: rgba(255, 125, 172, 0.1);
  color: rgba(255, 192, 219, 0.96);
  display: flex;
  align-items: center;
  justify-content: center;
}

.head-fav-btn:active {
  transform: scale(0.95);
}

.head-fav-btn :deep(.q-icon) {
  display: block;
  line-height: 1;
}

.sign-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sign-tag {
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--accent-soft);
  background: var(--accent-soft);
  color: rgba(223, 232, 246, 0.92);
  font-size: 13px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.sign-summary {
  margin: 0;
  color: rgba(224, 234, 251, 0.88);
  font-size: 15px;
  line-height: 1.6;
}

.traits {
  display: grid;
  gap: 8px;
}

.traits__label {
  font-size: 13px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.62);
}

.traits__list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.trait-chip {
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(8, 12, 20, 0.56);
  color: rgba(223, 232, 246, 0.9);
  font-size: 12px;
  letter-spacing: 0.03em;
}

.quick-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.quick-card {
  padding: 10px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(8, 12, 20, 0.55);
  display: grid;
  gap: 6px;
}

.quick-card__label {
  font-size: 10px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.64);
}

.quick-card__text {
  margin: 0;
  color: rgba(224, 234, 251, 0.88);
  font-size: 15px;
  line-height: 1.58;
  text-transform: none;
}

.sign-details {
  display: grid;
  gap: 8px;
  padding-top: 2px;
}

.detail-row {
  padding: 10px 11px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(7, 11, 18, 0.64);
  display: grid;
  gap: 6px;
}

.detail-row__label {
  font-size: 10px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.64);
}

.detail-row__text {
  margin: 0;
  color: rgba(224, 234, 251, 0.9);
  font-size: 15px;
  line-height: 1.58;
  text-transform: none;
}

.detail-row--mantra .detail-row__text {
  color: rgba(236, 243, 255, 0.96);
  font-style: italic;
}

.match-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.match-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px 5px 9px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent) 32%, rgba(255, 255, 255, 0.12));
  background: color-mix(in srgb, var(--accent) 12%, rgba(8, 12, 20, 0.6));
  color: rgba(235, 242, 255, 0.92);
  font-size: 13px;
  letter-spacing: 0.02em;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  transition: transform 120ms ease, background 120ms ease;
}

.match-chip:active {
  transform: scale(0.96);
}

.match-chip__glyph {
  font-size: 15px;
  line-height: 1;
  color: var(--accent);
}

.actions-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 2px;
}

.action-btn {
  border: 1px solid rgba(173, 210, 255, 0.24);
  border-radius: 12px;
  background: rgba(83, 112, 170, 0.12);
  color: rgba(224, 234, 251, 0.95);
  padding: 12px 12px;
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.action-btn:active {
  transform: scale(0.985);
}

.expand-btn {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  background: rgba(6, 10, 16, 0.62);
  color: rgba(214, 225, 242, 0.92);
  padding: 12px 12px;
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.expand-btn:active {
  transform: scale(0.985);
}

.expand-btn__icon {
  transition: transform 220ms ease;
}

.expand-btn__icon--open {
  transform: rotate(180deg);
}

.expand-fade-enter-active,
.expand-fade-leave-active {
  transition: opacity 220ms ease, transform 220ms ease, max-height 260ms ease;
  overflow: hidden;
}

.expand-fade-enter-from,
.expand-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
  max-height: 0;
}

.expand-fade-enter-to,
.expand-fade-leave-from {
  opacity: 1;
  transform: translateY(0);
  max-height: 340px;
}

.card-list-enter-active,
.card-list-leave-active {
  transition: all 260ms ease;
}

.card-list-enter-from,
.card-list-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.card-list-move {
  transition: transform 260ms ease;
}

@keyframes cardIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 420px) {
  .actions-row {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 900px) {
  .quick-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
