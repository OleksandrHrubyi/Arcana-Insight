<template>
  <q-page class="tarot-page">
    <div ref="sceneRef" class="oracle-video-layer" aria-hidden="true">
      <video
        ref="videoRef"
        class="oracle-video"
        autoplay
        muted
        loop
        playsinline
        preload="auto"
        @loadedmetadata="applyPlaybackRate"
      >
        <source src="/tarrotTest/test2.mp4" type="video/mp4" />
      </video>
      <div class="oracle-smoke oracle-smoke--one"></div>
      <div class="oracle-smoke oracle-smoke--two"></div>
    </div>

    <div class="oracle-ui">
      <section class="oracle-dialogue" aria-live="polite">
        <transition-group name="oracle-mist" tag="div" class="oracle-dialogue__stack">
          <p v-for="line in dialogueLines" :key="line" class="oracle-dialogue__line">
            {{ line }}
          </p>
        </transition-group>
        <transition name="oracle-bubble-fade" mode="out-in">
          <p v-if="currentPrompt" :key="currentPrompt" class="oracle-dialogue__prompt oracle-bubble">
            {{ currentPrompt }}
          </p>
        </transition>
      </section>

      <section v-if="showChoices" class="oracle-actions">
        <textarea
          v-if="showQuestionInput"
          v-model="draftQuestion"
          class="oracle-question"
          rows="2"
          :placeholder="questionPlaceholder"
        ></textarea>

        <div v-if="historyRows.length" class="oracle-history">
          <p v-for="row in historyRows" :key="row" class="oracle-history__item">{{ row }}</p>
        </div>

        <div class="oracle-buttons">
          <button
            v-for="choice in choices"
            :key="choice.label"
            type="button"
            class="oracle-button"
            :disabled="Boolean(choice.disabled)"
            @click="runChoice(choice)"
          >
            {{ choice.label }}
          </button>
        </div>
      </section>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { currentLocale } from 'src/i18n'

const videoRef = ref(null)
const dialogueLines = ref([])
const currentPrompt = ref('')
const currentLang = computed(() => {
  const locale = String(currentLocale.value || 'en').toLowerCase()
  return locale.startsWith('uk') ? 'uk' : 'en'
})

const stage = ref('intro')
const selectedTheme = ref('')
const selectedSpread = ref(0)
const selectedQuestion = ref('')
const draftQuestion = ref('')

const timers = []
const lastVariantByKey = ref({})

