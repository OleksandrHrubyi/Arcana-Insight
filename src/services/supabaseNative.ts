import {
  nativeFetch,
  shouldUseNativeFetch,
  getSupabaseUrl,
  getSupabaseAnonKey,
  readStoredAccessToken,
  readStoredSession,
  writeStoredSession,
} from './supabaseClient'
import { createSupabaseNativeService } from './supabaseNativeCore.js'

const service = createSupabaseNativeService({
  supabaseUrl: getSupabaseUrl(),
  supabaseAnonKey: getSupabaseAnonKey(),
  readStoredAccessToken,
  readStoredSession,
  writeStoredSession,
  shouldUseNativeFetch,
  nativeFetch,
  fetchImpl: fetch,
})

export const refreshAccessTokenNative = (...args) => service.refreshAccessTokenNative(...args)
export const getUserNative = (...args) => service.getUserNative(...args)
export const setSessionFromTokens = (...args) => service.setSessionFromTokens(...args)
export const updateUserPasswordNative = (...args) => service.updateUserPasswordNative(...args)
export const selectAppUser = (...args) => service.selectAppUser(...args)
export const upsertAppUser = (...args) => service.upsertAppUser(...args)
export const selectTarotReadingsByUser = (...args) => service.selectTarotReadingsByUser(...args)
export const insertTarotReading = (...args) => service.insertTarotReading(...args)
export const deleteTarotReading = (...args) => service.deleteTarotReading(...args)
export const selectHoroscopes = (...args) => service.selectHoroscopes(...args)
export const invokeFunction = (...args) => service.invokeFunction(...args)
