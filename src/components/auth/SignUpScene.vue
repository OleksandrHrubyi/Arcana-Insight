<script>
import { supabase } from 'src/services/supabaseClient'
import { getUserNative, upsertAppUser } from 'src/services/supabaseNative'
import { SignInWithApple } from '@capacitor-community/apple-sign-in'
import { t, currentLocale } from 'src/i18n'
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { analytics } from 'src/services/analytics'
import { resolveAuthRedirect } from 'src/helpers/authRedirect.js'

export default {
  name: 'SignUpScene',

  data() {
    return {
      name: '',
      email: '',
      loading: false,
      appleLoading: false,
      errorMessage: '',
      reduceMotion: false,
      platform: 'web',
    }
  },

  computed: {
    locale() {
      return currentLocale.value || 'en'
    },

    // Carry the "sign in first" destination across the sign-up <-> login link and
    // through to /confirm-code, so a paywall-cohort newcomer returns to where they
    // were headed after verifying instead of landing on Home.
    redirectQuery() {
      const redirect = this.$route.query.redirect
      return redirect ? { redirect: String(redirect) } : {}
    },

    tt() {
      return (key) => t(this.locale, key)
    },

    trimmedName() {
      return this.name.trim()
    },

    trimmedEmail() {
      return this.email.trim()
    },

    isEmailValid() {
      if (!this.trimmedEmail) return false
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailPattern.test(this.trimmedEmail)
    },

    isNameValid() {
      return this.trimmedName.length >= 2
    },

    isNativePlatform() {
      return Capacitor.isNativePlatform()
    },

    isIOSNative() {
      return this.platform === 'ios' && this.isNativePlatform
    },

    anyLoading() {
      return this.loading || this.appleLoading
    },
  },

  mounted() {
    void this.initializeSignUpSafe()
  },

  methods: {
    async initializeSignUp() {
      const win = typeof window !== 'undefined' ? window : null
      this.reduceMotion = !!win?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
      this.platform = Capacitor.getPlatform()
      this.logAuth('mounted', { platform: this.platform, isNative: this.isNativePlatform })
      if (this.$route?.query?.name) {
        this.name = (this.$route.query.name || '').toString()
      }
      if (this.$route?.query?.email) {
        this.email = (this.$route.query.email || '').toString()
      }
    },

    async initializeSignUpSafe() {
      try {
        await this.initializeSignUp()
      } catch (error) {
        this.logAuth('mounted_failed', error?.message || String(error))
      }
    },

    logAuth(step, payload) {
      if (!import.meta.env.DEV) return
      if (payload !== undefined) {
        console.log(`[Auth][SignUp] ${step}`, payload)
      } else {
        console.log(`[Auth][SignUp] ${step}`)
      }
    },

    async withTimeout(promise, ms, label) {
      let timer
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Timeout after ${ms}ms: ${label}`))
        }, ms)
      })

      try {
        return await Promise.race([promise, timeout])
      } finally {
        clearTimeout(timer)
      }
    },

    async hapticTap() {
      if (!Capacitor.isNativePlatform()) return
      if (this.reduceMotion) return

      try {
        await Haptics.impact({ style: ImpactStyle.Light })
      } catch (e) {
        console.error(e)
      }
    },

    async onSignUpTap() {
      await this.hapticTap()
      await this.onSignUp()
    },

    async onSignUp() {
      if (this.anyLoading) return
      if (!this.isNameValid) {
        this.errorMessage = this.tt('errors.invalidName')
        this.logAuth('invalid_name', { name: this.trimmedName })
        return
      }

      if (!this.isEmailValid) {
        this.errorMessage = this.tt('errors.invalidEmail')
        this.logAuth('invalid_email', { email: this.trimmedEmail })
        return
      }

      this.loading = true
      this.errorMessage = ''
      this.logAuth('email_signup_start')

      try {
        const { error } = await supabase.auth.signInWithOtp({
          email: this.trimmedEmail,
          options: {
            shouldCreateUser: true,
            emailRedirectTo: null,
            data: {
              name: this.trimmedName,
            },
          },
        })
        this.logAuth('email_otp_requested', { error: error?.message || null })

        if (error) {
          // Map known backend errors to localized copy; never surface the raw
          // (English) Supabase message to a non-English user.
          const raw = String(error.message || '').toLowerCase()
          this.errorMessage =
            raw.includes('invalid') && raw.includes('email')
              ? this.tt('errors.invalidEmail')
              : this.tt('errors.generic')
          this.logAuth('email_otp_error', { raw: error.message })
          return
        }

        analytics.logEvent('signup_email_sent', { method: 'email' })
        this.logAuth('email_otp_success')

        this.$router.push({
          path: '/confirm-code',
          query: {
            email: this.trimmedEmail,
            name: this.trimmedName,
            mode: 'signup',
            ...this.redirectQuery,
          },
        })
      } catch (e) {
        console.error(e)
        this.errorMessage = e.message || this.tt('errors.generic')
        this.logAuth('email_exception', e?.message || e?.toString())
      } finally {
        this.loading = false
      }
    },

    async loginWithApple() {
      if (this.anyLoading) return
      this.appleLoading = true
      try {
        await this.hapticTap()
        this.errorMessage = ''
        this.logAuth('apple_start')

        const result = await SignInWithApple.authorize({
          clientId: 'com.hrubyi.arcana.supabase',
          redirectURI: 'https://rgqfkdhzllhmagrcasav.supabase.co/auth/v1/callback',
          scopes: 'email name',
        })
        this.logAuth('apple_authorize_result', {
          hasResponse: !!result?.response,
          hasIdentityToken: !!result?.response?.identityToken,
          hasUser: !!result?.response?.user,
        })

        const idToken = result?.response?.identityToken

        if (!idToken) {
          this.errorMessage = 'No identity token from Apple'
          console.error('No identity token from Apple', result)
          this.logAuth('apple_missing_id_token')
          return
        }

        const { data: authData, error } = await this.withTimeout(
          supabase.auth.signInWithIdToken({
            provider: 'apple',
            token: idToken,
          }),
          8000,
          'supabase.signInWithIdToken',
        )
        this.logAuth('apple_supabase_signin', {
          hasSession: !!authData?.session,
          hasUser: !!authData?.user,
          error: error?.message || error?.error_description || null,
        })

        if (error) {
          this.errorMessage = `Apple signup error: ${error.message || error.error_description || 'Unknown error'}`
          console.error(
            'Supabase Apple login error',
            error,
            error.message,
            error.status,
            error.error_description,
          )
          return
        }

        // Wait for session to be established
        let user = authData?.user || null
        if (!authData?.session) {
          const { data: nativeUser } = await getUserNative(4000)
          user = nativeUser || user
          if (!user) {
            this.errorMessage = 'No session created after Apple signup. Please try again.'
            console.error('[SignUpScene] No session created after Apple login')
            this.logAuth('apple_no_session')
            return
          }
        }

        // Create user profile in app_users
        if (user) {
          const profilePayload = {
            id: user.id,
            email: user.email,
          }
          const metadataName = (user.user_metadata?.name || user.user_metadata?.full_name || '').trim()
          if (metadataName) profilePayload.name = metadataName

          const { error: profileError } = await this.withTimeout(
            upsertAppUser(profilePayload, 8000),
            8000,
            'supabase.app_users.upsert',
          )
          this.logAuth('apple_profile_upsert', {
            error: profileError?.message || null,
          })

          if (profileError) {
            this.errorMessage = `Profile error: ${profileError.message}`
            console.error('[SignUpScene] Profile creation error:', profileError)
            return
          }
        }

        this.logAuth('apple_before_redirect')
        analytics.logSignUp('apple')
        this.logAuth('apple_success_redirect')
        this.$router.push(resolveAuthRedirect(this.$route.query.redirect, '/'))
      } catch (err) {
        this.errorMessage = `Apple signup failed: ${err.message || err.toString()}`
        console.error('Apple login failed', err)
        this.logAuth('apple_exception', err?.message || err?.toString())
      } finally {
        this.appleLoading = false
      }
    },

    async goToMenu() {
      await this.hapticTap()
      this.$router.push('/menu')
    },
  },
}
</script>

<template>
  <div class="login-wrap">
    <div class="login-container">
      <header class="auth-hero auth-hero--with-back">
        <button type="button" class="auth-back" @click="goToMenu">
          <q-icon name="chevron_left" size="18px" />
        </button>
        <div class="auth-hero__text">
          <div class="auth-title">{{ tt('auth.signUpAction') }}</div>
          <div class="auth-kicker">{{ tt('auth.welcomeTo') }}</div>
        </div>
      </header>

      <div class="login-panel">
        <form novalidate class="login-form">
          <div class="field">
            <label class="field-label" for="signup-name">{{ tt('fields.name') }}</label>
            <input
              id="signup-name"
              class="field-input"
              v-model="name"
              type="text"
              autocomplete="name"
              inputmode="text"
              @input="errorMessage = ''"
            />
          </div>

          <div class="field-group">
            <div class="field">
              <label class="field-label" for="signup-email">{{ tt('fields.email') }}</label>
            <input
              id="signup-email"
              class="field-input"
                v-model="email"
                type="email"
                autocomplete="email"
                inputmode="email"
              autocapitalize="none"
              @input="errorMessage = ''"
            />
            </div>
            <p class="auth-helper">{{ tt('auth.signUpHelper') }}</p>
          </div>

          <p class="terms-text">
            {{ tt('auth.byCreatingAccount') }}
            <router-link to="/privacy-terms" class="link link--terms">{{ tt('auth.terms') }}</router-link>
          </p>

          <q-btn
          :label="tt('auth.signUpAction')"
          class="no-auth-btn"
          no-caps
          flat
          :loading="loading"
          :disable="anyLoading"
          @click="onSignUpTap"
        >
            <template v-slot:loading>
              <q-spinner-dots size="24px" color="white" />
            </template>
          </q-btn>

          <p class="auth-error" :class="{ 'auth-error--visible': !!errorMessage }">
            {{ errorMessage }}
          </p>
        </form>

        <p class="bottom-text">
          {{ tt('auth.alreadyHaveAccount') }}
          <router-link :to="{ path: '/login', query: redirectQuery }" class="link">{{ tt('auth.loginAction') }}</router-link>
        </p>

        <div v-if="isIOSNative" class="divider">
          <span class="divider-line"></span>
          <span class="divider-text">{{ tt('auth.orContinueWith') }}</span>
          <span class="divider-line"></span>
        </div>

        <div v-if="isIOSNative" class="social-buttons">
          <q-btn
            v-if="isIOSNative"
            class="social-btn apple-btn"
            flat
            round
            :loading="appleLoading"
            :disable="anyLoading"
            @click="loginWithApple"
          >
            <template v-slot:loading>
              <q-spinner-dots size="18px" color="white" />
            </template>
            <svg
              fill="#fff"
              width="24"
              height="24"
              viewBox="-52.01 0 560.035 560.035"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M380.844 297.529c.787 84.752 74.349 112.955 75.164 113.314-.622 1.988-11.754 40.191-38.756 79.652-23.343 34.117-47.568 68.107-85.731 68.811-37.499.691-49.557-22.236-92.429-22.236-42.859 0-56.256 21.533-91.753 22.928-36.837 1.395-64.889-36.891-88.424-70.883-48.093-69.53-84.846-196.475-35.496-282.165 24.516-42.554 68.328-69.501 115.882-70.192 36.173-.69 70.315 24.336 92.429 24.336 22.1 0 63.59-30.096 107.208-25.676 18.26.76 69.517 7.376 102.429 55.552-2.652 1.644-61.159 35.704-60.523 106.559M310.369 89.418C329.926 65.745 343.089 32.79 339.498 0 311.308 1.133 277.22 18.785 257 42.445c-18.121 20.952-33.991 54.487-29.709 86.628 31.421 2.431 63.52-15.967 83.078-39.655"
              />
            </svg>
          </q-btn>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.login-wrap {
  height: 100dvh;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: stretch;
  background: radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 40%, #050d15 100%);
}

.login-container {
  position: relative;
  height: 100dvh;
  width: 100%;
  max-width: 460px;
  margin: 0 auto;
  padding: calc(96px + env(safe-area-inset-top)) 18px calc(24px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 16px;
  justify-content: flex-start;
}

.auth-hero {
  text-align: center;
  display: grid;
  gap: 6px;
  justify-items: center;
  padding: 4px 8px 6px;
}

.auth-hero--with-back {
  position: relative;
  grid-template-columns: 1fr;
  align-items: center;
  justify-items: center;
  gap: 12px;
}

.auth-hero__text {
  text-align: center;
  display: grid;
  gap: 6px;
  justify-items: center;
  padding: 0 44px;
  min-height: 48px;
}

.auth-back {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(10, 14, 22, 0.7);
  color: rgba(214, 225, 242, 0.8);
  display: grid;
  place-items: center;
}

.auth-title {
  font-size: 20px;
  letter-spacing: 0.08em;
  font-weight: 600;
  color: #ffffff;
}

.auth-kicker {
  text-transform: uppercase;
  letter-spacing: 0.24em;
  font-size: 9px;
  color: rgba(208, 219, 238, 0.62);
}

.login-panel {
  background: linear-gradient(160deg, rgba(14, 20, 32, 0.92), rgba(6, 10, 18, 0.98));
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow:
    0 18px 40px rgba(2, 6, 12, 0.52),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  padding: 24px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(8, 12, 20, 0.78);
  transition: all 180ms ease;
}

.field:focus-within {
  border-color: rgba(156, 184, 235, 0.28);
  background: rgba(12, 16, 26, 0.85);
}

.field--clickable {
  cursor: pointer;
}

.field--clickable:active {
  transform: scale(0.99);
}

.field-label {
  font-size: 13px;
  line-height: 1.3;
  letter-spacing: 0.02em;
  color: rgba(214, 225, 242, 0.68);
  font-weight: 500;
}

.field-input {
  padding: 0;
  margin: 0;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 15px;
  line-height: 1.4;
  color: rgba(235, 242, 255, 0.94);
}

.field-input--button {
  cursor: pointer;
}

.field-input::placeholder {
  color: rgba(214, 225, 242, 0.4);
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.auth-helper {
  margin: 0;
  padding: 0 2px;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(214, 225, 242, 0.56);
}

.no-auth-btn {
  height: 52px;
  width: 100%;
  background: var(--btn-primary-bg);
  border: 1px solid var(--btn-primary-border);
  color: var(--btn-primary-text);
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.4;
  font-weight: 600;
  letter-spacing: 0.04em;
  box-shadow: none;
  transition: all 180ms ease;

  &:active:not(:disabled) {
    transform: scale(0.98);
  }
}

.no-auth-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.auth-error {
  margin: 0;
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(255, 180, 180, 0.94);
  background: rgba(255, 80, 80, 0.08);
  border: 1px solid rgba(255, 100, 100, 0.16);
  border-radius: 12px;
  min-height: 0;
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  transition: all 240ms ease;
}

.auth-error--visible {
  opacity: 1;
  max-height: 100px;
  min-height: 38px;
}

.terms-text {
  margin: 0;
  padding: 0 2px;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(214, 225, 242, 0.6);
}

.bottom-text {
  font-size: 13px;
  line-height: 1.6;
  color: rgba(214, 225, 242, 0.72);
  margin: 0;
  text-align: center;
}

.link {
  font-weight: 500;
  font-size: 13px;
  text-decoration: none;
  color: rgba(173, 210, 255, 0.95);
  border-bottom: 1px solid rgba(173, 210, 255, 0.3);
  transition: all 180ms ease;
}

.link:hover {
  color: rgba(173, 210, 255, 1);
  border-bottom-color: rgba(173, 210, 255, 0.6);
}

.link--terms {
  font-size: 12px;
}

.divider {
  display: flex;
  align-items: center;
  gap: 12px;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
}

.divider-text {
  font-size: 10px;
  color: rgba(214, 225, 242, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-weight: 500;
}

.social-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.social-btn {
  width: 56px;
  height: 56px;
  padding: 0;
  border-radius: 16px;
  background: rgba(8, 12, 20, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.6) inset,
    0 8px 20px rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 180ms ease;

  &:active {
    transform: scale(0.94);
    border-color: rgba(156, 184, 235, 0.2);
  }
}

.apple-btn {
  background: rgba(5, 6, 8, 0.95);
}

.bottom-btn-back {
  position: absolute;
  bottom: 50px;
  left: 16px;
}

.back-small-btn {
  color: #7e8aa5;

  background: transparent;
  transition:
    background 0.2s ease,
    transform 0.12s ease,
    border-color 0.2s ease;

  &:active {
    transform: scale(0.96);
  }
}

.terms-link-wrap {
  max-width: 330px;
}

.terms-block {
  margin: 6px 0 16px;
}

.terms-link {
  font-weight: 400;
  font-size: 12px;
  line-height: 24px;
  color: #7e8aa5;
}

:deep(.oracle-actions-dialog .q-dialog__backdrop) {
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

:deep(.oracle-actions-dialog .q-dialog__inner) {
  padding: 0;
  align-items: flex-end;
  background: radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 40%, #050d15 100%);
}

:deep(.oracle-actions-dialog) {
  z-index: 9999;
}

:deep(.oracle-actions-dialog .q-dialog__backdrop),
:deep(.oracle-actions-dialog .q-dialog__inner) {
  z-index: 10000;
}

.oracle-actions {
  width: 100vw;
  max-width: 100vw;
  margin: 0 auto;
  border-radius: 22px 22px 0 0;
  padding: 8px 12px calc(env(safe-area-inset-bottom, 0px) + 24px);
  box-shadow: 0 -16px 46px rgba(0, 0, 0, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #ffffff;
  pointer-events: auto;
  background: #050d15;
}

.sheet-handle {
  width: 36px;
  height: 3px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
  margin: 0 auto 10px;
}

.sheet-title {
  text-align: center;
  font-size: 13px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.74);
  margin-bottom: 6px;
}

.oracle-wheel-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.oracle-wheel {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  touch-action: pan-y;
}

.oracle-wheel::before,
.oracle-wheel::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 40px;
  z-index: 2;
  pointer-events: none;
}

.oracle-wheel::before {
  top: 0;
}

.oracle-wheel::after {
  bottom: 0;
}

.oracle-wheel__window {
  position: absolute;
  left: 6px;
  right: 6px;
  top: 50%;
  height: 44px;
  transform: translateY(-50%);
  border-radius: 9px;
  border: 1px solid rgba(138, 161, 204, 0.16);
  background: black;
  box-shadow:
    0 14px 30px rgba(0, 0, 0, 0.46),
    inset 0 1px 0 rgba(198, 218, 255, 0.13),
    inset 0 -1px 0 rgba(68, 96, 141, 0.13),
    inset 0 0 14px rgba(56, 82, 124, 0.1);
  backdrop-filter: blur(6px) saturate(118%);
  -webkit-backdrop-filter: blur(6px) saturate(118%);
  z-index: 1;
  pointer-events: none;
}

.oracle-wheel__scroll {
  position: relative;
  height: 152px;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: y mandatory;
  z-index: 3;
  scrollbar-width: none;
  touch-action: pan-y;
  overscroll-behavior-y: contain;
}

.oracle-wheel__spacer {
  height: 54px;
}

.oracle-wheel__item {
  display: block;
  width: 100%;
  min-height: 44px;
  height: 44px;
  padding: 0 10px;
  margin: 0;
  border: 0;
  background: transparent;
  color: rgba(231, 225, 211, 0.7);
  font-size: 15px;
  line-height: 1.2;
  scroll-snap-align: center;
  transition:
    color 140ms ease,
    transform 140ms ease;
}

.oracle-wheel__item--active {
  color: rgba(244, 238, 227, 0.97);
  transform: scale(1.01);
}

.oracle-wheel__scroll::-webkit-scrollbar {
  display: none;
}

.oracle-actions__footer {
  margin-top: 12px;
  padding: 8px;
  border-radius: 16px;
  border: 1px solid rgba(106, 126, 164, 0.22);
  background:
    linear-gradient(180deg, rgba(9, 13, 21, 0.88), rgba(3, 6, 11, 0.95)),
    linear-gradient(90deg, rgba(83, 112, 170, 0.1), rgba(83, 112, 170, 0));
  box-shadow:
    inset 0 1px 0 rgba(186, 207, 247, 0.08),
    0 10px 24px rgba(0, 0, 0, 0.3);
}


@media screen and (max-height: 720px) {
  .login-container {
    padding-top: calc(40px + env(safe-area-inset-top));
  }

  .login-panel {
    padding: 16px 14px 14px;
  }

  .field {
    margin-bottom: 12px;
  }

  .no-auth-btn {
    height: 46px;
  }

  .bottom-text {
    margin-bottom: 14px;
  }

  .divider {
    margin-bottom: 12px;
  }

  .social-btn {
    width: 46px;
    height: 46px;
    border-radius: 12px;
  }
}

.custom-margin {
  margin-bottom: 4px;
}
</style>
