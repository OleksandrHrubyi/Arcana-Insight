<script>
//import { supabase } from 'src/services/supabaseClient'

import { supabase } from 'src/services/supabaseClient';
import { upsertAppUser } from 'src/services/supabaseNative';
import CodeInput from 'components/ui/CodeInput.vue';
import { t, currentLocale } from 'src/i18n';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { resolveAuthRedirect } from 'src/helpers/authRedirect.js';
import { mapAuthErrorKey } from 'src/helpers/authErrors.js';
import { analytics } from 'src/services/analytics';

export default {
  name: 'ConfirmEmailCode',
  components: { CodeInput },

  data() {
    return {
      code: '',
      loading: false,
      errorMessage: '',
      resendCooldown: 0,
      resendTimer: null,
      hasResent: false,
    };
  },

  watch: {
    code(val) {
      if (val?.length === 6) {
        this.confirm();
      }
    },
  },


  computed: {
    locale() {
      return currentLocale.value || 'en';
    },

    tt() {
      return (key) => t(this.locale, key);
    },

    codeSentMessage() {
      return this.hasResent ? this.tt('auth.codeResent') : this.tt('auth.codeSent');
    },

    resendLabel() {
      if (this.resendCooldown > 0) {
        return `${this.tt('auth.sendCodeAgain')} (${this.resendCooldown}s)`;
      }
      return this.tt('auth.sendCodeAgain');
    },

    email() {
      return (this.$route.query.email || '').toString().trim();
    },

    name() {
      return (this.$route.query.name || '').toString().trim();
    },
    dateOfBirth() {
      return (this.$route.query.dateOfBirth || '').toString().trim();
    },
    cityOfBirth() {
      return (this.$route.query.cityOfBirth || '').toString().trim();
    },
    country() {
      return (this.$route.query.country || '').toString().trim();
    },
    isSignUp() {
      return (this.$route.query.mode || '').toString() === 'signup';
    },


  },

  methods: {
    startResendCooldown(seconds = 60) {
      this.resendCooldown = seconds;
      if (this.resendTimer) {
        clearInterval(this.resendTimer);
      }
      this.resendTimer = setInterval(() => {
        this.resendCooldown = Math.max(0, this.resendCooldown - 1);
        if (this.resendCooldown === 0) {
          clearInterval(this.resendTimer);
          this.resendTimer = null;
        }
      }, 1000);
    },

    async resendCode() {
      if (this.resendCooldown > 0) return;

      try {
        await this.hapticTap();
        this.loading = true;
        this.errorMessage = '';
        this.startResendCooldown(60);
        const otpOptions = {
          shouldCreateUser: this.isSignUp,
          emailRedirectTo: null, // важливо для OTP-коду, а не magic link
        };
        if (this.isSignUp) {
          otpOptions.data = {
            name: this.name,
            dateOfBirth: this.dateOfBirth,
            cityOfBirth: this.cityOfBirth,
            country: this.country,
          };
        }
        const { error } = await supabase.auth.signInWithOtp({
          email: this.email,
          options: otpOptions,
        });

        if (error) {
          this.errorMessage = this.tt(mapAuthErrorKey(error.message));
          return;
        }
        this.hasResent = true;

      } catch (e) {
        console.error(e);
        const message = String(e?.message || '');
        const match = message.match(/after (\d+) seconds/i);
        if (match) {
          this.startResendCooldown(Number(match[1]));
        }
        this.errorMessage = this.tt(mapAuthErrorKey(e.message));
      } finally {
        this.loading = false;
      }
    },
    goToMenu() {
      this.hapticTap();
      this.$router.push('/menu');
    },

    async hapticTap() {
      if (!Capacitor.isNativePlatform()) return;
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (e) {
        console.error(e);
      }
    },

    async confirm() {
      if (this.loading) return
      this.loading = true;
      this.errorMessage = '';

      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email: this.email,        // з route.query
          token: this.code,         // твій введений код
          type: 'email',
        });

        if (error) {
          // Clear the entered code so the user can simply retype to retry — the
          // length-6 watcher won't re-fire on an unchanged value, so without this
          // a wrong/expired code leaves them stuck (UX-2).
          this.code = '';
          this.errorMessage = this.tt(mapAuthErrorKey(error.message));
          return;
        }

        if (!data?.session) {
          this.code = '';
          this.errorMessage = this.tt('errors.noSession');
          return;
        }

        // Створюємо профіль тільки при реєстрації.
        // При логіні — ensureUserProfile в authStore сам перевіряє існування профілю.
        if (this.isSignUp) {
          const userId = data.session.user.id
          const userEmail = data.session.user.email

          const profileData = {
            id: userId,
            email: userEmail || this.email,
          }
          if (this.name) profileData.name = this.name
          if (this.dateOfBirth) profileData.date_of_birth = this.dateOfBirth

          const { error: profileError } = await upsertAppUser(profileData, 8000)
          if (profileError) {
            console.error('[ConfirmCode] Failed to create profile:', profileError)
            // Не блокуємо — authStore.ensureUserProfile підхопить при наступній сесії
          }
        }

        // Fire the canonical GA4 login/sign_up on actual completion. The email
        // path previously only logged an ad-hoc *_email_sent on code SEND, so the
        // most common method never registered a real login/sign_up (QA #19).
        if (this.isSignUp) {
          void analytics.logSignUp('email')
        } else {
          void analytics.logLogin('email')
        }

        this.$router.push(resolveAuthRedirect(this.$route.query.redirect, '/'))
      } catch (e) {
        console.error(e);
        this.code = '';
        this.errorMessage = this.tt('auth.wrongOrExpiredCode');
      } finally {
        this.loading = false;
      }
    }

  },

  beforeUnmount() {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
    }
  },
};
</script>


