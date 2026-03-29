import path from 'node:path'
import { pathToFileURL } from 'node:url'

class MemoryStorage {
  constructor(seed = {}) {
    this.map = new Map(Object.entries(seed).map(([key, value]) => [key, String(value)]))
  }

  getItem(key) {
    return this.map.has(String(key)) ? this.map.get(String(key)) : null
  }

  setItem(key, value) {
    this.map.set(String(key), String(value))
  }

  removeItem(key) {
    this.map.delete(String(key))
  }

  clear() {
    this.map.clear()
  }
}

const ensureCustomEvent = () => {
  if (typeof globalThis.CustomEvent === 'function') return
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, params = {}) {
      this.type = type
      this.detail = params.detail
    }
  }
}

export const installBrowserEnv = (seedStorage = {}) => {
  const originalWindow = globalThis.window
  const originalLocalStorage = globalThis.localStorage
  const originalCustomEvent = globalThis.CustomEvent

  ensureCustomEvent()

  const localStorage = new MemoryStorage(seedStorage)
  const listeners = new Map()
  const windowObj = {
    addEventListener(type, handler) {
      const key = String(type)
      const current = listeners.get(key) || new Set()
      current.add(handler)
      listeners.set(key, current)
    },
    removeEventListener(type, handler) {
      const current = listeners.get(String(type))
      if (!current) return
      current.delete(handler)
    },
    dispatchEvent(event) {
      const current = listeners.get(String(event?.type || ''))
      if (!current) return true
      for (const handler of current) {
        handler(event)
      }
      return true
    },
    localStorage,
  }

  globalThis.window = windowObj
  globalThis.localStorage = localStorage

  const restore = () => {
    if (typeof originalWindow === 'undefined') {
      delete globalThis.window
    } else {
      globalThis.window = originalWindow
    }

    if (typeof originalLocalStorage === 'undefined') {
      delete globalThis.localStorage
    } else {
      globalThis.localStorage = originalLocalStorage
    }

    if (typeof originalCustomEvent === 'undefined') {
      delete globalThis.CustomEvent
    } else {
      globalThis.CustomEvent = originalCustomEvent
    }
  }

  return {
    window: windowObj,
    localStorage,
    dispatchStorageEvent(key) {
      windowObj.dispatchEvent({ type: 'storage', key: String(key) })
    },
    restore,
  }
}

export const importFresh = async (relativePathFromRepoRoot) => {
  const absolutePath = path.resolve(process.cwd(), relativePathFromRepoRoot)
  const fileUrl = pathToFileURL(absolutePath).href
  const suffix = `?t=${Date.now()}_${Math.random().toString(36).slice(2)}`
  return import(`${fileUrl}${suffix}`)
}

export const importModule = async (relativePathFromRepoRoot) => {
  const absolutePath = path.resolve(process.cwd(), relativePathFromRepoRoot)
  const fileUrl = pathToFileURL(absolutePath).href
  return import(fileUrl)
}
