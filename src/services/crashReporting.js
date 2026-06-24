import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics'
import { Capacitor } from '@capacitor/core'

// Fail-safe wrapper around Firebase Crashlytics. Native-only (no-ops in the
// browser/dev where the plugin isn't available). NOTHING here may ever throw —
// crash reporting that crashes the app would be worse than no reporting.
//
// Why this exists: this is a Capacitor/WKWebView app. The native Crashlytics SDK
// captures native crashes automatically, but JS errors inside the WebView (where
// all the app logic lives) are invisible to it. We forward Vue errors, unhandled
// rejections, and window errors here as non-fatal records (see boot/error-handler).
class CrashReportingService {
  constructor() {
    this.isNative = Capacitor.isNativePlatform()
    this.isAvailable = Capacitor.isPluginAvailable('FirebaseCrashlytics')
    this.enabled = this.isNative && this.isAvailable
  }

  async init() {
    if (!this.enabled) return
    try {
      await FirebaseCrashlytics.setEnabled({ enabled: true })
    } catch {
      /* ignore */
    }
  }

  // Record a non-fatal error so it surfaces in the Crashlytics dashboard.
  async recordError(error, context = {}) {
    if (!this.enabled) return
    try {
      const message = this.formatMessage(error, context)
      const stack = error && error.stack ? String(error.stack) : ''
      if (stack) {
        try {
          await FirebaseCrashlytics.log({ message: stack.slice(0, 4000) })
        } catch {
          /* ignore */
        }
      }
      await FirebaseCrashlytics.recordException({ message })
    } catch {
      /* never let reporting break the app */
    }
  }

  async log(message) {
    if (!this.enabled || !message) return
    try {
      await FirebaseCrashlytics.log({ message: String(message).slice(0, 4000) })
    } catch {
      /* ignore */
    }
  }

  async setUserId(userId) {
    if (!this.enabled) return
    try {
      await FirebaseCrashlytics.setUserId({ userId: String(userId || '') })
    } catch {
      /* ignore */
    }
  }

  formatMessage(error, context) {
    const base =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error == null ? 'Unknown error' : error)
    let ctx = ''
    try {
      ctx = context && Object.keys(context).length ? ` | ${JSON.stringify(context).slice(0, 500)}` : ''
    } catch {
      ctx = ''
    }
    return `${base}${ctx}`.slice(0, 1000)
  }
}

export const crashReporting = new CrashReportingService()
