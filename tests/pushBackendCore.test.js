import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from './utils/testEnv.js'

const createStorage = (seed = {}) => {
  const map = new Map(Object.entries(seed))
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null
    },
    setItem(key, value) {
      map.set(key, String(value))
    },
    __read(key) {
      return map.has(key) ? map.get(key) : null
    },
  }
}

test('push core helpers parse time, locale, env and saved time correctly', async () => {
  const { createPushBackendService } = await importModule('src/helpers/pushBackendCore.js')
  const storage = createStorage({ locale: 'UK' })
  const service = createPushBackendService({
    isDev: true,
    isNativePlatform: () => false,
    getPlatform: () => 'ios',
    requestPermissions: async () => ({ receive: 'denied' }),
    addPushListener: async () => ({ remove() {} }),
    registerPush: async () => {},
    invokeFunction: async () => ({ data: null, error: null }),
    localStorageRef: storage,
    resolveTimeZone: () => 'Europe/Kyiv',
  })

  assert.equal(service.getLocale(), 'uk')
  assert.equal(service.getApnsEnv(), 'sandbox')
  assert.equal(service.getTz(), 'Europe/Kyiv')
  assert.deepEqual(service.parseHHMM('25:73'), { hour: 23, minute: 59 })
  assert.deepEqual(service.parseHHMM('bad'), { hour: null, minute: null })

  assert.equal(service.getSavedTime(), '')
  service.setSavedTime('08:30')
  assert.equal(service.getSavedTime(), '08:30')
})

test('ensureToken returns null on non-native or denied permission', async () => {
  const { createPushBackendService } = await importModule('src/helpers/pushBackendCore.js')
  const storage = createStorage()

  const notNative = createPushBackendService({
    isDev: false,
    isNativePlatform: () => false,
    getPlatform: () => 'ios',
    requestPermissions: async () => ({ receive: 'granted' }),
    addPushListener: async () => ({ remove() {} }),
    registerPush: async () => {},
    invokeFunction: async () => ({ data: null, error: null }),
    localStorageRef: storage,
  })
  assert.equal(await notNative.ensureToken(), null)

  const denied = createPushBackendService({
    isDev: false,
    isNativePlatform: () => true,
    getPlatform: () => 'ios',
    requestPermissions: async () => ({ receive: 'denied' }),
    addPushListener: async () => ({ remove() {} }),
    registerPush: async () => {},
    invokeFunction: async () => ({ data: null, error: null }),
    localStorageRef: storage,
  })
  assert.equal(await denied.ensureToken(), null)
})

test('ensureToken resolves registration token and stores it', async () => {
  const { createPushBackendService } = await importModule('src/helpers/pushBackendCore.js')
  const storage = createStorage()
  const listeners = {}

  const service = createPushBackendService({
    isDev: false,
    isNativePlatform: () => true,
    getPlatform: () => 'ios',
    requestPermissions: async () => ({ receive: 'granted' }),
    addPushListener: async (eventName, callback) => {
      listeners[eventName] = callback
      return { remove() {} }
    },
    registerPush: async () => {
      listeners.registration?.({ value: 'token_123' })
    },
    invokeFunction: async () => ({ data: null, error: null }),
    localStorageRef: storage,
    setTimeoutFn: () => 1,
    clearTimeoutFn: () => {},
  })

  const token = await service.ensureToken()
  assert.equal(token, 'token_123')
  assert.equal(storage.__read('push_token'), 'token_123')
})

test('ensureToken falls back to saved token on timeout and handles registrationError', async () => {
  const { createPushBackendService } = await importModule('src/helpers/pushBackendCore.js')
  const storage = createStorage({ push_token: 'saved_token' })
  const listeners = {}

  const service = createPushBackendService({
    isDev: false,
    isNativePlatform: () => true,
    getPlatform: () => 'ios',
    requestPermissions: async () => ({ receive: 'granted' }),
    addPushListener: async (eventName, callback) => {
      listeners[eventName] = callback
      return { remove() {} }
    },
    registerPush: async () => {
      listeners.registrationError?.({ message: 'fail' })
    },
    invokeFunction: async () => ({ data: null, error: null }),
    localStorageRef: storage,
    setTimeoutFn: (cb) => {
      cb()
      return 1
    },
    clearTimeoutFn: () => {},
  })

  const token = await service.ensureToken()
  assert.equal(token, 'saved_token')
})

test('syncRegisterDevice builds payload correctly and calls backend function', async () => {
  const { createPushBackendService } = await importModule('src/helpers/pushBackendCore.js')
  const storage = createStorage({ push_token: 'token_abc' })
  const calls = []

  const service = createPushBackendService({
    isDev: false,
    isNativePlatform: () => true,
    getPlatform: () => 'ios',
    requestPermissions: async () => ({ receive: 'granted' }),
    addPushListener: async () => ({ remove() {} }),
    registerPush: async () => {},
    invokeFunction: async (...args) => {
      calls.push(args)
      return { data: { ok: true }, error: null }
    },
    localStorageRef: storage,
    resolveTimeZone: () => 'Europe/Kyiv',
  })

  const result = await service.syncRegisterDevice({
    enabled: true,
    timeHHMM: '07:45',
    locale: 'uk',
  })

  assert.equal(result.ok, true)
  assert.equal(calls.length, 1)
  assert.equal(calls[0][0], 'register-device')
  assert.deepEqual(calls[0][1], {
    token: 'token_abc',
    platform: 'ios',
    locale: 'uk',
    enabled: true,
    apns_env: 'production',
    notify_hour: 7,
    notify_minute: 45,
    tz: 'Europe/Kyiv',
  })
  assert.equal(calls[0][2], 8000)
})

