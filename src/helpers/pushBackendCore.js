export const createPushBackendService = ({
  isDev = false,
  isNativePlatform,
  getPlatform,
  requestPermissions,
  addPushListener,
  registerPush,
  invokeFunction,
  localStorageRef,
  resolveTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
  tokenWaitMs = 12000,
} = {}) => {
  const LS_TOKEN = 'push_token'
  const LS_LOCALE = 'locale'
  const LS_OPT_TIME = 'daily_push_time'

  const getLocale = () => (localStorageRef.getItem(LS_LOCALE) || 'en').toLowerCase()
  const getApnsEnv = () => (isDev ? 'sandbox' : 'production')
  const getTz = () => resolveTimeZone() || 'UTC'

  const parseHHMM = (hhmm) => {
    if (!hhmm) return { hour: null, minute: null }
    const [h, m] = String(hhmm).split(':')
    const hour = Number(h)
    const minute = Number(m)
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return { hour: null, minute: null }
    return {
      hour: Math.max(0, Math.min(23, Math.trunc(hour))),
      minute: Math.max(0, Math.min(59, Math.trunc(minute))),
    }
  }

  const ensureToken = async () => {
    if (!isNativePlatform()) return null

    const perm = await requestPermissions()
    if (perm.receive !== 'granted') return null

    const saved = localStorageRef.getItem(LS_TOKEN)

    let registrationHandle = null
    let registrationErrorHandle = null
    let timeoutId = null
    let settled = false

    const cleanup = () => {
      if (timeoutId) {
        clearTimeoutFn(timeoutId)
        timeoutId = null
      }
      try {
        registrationHandle?.remove?.()
      } catch (e) {
        console.error(e)
      }
      try {
        registrationErrorHandle?.remove?.()
      } catch (e) {
        console.error(e)
      }
    }

    const token = await new Promise((resolve) => {
      const finish = (value) => {
        if (settled) return
        settled = true
        cleanup()
        resolve(value || null)
      }

      const startRegistration = async () => {
        try {
          registrationHandle = await addPushListener('registration', (nextToken) => {
            const value = nextToken?.value || null
            if (value) localStorageRef.setItem(LS_TOKEN, value)
            finish(value)
          })

          registrationErrorHandle = await addPushListener(
            'registrationError',
            (err) => {
              console.error('[push] registrationError', err)
              finish(null)
            },
          )

          timeoutId = setTimeoutFn(() => finish(null), tokenWaitMs)
          await registerPush()
        } catch (err) {
          console.error('[push] ensureToken failed', err)
          finish(null)
        }
      }

      void startRegistration()
    })

    return token || saved || null
  }

  const syncRegisterDevice = async ({ enabled, timeHHMM, locale }) => {
    const token = localStorageRef.getItem(LS_TOKEN) || (enabled ? await ensureToken() : null)
    if (!token) return { ok: false, error: 'No token' }

    const effectiveLocale = (locale || getLocale()).toLowerCase()
    const tz = getTz()
    const apns_env = getApnsEnv()

    const { hour, minute } = parseHHMM(timeHHMM)
    const hasTime = !!timeHHMM

    const body = {
      token,
      platform: getPlatform(),
      locale: effectiveLocale,
      enabled: !!enabled,
      apns_env,
      notify_hour: hasTime ? hour : null,
      notify_minute: hasTime ? minute : null,
      tz,
    }

    const { data, error } = await invokeFunction('register-device', body, 8000)
    if (error) return { ok: false, error }

    return { ok: true, data }
  }

  // Sign-out handshake (B8): while the session is STILL valid, detach this
  // device's row from the account so the server's ownership gate leaves the
  // (now anonymous) device free to keep managing its own push settings.
  // Best-effort: no token means push was never enabled here — nothing to unlink.
  const unlinkDeviceForLogout = async () => {
    const token = localStorageRef.getItem(LS_TOKEN)
    if (!token) return { ok: true, skipped: 'no_token' }
    const { data, error } = await invokeFunction('register-device', { action: 'unlink', token }, 4000)
    if (error) return { ok: false, error }
    return { ok: true, data }
  }

  const resolveAccountPushPreference = async () => {
    const { data, error } = await invokeFunction(
      'register-device',
      { action: 'resolve_account_preference' },
      8000,
    )
    if (error) return { ok: false, error }
    const preference = data?.preference || null
    const reason = String(data?.reason || '').trim()
    return { ok: true, data: { preference, reason } }
  }

  const getSavedTime = () => localStorageRef.getItem(LS_OPT_TIME) || ''
  const setSavedTime = (hhmm) => {
    localStorageRef.setItem(LS_OPT_TIME, hhmm || '')
  }

  return {
    getLocale,
    getApnsEnv,
    getTz,
    parseHHMM,
    ensureToken,
    syncRegisterDevice,
    unlinkDeviceForLogout,
    resolveAccountPushPreference,
    getSavedTime,
    setSavedTime,
  }
}