<template>
  <div class="login-wrap">
    <div class="login-container">
      <header class="auth-hero auth-hero--with-back">
        <button type="button" class="auth-back" @click="goToMenu">
          <q-icon name="chevron_left" size="18px" />
        </button>
        <div class="auth-hero__text">
          <div class="auth-title">{{ tt('auth.confirmCode') }}</div>
          <div class="auth-kicker">{{ codeSentMessage }}</div>
        </div>
      </header>

      <div class="login-panel">
        <div class="email">
          {{ email }}
          <router-link to="/login" class="row items-center q-ml-md email-edit" @click="hapticTap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13"
                stroke="#617C97"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M18.5 2.49998C18.8978 2.10216 19.4374 1.87866 20 1.87866C20.5626 1.87866 21.1022 2.10216 21.5 2.49998C21.8978 2.89781 22.1213 3.43737 22.1213 3.99998C22.1213 4.56259 21.8978 5.10216 21.5 5.49998L12 15L8 16L9 12L18.5 2.49998Z"
                stroke="#617C97"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </router-link>
        </div>

        <CodeInput v-model="code" />

        <p v-if="errorMessage" class="auth-error" role="alert" aria-live="assertive">
          {{ errorMessage }}
        </p>

        <q-separator class="separator-color"/>

        <div class="send-code">
          <span>{{ tt('auth.didntGetCode') }}</span>
          <q-btn
            flat
            no-caps
            class="send-code__btn"
            @click="resendCode"
            :loading="loading"
            :disable="loading || resendCooldown > 0"
          >
            <template v-slot:loading>
              <q-spinner-dots size="18px" color="#617C97" />
            </template>
            <span class="sent-code-btn">{{ resendLabel }}</span>
          </q-btn>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped lang="scss">
.login-wrap {
  min-height: 100vh;
  min-height: 100svh;
  min-height: 100dvh;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: stretch;
  background: radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 40%, #050d15 100%);
}

.login-container {
  position: relative;
  min-height: 100vh;
  min-height: 100svh;
  min-height: 100dvh;
  width: 100%;
  max-width: 440px;
  margin: 0 auto;
  padding: calc(96px + env(safe-area-inset-top)) 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
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
  background: linear-gradient(180deg, rgba(18, 24, 38, 0.82), rgba(10, 14, 22, 0.92));
  border-radius: 12px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow:
    0 8px 18px rgba(0, 0, 0, 0.18),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  padding: 20px 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.email {
  font-style: normal;
  font-weight: 400;
  font-size: 14px;
  line-height: 20px;
  text-align: center;

  color: #9FD8F6;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.email-edit {
  opacity: 0.7;
}

.auth-error {
  margin: 0;
  text-align: center;
  font-size: 13px;
  line-height: 1.4;
  color: #ff9b9b;
}

.separator-color {
  background-color: rgba(255, 255, 255, 0.12);
}


.send-code {
  display: grid;
  gap: 6px;
  justify-items: center;
  font-style: normal;
  font-weight: 400;
  font-size: 12px;
  line-height: 18px;
  text-align: center;
  color: rgba(214, 225, 242, 0.68);
}

.sent-code-btn {
  text-decoration: underline;
}

.send-code__btn {
  padding: 0;
  min-height: auto;
}

@media screen and (max-height: 720px) {
  .login-container {
    padding-top: calc(40px + env(safe-area-inset-top));
  }

  .login-panel {
    padding: 16px 14px 14px;
    gap: 12px;
  }
}
</style>