test('syncRegisterDevice returns No token or backend error when request cannot be completed', async () => {
  const { createPushBackendService } = await importModule('src/helpers/pushBackendCore.js')

  const noTokenService = createPushBackendService({
    isDev: false,
    isNativePlatform: () => false,
    getPlatform: () => 'ios',
    requestPermissions: async () => ({ receive: 'denied' }),
    addPushListener: async () => ({ remove() {} }),
    registerPush: async () => {},
    invokeFunction: async () => ({ data: null, error: null }),
    localStorageRef: createStorage(),
  })
  const noToken = await noTokenService.syncRegisterDevice({ enabled: false, timeHHMM: '', locale: '' })
  assert.equal(noToken.ok, false)
  assert.equal(noToken.error, 'No token')

  const backendErrorService = createPushBackendService({
    isDev: false,
    isNativePlatform: () => false,
    getPlatform: () => 'ios',
    requestPermissions: async () => ({ receive: 'denied' }),
    addPushListener: async () => ({ remove() {} }),
    registerPush: async () => {},
    invokeFunction: async () => ({ data: null, error: new Error('backend failed') }),
    localStorageRef: createStorage({ push_token: 'token_ok' }),
  })
  const backendErr = await backendErrorService.syncRegisterDevice({ enabled: true, timeHHMM: '', locale: '' })
  assert.equal(backendErr.ok, false)
  assert.equal(backendErr.error.message, 'backend failed')
})

test('resolveAccountPushPreference returns parsed preference payload', async () => {
  const { createPushBackendService } = await importModule('src/helpers/pushBackendCore.js')
  const storage = createStorage()
  const calls = []

  const service = createPushBackendService({
    isDev: false,
    isNativePlatform: () => true,
    getPlatform: () => 'ios',
    requestPermissions: async () => ({ receive: 'granted' }),
    addPushListener: async () => ({ remove() {} }),
    registerPush: async () => {},
    invokeFunction: async (...args) => {
      calls.push(args)
      return {
        data: {
          ok: true,
          preference: {
            enabled: true,
            notify_hour: 9,
            notify_minute: 30,
          },
        },
        error: null,
      }
    },
    localStorageRef: storage,
  })

  const result = await service.resolveAccountPushPreference()
  assert.equal(result.ok, true)
  assert.equal(calls.length, 1)
  assert.equal(calls[0][0], 'register-device')
  assert.deepEqual(calls[0][1], { action: 'resolve_account_preference' })
  assert.equal(calls[0][2], 8000)
  assert.deepEqual(result.data.preference, {
    enabled: true,
    notify_hour: 9,
    notify_minute: 30,
  })
})

test('ensureToken handles listener cleanup errors and register exceptions', async () => {
  const { createPushBackendService } = await importModule('src/helpers/pushBackendCore.js')
  const storage = createStorage({ push_token: 'saved_before_cleanup' })
  const listeners = {}
  const originalConsoleError = console.error

  try {
    console.error = () => {}

    const service = createPushBackendService({
      isDev: false,
      isNativePlatform: () => true,
      getPlatform: () => 'ios',
      requestPermissions: async () => ({ receive: 'granted' }),
      addPushListener: async (eventName, callback) => {
        listeners[eventName] = callback
        return {
          remove() {
            throw new Error('remove-failed')
          },
        }
      },
      registerPush: async () => {
        listeners.registration?.({ value: 'token_cleanup' })
      },
      invokeFunction: async () => ({ data: null, error: null }),
      localStorageRef: storage,
      setTimeoutFn: () => 1,
      clearTimeoutFn: () => {},
    })

    const tokenFromCleanupCase = await service.ensureToken()
    assert.equal(tokenFromCleanupCase, 'token_cleanup')

    const throwStorage = createStorage({ push_token: 'saved_after_throw' })
    const throwingRegister = createPushBackendService({
      isDev: false,
      isNativePlatform: () => true,
      getPlatform: () => 'ios',
      requestPermissions: async () => ({ receive: 'granted' }),
      addPushListener: async () => ({ remove() {} }),
      registerPush: async () => {
        throw new Error('register failed')
      },
      invokeFunction: async () => ({ data: null, error: null }),
      localStorageRef: throwStorage,
      setTimeoutFn: () => 1,
      clearTimeoutFn: () => {},
    })

    const tokenFromThrowCase = await throwingRegister.ensureToken()
    assert.equal(tokenFromThrowCase, 'saved_after_throw')
  } finally {
    console.error = originalConsoleError
  }
})
