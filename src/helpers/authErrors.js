// Map a raw Supabase auth error message to a localized i18n key, so non-English
// users never see raw English backend strings during the email/OTP flow
// (QA finding #6). Returns a key for the component's t()/tt() — never the raw
// message. Used by the email code-confirmation screen (verify + resend).
export const mapAuthErrorKey = (rawMessage) => {
  const msg = String(rawMessage || '')
    .trim()
    .toLowerCase()
  if (!msg) return 'errors.generic'

  // OTP rate limit, e.g. "For security purposes, you can only request this after
  // 35 seconds" / "Email rate limit exceeded".
  if (
    /after\s+\d+\s+second/.test(msg) ||
    msg.includes('security purposes') ||
    msg.includes('rate limit') ||
    msg.includes('too many')
  ) {
    return 'auth.tooManyAttempts'
  }

  // Wrong / expired verification code, e.g. "Token has expired or is invalid".
  if (msg.includes('expired') || msg.includes('invalid')) {
    return 'auth.wrongOrExpiredCode'
  }

  return 'errors.generic'
}
