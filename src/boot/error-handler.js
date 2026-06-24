import { boot } from 'quasar/wrappers'
import { crashReporting } from 'src/services/crashReporting'

// Global safety net. Without this, an unhandled promise rejection or a thrown
// error inside a component could leave the app in a silent broken state with no
// log. Everything funnels through here: Vue component errors, unhandled promise
// rejections, and uncaught runtime errors — logged with a tag so they're
// debuggable, rejections are marked handled to avoid noisy console spam, and
// every error is forwarded to Firebase Crashlytics (native, fail-safe) so we can
// see WebView JS failures in production instead of flying blind.
const toError = (value) =>
  value instanceof Error
    ? value
    : new Error(typeof value === 'string' ? value : (() => { try { return JSON.stringify(value) } catch { return String(value) } })())

export default boot(({ app }) => {
  // Enable Crashlytics ASAP (no-ops in browser/dev). Never blocks startup.
  void crashReporting.init()

  app.config.errorHandler = (err, _instance, info) => {
    console.error('[vue-error]', info, err)
    void crashReporting.recordError(toError(err), { source: 'vue', info: String(info || '') })
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      console.error('[unhandledrejection]', event?.reason)
      void crashReporting.recordError(toError(event?.reason), { source: 'unhandledrejection' })
      // We have logged it — prevent the default "Uncaught (in promise)" noise.
      event.preventDefault()
    })

    window.addEventListener('error', (event) => {
      console.error('[window-error]', event?.error || event?.message)
      void crashReporting.recordError(toError(event?.error || event?.message), { source: 'window' })
    })
  }
})