const copy = {
  uk: {
    questionPlaceholder: 'Наприклад: Що мені важливо зрозуміти в цій ситуації?',
    themeLabels: {
      relationships: 'Стосунки',
      work: 'Робота',
      money: 'Гроші',
      choice: 'Вибір',
      self: 'Я / Стан',
      default: 'Інше',
    },
    introSets: [
      ['Тихіше...', 'Тут говорять символи - не вироки.', 'Таро - лише символи.'],
      ['Слухай уважно...', 'Карти не наказують - вони підказують.', 'Таро - лише образи.'],
      ['Зупинись на мить...', 'Тут важливі не страхи, а сенси.', 'Таро - лише карти.'],
      ['Дихай спокійно...', 'Символи ведуть, але не примушують.', 'Таро - мова натяків.'],
      ['Ще трохи тиші...', 'Відповідь народжується між рядками.', 'Карти лише підсвічують шлях.'],
      ['Зосередься...', 'Тут говорять образи, не вироки.', 'Таро - це підказки, не накази.'],
      ['Внутрішній голос важливий...', 'Карти показують можливості.', 'Рішення завжди твоє.'],
      ['Тиша допомагає бачити...', 'Символи розкривають контекст.', 'Таро - лише напрям.'],
      ['Дивись глибше...', 'Ми читаємо знаки, не фатум.', 'Карти лише підсвічують варіанти.'],
      ['Налаштуйся...', 'Тут немає вироків - лише сенси.', 'Таро - м’яка підказка для вибору.'],
    ],
    prompts: {
      theme: [
        'Назви сферу. Я підлаштую розклад.',
        'Обери тему нижче.',
        'З чим прийшов? Обери тему.',
        'Визнач сферу - і почнемо читання.',
        'Обери, про що сьогодні запит.',
        'Задай напрям: яка сфера головна?',
        'Оберемо тему, щоб навести фокус.',
        'З чого почнемо? Обери сферу.',
        'Яку тему відкриваємо першою?',
        'Вкажи сферу, і я зчитаю хід подій.',
      ],
      questionMode: [
        'Тепер сформулюй питання одним реченням.',
        'Скажи головне одним реченням.',
        'Опиши суть питання коротко.',
        'Одне речення. Найточніше формулювання.',
        'Сформулюй запит чітко і коротко.',
        'Дай питанню форму одним реченням.',
        'Назви найважливіше в одному реченні.',
        'Коротко: що саме хочеш зрозуміти?',
        'Стисло сформулюй свій запит.',
        'Одне речення - і ми підемо глибше.',
      ],
      questionInput: [
        'Напиши питання одним реченням.',
        'Одне речення. Без зайвого.',
        'Сформулюй чітко - і продовжимо.',
        'Запиши головне коротко.',
        'Дай питанню ясну форму.',
        'Скажи це словами, одним реченням.',
        'Коротко опиши суть запиту.',
        'Потрібне одне точне речення.',
        'Залиш тільки найважливіше.',
        'Напиши питання просто і прямо.',
      ],
      spread: [
        'Добре... Я чую тебе. Обери глибину відповіді.',
        'Добре. Тепер обери глибину розкладу.',
        'Є контакт. 1, 3 чи 5 карт?',
        'Оберемо глибину: коротко чи глибше?',
        'Вкажи глибину: суть, шлях або глибина.',
        'Тепер вибери, наскільки глибоко дивимось.',
        'Час обрати формат розкладу.',
        'Ок. Скільки карт відкриваємо?',
        'Обери глибину читання.',
        'Наступний крок - глибина розкладу.',
      ],
      ready: [
        'Чудово. Коли будеш готовий - торкнись колоди.',
        'Все готово. Торкнись колоди.',
        'Розклад налаштовано. Починай дотиком.',
        'Можемо починати. Торкнись колоди.',
        'Готово. Відкрий читання дотиком.',
        'Час відкривати карти. Торкнись колоди.',
        'Починаємо, коли торкнешся колоди.',
        'Колода готова. Твій дотик - старт.',
        'Я готова. Торкнись колоди для старту.',
        'Переходимо далі: торкнись колоди.',
      ],
      started: [
        'Сеанс починається. Дихай рівно і слухай карти.',
        'Починаємо читання. Слухай уважно.',
        'Читання відкрите. Тримай фокус.',
        'Сеанс іде. Будь уважний до деталей.',
        'Карти відкриваються. Дивимось глибше.',
        'Початок. Залишайся в тиші.',
        'Розклад активовано. Читай знаки.',
        'Сеанс у русі. Прислухайся до символів.',
        'Стартували. Зберігай спокій.',
        'Читання почалось. Пильнуй сенси.',
      ],
      empty: [
        'Скажи це словами...',
        'Без формулювання карти мовчать.',
        'Дай питанню чітку форму.',
        'Потрібне хоча б одне речення.',
        'Сформулюй запит - і продовжимо.',
        'Напиши головне, щоб рухатись далі.',
        'Трохи конкретики - і відкриваємо карти.',
        'Слова задають вектор читання.',
        'Скажи суть, і я продовжу.',
        'Дай питанню ясність.',
      ],
      themeConfirm: [
        '{theme}... добре.',
        '{theme}. Приймаю.',
        '{theme} - чую.',
        '{theme}. Налаштовуюсь.',
        '{theme}. Йдемо далі.',
        '{theme} - фокус прийнято.',
        '{theme}. Добре, продовжимо.',
        '{theme}. Я бачу напрям.',
        '{theme}... тримаємо цю лінію.',
        '{theme}. Переходимо до питання.',
      ],
    },
    choices: {
      writeMyOwn: 'Напишу сам',
      confirmQuestion: 'Підтвердити питання',
      back: 'Назад',
      spread1: '1 карта - Суть',
      spread3: '3 карти - Шлях',
      spread5: '5 карт - Глибина',
      touchDeck: 'Торкнутись колоди',
      changeSpread: 'Змінити розклад',
      newQuestion: 'Нове питання',
      repeatSpread: 'Ще раз цей розклад',
      start: 'Почати',
    },
  },
  en: {
    questionPlaceholder: 'For example: What is most important for me to understand in this situation?',
    themeLabels: {
      relationships: 'Relationships',
      work: 'Work',
      money: 'Money',
      choice: 'Choice',
      self: 'Me / State',
      default: 'Other',
    },
    introSets: [
      ['A little quieter...', 'Symbols speak here, not verdicts.', 'Tarot is only symbols.'],
      ['Take a breath...', 'Cards do not command, they suggest.', 'Tarot is only imagery.'],
      ['Pause for a moment...', 'Meaning matters more than fear.', 'Tarot is just cards.'],
      ['Stay still...', 'Symbols guide, not force.', 'Tarot is a language of hints.'],
      ['A bit more silence...', 'Answers appear between lines.', 'Cards only highlight the path.'],
      ['Focus...', 'Here we read symbols, not fate.', 'Tarot offers direction, not orders.'],
      ['Listen inward...', 'Cards show possibilities.', 'Choice is always yours.'],
      ['Quiet helps clarity...', 'Symbols reveal context.', 'Tarot is only guidance.'],
      ['Look deeper...', 'We read signs, not doom.', 'Cards illuminate options.'],
      ['Tune in...', 'No verdicts here, only meaning.', 'Tarot is a gentle prompt.'],
    ],
    prompts: {
      theme: [
        'Name the area. I will tune the spread.',
        'Choose a theme below.',
        'What did you come with? Choose a theme.',
        'Pick the area and we begin.',
        'Choose what this reading is about.',
        'Set the direction: which area matters most?',
        'Let us choose the theme first.',
        'Where do we start? Pick the area.',
        'Which theme do we open first?',
        'Name the sphere, and I will read the flow.',
      ],
      questionMode: [
        'Now phrase your question in one sentence.',
        'Say the core in one sentence.',
        'Describe the essence briefly.',
        'One sentence. Most precise wording.',
        'Shape your request clearly and briefly.',
        'Give your question a clear form.',
        'Name what matters most in one sentence.',
        'Short and clear: what do you want to understand?',
        'State your request in one line.',
        'One sentence, then we go deeper.',
      ],
      questionInput: [
        'Write your question in one sentence.',
        'One sentence. No extra words.',
        'Formulate clearly and we continue.',
        'Write only what matters most.',
        'Give the question a clear shape.',
        'Say it in words, one sentence.',
        'Describe the core request briefly.',
        'We need one precise sentence.',
        'Keep only the essential part.',
        'Write it simple and direct.',
      ],
      spread: [
        'Good... I hear you. Choose the depth.',
        'Good. Now choose spread depth.',
        'Connection is clear. 1, 3, or 5 cards?',
        'Choose depth: short or deeper?',
        'Pick depth: core, path, or deep read.',
        'Now choose how deep we look.',
        'Time to choose spread format.',
        'Okay. How many cards do we open?',
        'Choose the reading depth.',
        'Next step: spread depth.',
      ],
      ready: [
        'Perfect. When ready, touch the deck.',
        'Everything is ready. Touch the deck.',
        'Spread is tuned. Start with a touch.',
        'We can begin. Touch the deck.',
        'Ready. Open the reading with a touch.',
        'Time to open the cards. Touch the deck.',
        'We start when you touch the deck.',
        'Deck is ready. Your touch is the start.',
        'I am ready. Touch the deck to begin.',
        'Next step: touch the deck.',
      ],
      started: [
        'The session begins. Breathe and listen to the cards.',
        'Reading started. Stay attentive.',
        'Reading is open. Keep your focus.',
        'Session is active. Watch the details.',
        'Cards are opening. Let us go deeper.',
        'We started. Stay in silence.',
        'Spread activated. Read the signs.',
        'Session in motion. Listen to symbols.',
        'We have begun. Keep calm.',
        'Reading began. Follow the meaning.',
      ],
      empty: [
        'Put it into words...',
        'Without a clear question, cards stay silent.',
        'Give your question a clear shape.',
        'We need at least one sentence.',
        'Form your request and we continue.',
        'Write the core to move forward.',
        'A bit more clarity and we open cards.',
        'Words set the reading direction.',
        'Name the essence, and I continue.',
        'Give the question more clarity.',
      ],
      themeConfirm: [
        '{theme}... good.',
        '{theme}. Accepted.',
        '{theme} - heard.',
        '{theme}. Tuning in.',
        '{theme}. We continue.',
        '{theme} - focus received.',
        '{theme}. Good, moving on.',
        '{theme}. I see the direction.',
        '{theme}... we keep this line.',
        '{theme}. Now your question.',
      ],
    },
    choices: {
      writeMyOwn: 'Write my own',
      confirmQuestion: 'Confirm question',
      back: 'Back',
      spread1: '1 card - Core',
      spread3: '3 cards - Path',
      spread5: '5 cards - Depth',
      touchDeck: 'Touch the deck',
      changeSpread: 'Change spread',
      newQuestion: 'New question',
      repeatSpread: 'Repeat spread',
      start: 'Start',
    },
  },
}

