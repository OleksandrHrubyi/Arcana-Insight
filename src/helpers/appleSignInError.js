// The @capacitor-community/apple-sign-in plugin rejects with only the native
// NSError localizedDescription (no code field — see Plugin.swift `call.reject`).
// A user tapping "Cancel"/"Скасувати" on the Apple sheet surfaces
// ASAuthorizationError.canceled (code 1001); the numeric code survives device
// localization in the fallback description, the word "cancel" only on EN devices.
export function isAppleSignInCancel(err) {
  const message = String(err?.message || err || '')
  return /\b1001\b/.test(message) || /cancel|скасован/i.test(message)
}
