<script>
import { SignInWithApple } from '@capacitor-community/apple-sign-in'
import { supabase, setAuthInFlight, withAuthLockOrTimeout } from 'src/services/supabaseClient'
import { getUserNative, upsertAppUser } from 'src/services/supabaseNative'
import { t, currentLocale } from 'src/i18n'
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { analytics } from 'src/services/analytics'
import { useAuthStore } from 'stores/authStore.js'
import { resolveAuthRedirect } from 'src/helpers/authRedirect.js'
import { isAppleSignInCancel } from 'src/helpers/appleSignInError.js'

export default {
  name: 'LoginView',

  data() {
    return {
      email: '',
      loading: false,
      appleLoading: false,
      errorMessage: '',
      reduceMotion: false,
      platform: 'web',
      authStore: useAuthStore(),
    }
  },

  computed: {
    locale() {
      return currentLocale.value || 'en'
    },

    // Carry the "sign in first" destination across the login <-> sign-up link so
    // the cohort that tapped Buy on the paywall isn't dropped on Home after auth.
    redirectQuery() {
      const redirect = this.$route.query.redirect
      return redirect ? { redirect: String(redirect) } : {}
    },

    tt() {
      return (key) => t(this.locale, key)
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
    void this.initializeLoginViewSafe()
  },

  methods: {
    async initializeLoginView() {
      const win = typeof window !== 'undefined' ? window : null
      this.reduceMotion = !!win?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
      this.platform = Capacitor.getPlatform()
      this.logAuth('mounted', { platform: this.platform, isNative: this.isNativePlatform })
    },

    async initializeLoginViewSafe() {
      try {
        await this.initializeLoginView()
      } catch (error) {
        this.logAuth('mounted_failed', error?.message || String(error))
      }
    },

    logAuth(step, payload) {
      if (!import.meta.env.DEV) return
      if (payload !== undefined) {
        console.log(`[Auth][Login] ${step}`, payload)
      } else {
        console.log(`[Auth][Login] ${step}`)
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

    async waitForAuthUser(timeoutMs = 3000) {
      const start = Date.now()
      while (Date.now() - start < timeoutMs) {
        const user = this.authStore.state.user
        if (user) return user
        await new Promise((r) => setTimeout(r, 200))
      }
      return null
    },

    async onLoginTap() {
      await this.hapticTap()
      await this.onLogin()
    },

    async loginWithApple() {
      if (this.anyLoading) return
      setAuthInFlight(true)
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
          this.errorMessage = this.tt('errors.appleFailed')
          console.error('No identity token from Apple', result)
          this.logAuth('apple_missing_id_token')
          return
        }

        let authData = null
        let error = null
        await withAuthLockOrTimeout(async () => {
          try {
            const res = await this.withTimeout(
              supabase.auth.signInWithIdToken({
                provider: 'apple',
                token: idToken,
              }),
              8000,
              'supabase.signInWithIdToken',
            )
            authData = res?.data
            error = res?.error
          } catch (err) {
            this.logAuth('apple_supabase_signin_timeout', err?.message || err?.toString())
          }
        })
        this.logAuth('apple_supabase_signin', {
          hasSession: !!authData?.session,
          hasUser: !!authData?.user,
          error: error?.message || error?.error_description || null,
        })

        let user = authData?.user || null
        if (!authData?.session) {
          const { data: nativeUser } = await getUserNative(4000)
          if (nativeUser) {
            user = nativeUser
          } else if (error) {
            this.errorMessage = this.tt('errors.appleFailed')
            console.error('Supabase Apple login error', error)
            return
          } else {
            this.errorMessage = this.tt('errors.appleFailed')
            console.error('[LoginView] No session created after Apple login')
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

          void this.withTimeout(
            upsertAppUser(profilePayload, 8000),
            8000,
            'supabase.app_users.upsert',
          ).then(({ error: profileError }) => {
            this.logAuth('apple_profile_upsert', {
              error: profileError?.message || null,
            })
            if (profileError) {
              console.error('[LoginView] Profile creation error:', profileError)
            }
          }).catch((err) => {
            this.logAuth('apple_profile_upsert_timeout', err?.message || err?.toString())
          })
        }

        this.logAuth('apple_before_redirect')
        analytics.logLogin('apple')
        this.logAuth('apple_success_redirect')
        this.$router.push(resolveAuthRedirect(this.$route.query.redirect, '/'))
      } catch (err) {
        // Tapping "Cancel" on the Apple sheet is not a failure — stay silent.
        if (isAppleSignInCancel(err)) {
          this.logAuth('apple_cancelled')
          return
        }
        this.errorMessage = this.tt('errors.appleFailed')
        console.error('Apple login failed', err)
        this.logAuth('apple_exception', err?.message || err?.toString())
      } finally {
        this.appleLoading = false
        setAuthInFlight(false)
      }
    },

    async goToMenu() {
      await this.hapticTap()
      // Return to wherever the user came from (e.g. the paywall) instead of always
      // dumping them in Menu; fall back to Menu only on a fresh/deep-link entry (UX-5).
      if (typeof window !== 'undefined' && window.history.length > 1) this.$router.back()
      else this.$router.push('/menu')
    },

    async onLogin() {
      if (this.anyLoading) return
      this.loading = true
      this.errorMessage = ''
      this.logAuth('email_login_start')

      const emailTrimmed = this.email.trim()
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

      if (!emailPattern.test(emailTrimmed)) {
        this.loading = false
        this.errorMessage = this.tt('errors.invalidEmail')
        this.logAuth('email_invalid', { email: emailTrimmed })
        return
      }

      try {
        const { error } = await supabase.auth.signInWithOtp({
          email: emailTrimmed,
          options: {
            shouldCreateUser: false,
            emailRedirectTo: null,
          },
        })
        this.logAuth('email_otp_requested', { error: error?.message || null })

        if (error) {
          // Supabase повертає цю помилку коли email не зареєстрований і shouldCreateUser: false
          const msg = error.message || ''
          if (
            msg.toLowerCase().includes('signups not allowed') ||
            msg.toLowerCase().includes('user not found') ||
            msg.toLowerCase().includes('email not confirmed') ||
            error.status === 422 ||
            error.status === 400
          ) {
            this.errorMessage = this.tt('errors.emailNotRegistered') || 'Email not found. Please sign up first.'
          } else if (msg.toLowerCase().includes('invalid') && msg.toLowerCase().includes('email')) {
            this.errorMessage = this.tt('errors.invalidEmail')
          } else if (
            error.status === 429 ||
            /rate limit|too many|after\s+\d+\s+second|security purposes/i.test(msg)
          ) {
            // A3: rate-limit on the OTP *send* → localized "too many attempts",
            // not the generic message.
            this.errorMessage = this.tt('auth.tooManyAttempts')
          } else {
            // Never surface the raw (English) backend message to a non-English user.
            this.errorMessage = this.tt('errors.generic')
          }
          return
        }

        analytics.logEvent('login_email_sent', { method: 'email' })
        this.logAuth('email_otp_success')
        this.$router.push({
          path: '/confirm-code',
          query: {
            email: this.email,
            mode: 'login',
            ...(this.$route.query.redirect ? { redirect: String(this.$route.query.redirect) } : {}),
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
          <div class="auth-title">{{ tt('auth.loginAction') }}</div>
          <div class="auth-kicker">{{ tt('auth.welcomeBack') }}</div>
        </div>
      </header>

      <div class="login-panel">
        <div class="login-form">
          <div class="field">
            <label class="field-label q-mb-xs" for="login-email">{{ tt('fields.email') }}</label>
            <input
              id="login-email"
              v-model="email"
              class="field-input"
              type="email"
              autocomplete="email"
              inputmode="email"
              autocapitalize="none"
              @input="errorMessage = ''"
            />
          </div>

          <p v-if="errorMessage" class="auth-error">{{ errorMessage }}</p>

          <p class="auth-helper">{{ tt('auth.loginHelper') }}</p>

          <q-btn
          :label="tt('auth.loginAction')"
          class="no-auth-btn"
          no-caps
          flat
          :loading="loading"
          :disable="anyLoading"
          @click="onLoginTap"
        >
            <template v-slot:loading>
              <q-spinner-dots size="24px" color="white" />
            </template>
          </q-btn>
        </div>

        <p class="bottom-text">
          {{ tt('auth.newToArcana') }}
          <router-link :to="{ path: '/sign-up', query: redirectQuery }" class="link">{{ tt('auth.signUpAction') }}</router-link>
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
  min-height: 100vh;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: stretch;
  background: radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 40%, #050d15 100%);
}

.login-container {
  position: relative;
  min-height: 100vh;
  width: 100%;
  max-width: 460px;
  margin: 0 auto;
  padding: calc(96px + env(safe-area-inset-top)) 18px calc(24px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@supports (min-height: 100dvh) {
  .login-wrap,
  .login-container {
    min-height: 100dvh;
  }
}

@supports (min-height: 100svh) {
  @supports not (min-height: 100dvh) {
    .login-wrap,
    .login-container {
      min-height: 100svh;
    }
  }
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

.field-input::placeholder {
  color: rgba(214, 225, 242, 0.4);
}

.auth-helper {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(214, 225, 242, 0.56);
}

.auth-error {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: #ff9aa7;
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

.apple-btn,
.tg-btn {
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
</style>