const t = computed(() => copy[currentLang.value])

const questionPlaceholder = computed(() => t.value.questionPlaceholder)

const questionTemplates = computed(() => {
  if (currentLang.value === 'en') {
    return {
      relationships: [
        { label: 'Main point now', text: 'What is the main thing in my relationships right now?' },
        { label: 'Best next step', text: 'What step would be best next?' },
      ],
      work: [
        { label: 'Main point now', text: 'What is the main thing in my work right now?' },
        { label: 'Best next step', text: 'What step would be best next?' },
      ],
      money: [
        { label: 'Main point now', text: 'What is the main thing in my finances right now?' },
        { label: 'Best next step', text: 'What step would be best next?' },
      ],
      choice: [
        { label: 'Main point now', text: 'What is most important in this choice right now?' },
        { label: 'Best next step', text: 'What step would be best next?' },
      ],
      self: [
        { label: 'Main point now', text: 'What is most important for my inner state right now?' },
        { label: 'Best next step', text: 'What step would be best next?' },
      ],
      default: [
        { label: 'Main point now', text: 'What is the main thing in this area right now?' },
        { label: 'Best next step', text: 'What step would be best next?' },
      ],
    }
  }

  return {
    relationships: [
      { label: 'Що головне зараз', text: 'Що зараз головне в моїх стосунках?' },
      { label: 'Який наступний крок', text: 'Який крок буде найкращим наступним?' },
    ],
    work: [
      { label: 'Що головне зараз', text: 'Що зараз головне в моїй роботі?' },
      { label: 'Який наступний крок', text: 'Який крок буде найкращим наступним?' },
    ],
    money: [
      { label: 'Що головне зараз', text: 'Що зараз головне в моїх фінансах?' },
      { label: 'Який наступний крок', text: 'Який крок буде найкращим наступним?' },
    ],
    choice: [
      { label: 'Що головне зараз', text: 'Що зараз головне в цьому виборі?' },
      { label: 'Який наступний крок', text: 'Який крок буде найкращим наступним?' },
    ],
    self: [
      { label: 'Що головне зараз', text: 'Що зараз найважливіше для мого стану?' },
      { label: 'Який наступний крок', text: 'Який крок буде найкращим наступним?' },
    ],
    default: [
      { label: 'Що головне зараз', text: 'Що зараз головне в цій темі?' },
      { label: 'Який наступний крок', text: 'Який крок буде найкращим наступним?' },
    ],
  }
})

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

