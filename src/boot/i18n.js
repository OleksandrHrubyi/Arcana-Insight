import { boot } from 'quasar/wrappers'
import { createI18n } from 'vue-i18n'
import en from 'src/i18n/en.json'
import uk from 'src/i18n/uk.json'

const i18n = createI18n({
  legacy: true,            // <-- головне
  globalInjection: true,   // щоб працював $t у шаблонах
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, uk }
})

export default boot(({ app }) => {
  app.use(i18n)
})

export { i18n }
