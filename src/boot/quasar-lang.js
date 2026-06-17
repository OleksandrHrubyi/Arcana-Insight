import { boot } from 'quasar/wrappers'
import { Lang } from 'quasar'
import { watch } from 'vue'
import quasarLangEn from 'quasar/lang/en-US'
import quasarLangUk from 'quasar/lang/uk'
import { currentLocale } from 'src/i18n'

// Quasar components (q-date, q-time, table pagination…) read their labels from
// the Quasar language pack, NOT from our custom i18n (messages.bundle.js). Keep
// that pack in sync with the app locale so, e.g., the date-picker months and
// weekdays are localized.
function applyQuasarLang(locale) {
  const isUk = String(locale || '').toLowerCase().startsWith('uk')
  try {
    Lang.set(isUk ? quasarLangUk : quasarLangEn)
  } catch {
    // Lang plugin not ready in this context — ignore.
  }
}

export default boot(() => {
  applyQuasarLang(currentLocale.value)
  watch(currentLocale, applyQuasarLang)
})
