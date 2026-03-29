import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { invokeFunction } from 'src/services/supabaseNative'
import { createPushBackendService } from './pushBackendCore.js'

const service = createPushBackendService({
  isDev: import.meta.env.DEV,
  isNativePlatform: () => Capacitor.isNativePlatform(),
  getPlatform: () => Capacitor.getPlatform(),
  requestPermissions: () => PushNotifications.requestPermissions(),
  addPushListener: (...args) => PushNotifications.addListener(...args),
  registerPush: () => PushNotifications.register(),
  invokeFunction,
  localStorageRef: localStorage,
})

export const getApnsEnv = () => service.getApnsEnv()
export const getTz = () => service.getTz()
export const parseHHMM = (hhmm) => service.parseHHMM(hhmm)
export const ensureToken = () => service.ensureToken()
export const syncRegisterDevice = (payload) => service.syncRegisterDevice(payload)
export const resolveAccountPushPreference = () => service.resolveAccountPushPreference()
export const getSavedTime = () => service.getSavedTime()
export const setSavedTime = (hhmm) => service.setSavedTime(hhmm)