const applyPlaybackRate = () => {
  if (videoRef.value) {
    videoRef.value.playbackRate = 0.75
  }
}

const schedule = (delay, fn) => {
  const timer = window.setTimeout(fn, delay)
  timers.push(timer)
}

const askThemePrimary = () => {
  stage.value = 'theme'
  setPrompt('theme')
}

const pickTheme = (theme) => {
  selectedTheme.value = theme

  if (theme === 'default') {
    stage.value = 'question_input'
    setPrompt('questionInput')
    return
  }

  stage.value = 'theme_confirm'
  const confirmTemplate = pickVariant('themeConfirm', t.value.prompts.themeConfirm)
  currentPrompt.value = confirmTemplate.replace('{theme}', t.value.themeLabels[theme] ?? '')

  schedule(1900, () => {
    if (stage.value !== 'theme_confirm') {
      return
    }

    stage.value = 'question_mode'
    setPrompt('questionMode')
  })
}

const openQuestionInput = () => {
  stage.value = 'question_input'
  setPrompt('questionInput')
}

const pickTemplate = (template) => {
  selectedQuestion.value = template
  stage.value = 'spread_primary'
  setPrompt('spread')
}

const confirmQuestion = () => {
  const value = draftQuestion.value.trim()

  if (!value) {
    setPrompt('empty')
    return
  }

  selectedQuestion.value = value
  stage.value = 'spread_primary'
  setPrompt('spread')
}

