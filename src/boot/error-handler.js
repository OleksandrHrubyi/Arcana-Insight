import { boot } from 'quasar/wrappers'

// Global safety net. Without this, an unhandled promise rejection or a thrown
// error inside a component could leave the app in a silent broken state with no
// log. Everything funnels through here: Vue component errors, unhandled promise
// rejections, and uncaught runtime errors — logged with a tag so they're
// debuggable, and rejections are marked handled to avoid noisy console spam.
export default boot(({ app }) => {
  app.config.errorHandler = (err, _instance, info) => {
    console.error('[vue-error]', info, err)
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      console.error('[unhandledrejection]', event?.reason)
      // We have logged it — prevent the default "Uncaught (in promise)" noise.
      event.preventDefault()
    })

    window.addEventListener('error', (event) => {
      console.error('[window-error]', event?.error || event?.message)
    })
  }
})