const setSpread = (spread) => {
  selectedSpread.value = spread
  stage.value = 'ready'
  setPrompt('ready')
}

const touchDeck = () => {
  stage.value = 'started'
  setPrompt('started')
}

const toQuestionMode = () => {
  stage.value = 'question_mode'
  setPrompt('questionMode')
}

const resetDialogue = () => {
  selectedTheme.value = ''
  selectedSpread.value = 0
  selectedQuestion.value = ''
  draftQuestion.value = ''
  askThemePrimary()
}

const historyRows = computed(() => {
  const rows = []
  const isUk = currentLang.value === 'uk'
  const labelTheme = isUk ? 'Тема' : 'Theme'
  const labelQuestion = isUk ? 'Питання' : 'Question'
  const labelSpread = isUk ? 'Розклад' : 'Spread'
  const spreadLabels = isUk
    ? { 1: '1 карта', 3: '3 карти', 5: '5 карт' }
    : { 1: '1 card', 3: '3 cards', 5: '5 cards' }

  if (selectedTheme.value) {
    rows.push(`${labelTheme}: ${t.value.themeLabels[selectedTheme.value] || t.value.themeLabels.default}`)
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

const choices = computed(() => {
  if (stage.value === 'theme') {
    return [
      { label: t.value.themeLabels.relationships, action: () => pickTheme('relationships') },
      { label: t.value.themeLabels.work, action: () => pickTheme('work') },
      { label: t.value.themeLabels.money, action: () => pickTheme('money') },
      { label: t.value.themeLabels.choice, action: () => pickTheme('choice') },
      { label: t.value.themeLabels.self, action: () => pickTheme('self') },
      { label: t.value.themeLabels.default, action: () => pickTheme('default') },
    ]
  }

  if (stage.value === 'theme_confirm') {
    return []
  }

  if (stage.value === 'question_mode') {
    const templates = questionTemplates.value[selectedTheme.value] ?? questionTemplates.value.default
    return [
      { label: t.value.choices.writeMyOwn, action: openQuestionInput },
      { label: templates[0].label, action: () => pickTemplate(templates[0].text) },
      { label: templates[1].label, action: () => pickTemplate(templates[1].text) },
      { label: t.value.choices.back, action: askThemePrimary },
    ]
  }

  if (stage.value === 'question_input') {
    return [
      {
        label: t.value.choices.confirmQuestion,
        action: confirmQuestion,
        disabled: !draftQuestion.value.trim(),
      },
      { label: t.value.choices.back, action: askThemePrimary },
    ]
  }

  if (stage.value === 'spread_primary') {
    return [
      { label: t.value.choices.spread1, action: () => setSpread(1) },
      { label: t.value.choices.spread3, action: () => setSpread(3) },
      { label: t.value.choices.spread5, action: () => setSpread(5) },
      { label: t.value.choices.back, action: toQuestionMode },
    ]
  }

  if (stage.value === 'ready') {
    return [
      { label: t.value.choices.touchDeck, action: touchDeck },
      { label: t.value.choices.changeSpread, action: () => (stage.value = 'spread_primary') },
      { label: t.value.choices.newQuestion, action: resetDialogue },
    ]
  }

  if (stage.value === 'started') {
    return [
      { label: t.value.choices.newQuestion, action: resetDialogue },
      { label: t.value.choices.repeatSpread, action: touchDeck },
    ]
  }

  return [{ label: t.value.choices.start, action: askThemePrimary }]
})

const showQuestionInput = computed(() => stage.value === 'question_input')
const showChoices = computed(() => stage.value !== 'intro' && choices.value.length > 0)

const runChoice = (choice) => {
  if (!choice || choice.disabled) {
    return
  }

  choice.action()
}

onMounted(() => {
  applyPlaybackRate()

  const introSet = pickVariant('introSet', t.value.introSets)
  schedule(700, () => dialogueLines.value.push(introSet[0]))
  schedule(3200, () => dialogueLines.value.push(introSet[1]))
  schedule(6200, () => dialogueLines.value.push(introSet[2]))
  schedule(9400, () => {
    askThemePrimary()
  })
})

onBeforeUnmount(() => {
  timers.forEach((timer) => window.clearTimeout(timer))
})
</script>

<style scoped>
.tarot-page {
  position: relative;
  min-height: 100dvh;
  background: #000;
}

.oracle-video-layer {
  position: relative;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  background: #000;
}

.oracle-video {
  display: block;
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 90dvh;
  object-fit: contain;
  object-position: center center;
  background: #000;
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
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

.oracle-ui {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
}

.oracle-dialogue {
  max-width: 560px;
  margin: calc(env(safe-area-inset-top, 0px) + 76px) 14px 0;
  padding: 0;
  background: transparent;
  color: rgba(221, 232, 248, 0.82);
}

.oracle-dialogue__line,
.oracle-dialogue__prompt {
  margin: 0 0 6px;
  font-size: 15px;
  line-height: 1.35;
}

.oracle-dialogue__stack {
  display: grid;
  gap: 2px;
}

.oracle-history {
  margin: 0 0 10px;
  display: grid;
  gap: 3px;
}

.oracle-history__item {
  margin: 0;
  font-size: 11px;
  line-height: 1.25;
  color: rgba(176, 188, 208, 0.68);
}

.oracle-dialogue__prompt {
  margin-top: 26px;
  margin-bottom: 0;
  color: #141621;
  font-weight: 500;
  width: fit-content;
  max-width: min(92vw, 520px);
  margin-left: auto;
}

.oracle-bubble {
  position: relative;
  display: block;
  border: 1px solid rgba(11, 14, 22, 0.18);
  border-radius: 15px;
  padding: 10px 12px;
  background: rgba(246, 248, 253, 0.92);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
}

.oracle-bubble::after {
  content: '';
  position: absolute;
  right: 20px;
  bottom: -8px;
  width: 14px;
  height: 14px;
  background: rgba(246, 248, 253, 0.92);
  border-right: 1px solid rgba(11, 14, 22, 0.18);
  border-bottom: 1px solid rgba(11, 14, 22, 0.18);
  transform: rotate(45deg);
}

.oracle-mist-enter-active {
  transition: opacity 520ms ease, transform 520ms ease, filter 520ms ease;
}

.oracle-mist-enter-from {
  opacity: 0;
  transform: translateY(6px);
  filter: blur(3px);
}

.oracle-mist-enter-to {
  opacity: 1;
  transform: translateY(0);
  filter: blur(0);
}

.oracle-bubble-fade-enter-active,
.oracle-bubble-fade-leave-active {
  transition: opacity 420ms ease, transform 420ms ease, filter 420ms ease;
}

.oracle-bubble-fade-enter-from,
.oracle-bubble-fade-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.985);
  filter: blur(2px);
}

.oracle-actions {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 178px);
  margin: 0 auto;
  width: min(560px, calc(100% - 24px));
  pointer-events: auto;
}

.oracle-actions__hint {
  margin: 0 0 8px;
  padding-left: 2px;
  font-size: 12px;
  line-height: 1.2;
  color: rgba(198, 208, 226, 0.72);
}

.oracle-question {
  width: 100%;
  margin: 0 0 8px;
  border: 1px solid rgba(208, 178, 122, 0.34);
  border-radius: 12px;
  padding: 10px 11px;
  background: linear-gradient(180deg, rgba(12, 18, 30, 0.82), rgba(8, 12, 22, 0.74));
  color: #f2f7ff;
  box-shadow: inset 0 0 0 1px rgba(245, 216, 150, 0.08);
  resize: none;
}

.oracle-question::placeholder {
  color: rgba(205, 220, 245, 0.72);
}

.oracle-buttons {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.oracle-button {
  width: 100%;
  min-width: 0;
  min-height: 41px;
  border: 1px solid rgba(236, 243, 255, 0.18);
  border-radius: 12px;
  padding: 9px 9px;
  background: linear-gradient(180deg, rgba(11, 15, 24, 0.34), rgba(9, 12, 20, 0.28));
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  color: rgba(231, 238, 250, 0.9);
  font-size: 13px;
  line-height: 1.2;
  font-weight: 450;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    inset 0 0 0 1px rgba(255, 255, 255, 0.02);
  cursor: pointer;
}

.oracle-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
  transform: none;
}

@media (max-width: 480px) {
  .oracle-dialogue {
    margin-top: calc(env(safe-area-inset-top, 0px) + 88px);
  }

  .oracle-actions {
    bottom: calc(env(safe-area-inset-bottom, 0px) + 188px);
  }

  .oracle-button {
    font-size: 13px;
  }
}

@media (max-width: 360px) {
  .oracle-buttons {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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
</style>
