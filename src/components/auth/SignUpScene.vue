<script>
import { supabase } from 'src/boot/supabase';
import { SignInWithApple } from '@capacitor-community/apple-sign-in';
import { t, currentLocale } from 'src/i18n';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export default {
  name: 'SignUpScene',

  data() {
    return {
      name: '',
      email: '',
      dateOfBirth: '',
      loading: false,
      errorMessage: '',
      reduceMotion: false,
      dateSheet: false,
      dayOptions: [],
      monthOptions: [],
      yearOptions: [],
      selectedDayIndex: 0,
      selectedMonthIndex: 0,
      selectedYearIndex: 0,
      lastDateHapticAt: 0,
    };
  },

  computed: {
    locale() {
      return currentLocale.value || 'en';
    },

    tt() {
      return (key) => t(this.locale, key);
    },

    trimmedName() {
      return this.name.trim();
    },
    trimmedEmail() {
      return this.email.trim();
    },
    trimmedDateOfBirth() {
      return this.dateOfBirth.trim();
    },

    isEmailValid() {
      if (!this.trimmedEmail) return false;
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailPattern.test(this.trimmedEmail);
    },

    isNameValid() {
      return this.trimmedName.length >= 2;
    },

    isFormValid() {
      return (
        this.isNameValid &&
        !!this.trimmedEmail &&
        !!this.trimmedDateOfBirth &&
        this.isEmailValid &&
        this.isDateValid
      );
    },

    dateOfBirthLabel() {
      return this.dateOfBirth || 'DD.MM.YYYY';
    },

    isDateValid() {
      return this.isValidDateInput(this.trimmedDateOfBirth);
    },
  },

  watch: {
    dateSheet(val) {
      document.body.classList.toggle('hide-bottom-nav', !!val);
    },
  },

  mounted() {
    try {
      this.reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
      console.error(e);
    }
    this.fillForm();
    this.buildDateOptions();
  },

  methods: {
    async hapticSelect() {
      if (!Capacitor.isNativePlatform()) return;
      if (this.reduceMotion) return;
      try {
        await Haptics.selectionChanged();
      } catch (e) {
        console.error(e);
      }
    },

    async hapticTap() {
      if (!Capacitor.isNativePlatform()) return;
      if (this.reduceMotion) return;
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (e) {
        console.error(e);
      }
    },

    async onSignUpTap() {
      await this.hapticTap();
      this.onSignUp();
    },

    async onSignUp() {
      // базова валідація перед запитом
      if (!this.isNameValid) {
        this.errorMessage = this.tt('errors.invalidName');
        return;
      }
      if (!this.isEmailValid) {
        this.errorMessage = this.tt('errors.invalidEmail');
        return;
      }
      if (!this.isDateValid) {
        this.errorMessage = this.tt('errors.invalidDate');
        return;
      }

      this.loading = true;
      this.errorMessage = '';

      try {
        const { error } = await supabase.auth.signInWithOtp({
          email: this.trimmedEmail,
          options: {
            shouldCreateUser: true,
            emailRedirectTo: null, // важливо для OTP-коду, а не magic link
            data: {
              name: this.trimmedName,
              dateOfBirth: this.trimmedDateOfBirth,
            },
          },
        });

        if (error) throw error;

        // переходимо на екран вводу коду
        this.$router.push({
          path: '/confirm-code',
          query: {
            email: this.trimmedEmail,
            name: this.trimmedName,
            dateOfBirth: this.trimmedDateOfBirth,
          },
        });
      } catch (e) {
        console.error(e);
        this.errorMessage = e.message || this.tt('errors.generic');
      } finally {
        this.loading = false;
      }
    },

    async loginWithApple() {
      try {
        await this.hapticTap();
        const result = await SignInWithApple.authorize({
          clientId: 'com.hrubyi.arcana.supabase',
          redirectURI: 'https://rgqfkdhzllhmagrcasav.supabase.co/auth/v1/callback',
          scopes: 'email name',
        });

        const idToken = result?.response?.identityToken;

        if (!idToken) {
          console.error('No identity token from Apple', result);
          return;
        }

        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: idToken,
        });

        if (error) {
          console.error('Supabase Apple login error', error, error.message, error.status, error.error_description);
          return;
        }

        this.$router.push('/');
      } catch (err) {
        console.error('Apple login failed', err);
      }
    },

    async loginWithGoogle() {
      try {
        await this.hapticTap();
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin + '/',
          },
        });

        if (error) {
          console.error('Google login error', error);
          return;
        }
      } catch (err) {
        console.error('Google OAuth error', err);
      }
    },


    loginWithTelegram() {
      this.hapticTap();
      // TODO: логін через Telegram
    },
    async goToMenu() {
      await this.hapticTap();
      this.$router.push('/menu');
    },

    fillForm() {
      if (this.$route?.query?.name) {
        this.name = (this.$route.query.name || '').toString();
      }
      if (this.$route?.query?.email) {
        this.email = (this.$route.query.email || '').toString();
      }
      if (this.$route?.query?.dateOfBirth) {
        this.dateOfBirth = (this.$route.query.dateOfBirth || '').toString();
      }
    },

    onOpenDateSheet() {
      this.hapticTap();
      this.syncDateSelectionFromValue();
      this.dateSheet = true;
      this.hapticSelectionStart();
      this.$nextTick(() => {
        this.scrollDateWheels(false);
      });
    },

    confirmDateWheel() {
      const day = this.dayOptions[this.selectedDayIndex] || 1;
      const month = this.monthOptions[this.selectedMonthIndex]?.value || 1;
      const year = this.yearOptions[this.selectedYearIndex] || new Date().getFullYear();
      const dd = String(day).padStart(2, '0');
      const mm = String(month).padStart(2, '0');
      this.dateOfBirth = `${dd}.${mm}.${year}`;
      this.errorMessage = '';
      this.dateSheet = false;
      this.hapticSelectionEnd();
    },

    buildDateOptions() {
      const currentYear = new Date().getFullYear();
      const minYear = currentYear - 120;
      const maxYear = currentYear;
      this.yearOptions = [];
      for (let y = maxYear; y >= minYear; y -= 1) {
        this.yearOptions.push(y);
      }

      this.monthOptions = Array.from({ length: 12 }, (_, idx) => {
        const value = idx + 1;
        const date = new Date(2000, idx, 1);
        const label = new Intl.DateTimeFormat(this.locale === 'uk' ? 'uk-UA' : 'en-US', {
          month: 'short',
        }).format(date);
        return { value, label };
      });

      this.dayOptions = Array.from({ length: 31 }, (_, idx) => idx + 1);
      this.syncDateSelectionFromValue();
    },

    syncDateSelectionFromValue() {
      const fallbackYear = this.yearOptions[0] || new Date().getFullYear();
      const raw = this.dateOfBirth || '';
      let day = 1;
      let month = 1;
      let year = fallbackYear;
      const parts = raw.includes('.') ? raw.split('.') : raw.split('-');
      if (parts.length === 3) {
        const [a, b, c] = parts.map((p) => parseInt(p, 10));
        if (raw.includes('.')) {
          day = a || day;
          month = b || month;
          year = c || year;
        } else {
          year = a || year;
          month = b || month;
          day = c || day;
        }
      }
      this.selectedYearIndex = Math.max(0, this.yearOptions.findIndex((y) => y === year));
      this.selectedMonthIndex = Math.max(0, this.monthOptions.findIndex((m) => m.value === month));
      const maxDay = this.getDaysInMonth(year, month);
      day = Math.min(day, maxDay);
      this.selectedDayIndex = Math.max(0, this.dayOptions.findIndex((d) => d === day));
    },

    getDaysInMonth(year, month) {
      return new Date(year, month, 0).getDate();
    },

    isValidDateInput(value) {
      if (!value) return false;
      const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
      if (!match) return false;
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const year = parseInt(match[3], 10);
      if (month < 1 || month > 12) return false;
      const currentYear = new Date().getFullYear();
      const minYear = currentYear - 120;
      if (year < minYear || year > currentYear) return false;
      const maxDay = this.getDaysInMonth(year, month);
      return day >= 1 && day <= maxDay;
    },

    onDayWheelScroll() {
      const wheel = this.$refs.dayWheelRef;
      if (!wheel) return;
      const nextIndex = Math.min(this.dayOptions.length - 1, Math.max(0, Math.round(wheel.scrollTop / 44)));
      if (nextIndex === this.selectedDayIndex) return;
      this.selectedDayIndex = nextIndex;
      this.hapticSelectThrottled();
    },

    onMonthWheelScroll() {
      const wheel = this.$refs.monthWheelRef;
      if (!wheel) return;
      const nextIndex = Math.min(this.monthOptions.length - 1, Math.max(0, Math.round(wheel.scrollTop / 44)));
      if (nextIndex === this.selectedMonthIndex) return;
      this.selectedMonthIndex = nextIndex;
      this.syncDayForMonth();
      this.hapticSelectThrottled();
    },

    onYearWheelScroll() {
      const wheel = this.$refs.yearWheelRef;
      if (!wheel) return;
      const nextIndex = Math.min(this.yearOptions.length - 1, Math.max(0, Math.round(wheel.scrollTop / 44)));
      if (nextIndex === this.selectedYearIndex) return;
      this.selectedYearIndex = nextIndex;
      this.syncDayForMonth();
      this.hapticSelectThrottled();
    },

    onDayWheelItemTap(index) {
      this.selectedDayIndex = index;
      this.scrollWheel(this.$refs.dayWheelRef, index, true);
      this.hapticSelect();
    },

    onMonthWheelItemTap(index) {
      this.selectedMonthIndex = index;
      this.syncDayForMonth();
      this.scrollWheel(this.$refs.monthWheelRef, index, true);
      this.hapticSelect();
    },

    onYearWheelItemTap(index) {
      this.selectedYearIndex = index;
      this.syncDayForMonth();
      this.scrollWheel(this.$refs.yearWheelRef, index, true);
      this.hapticSelect();
    },

    syncDayForMonth() {
      const year = this.yearOptions[this.selectedYearIndex] || new Date().getFullYear();
      const month = this.monthOptions[this.selectedMonthIndex]?.value || 1;
      const maxDay = this.getDaysInMonth(year, month);
      if (this.dayOptions[this.selectedDayIndex] > maxDay) {
        this.selectedDayIndex = maxDay - 1;
        this.scrollWheel(this.$refs.dayWheelRef, this.selectedDayIndex, true);
      }
    },

    scrollDateWheels(smooth) {
      this.scrollWheel(this.$refs.dayWheelRef, this.selectedDayIndex, smooth);
      this.scrollWheel(this.$refs.monthWheelRef, this.selectedMonthIndex, smooth);
      this.scrollWheel(this.$refs.yearWheelRef, this.selectedYearIndex, smooth);
    },

    scrollWheel(wheel, index, smooth) {
      if (!wheel) return;
      const top = index * 44;
      wheel.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
    },

    hapticSelectThrottled() {
      const now = Date.now();
      if (now - this.lastDateHapticAt < 80) return;
      this.lastDateHapticAt = now;
      this.hapticSelect();
    },

    async hapticSelectionStart() {
      if (!Capacitor.isNativePlatform()) return;
      if (this.reduceMotion) return;
      try {
        await Haptics.selectionStart();
      } catch (e) {
        console.error(e);
      }
    },

    async hapticSelectionEnd() {
      if (!Capacitor.isNativePlatform()) return;
      if (this.reduceMotion) return;
      try {
        await Haptics.selectionEnd();
      } catch (e) {
        console.error(e);
      }
    },
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
          <div class="auth-title">{{ tt('auth.signUpAction') }}</div>
          <div class="auth-kicker">{{ tt('auth.welcomeTo') }}</div>
        </div>
      </header>

      <div class="login-panel">

        <form novalidate>
        <div class="field">
          <label class="field-label q-mb-xs" for="signup-name">{{ tt('fields.name') }}</label> <input
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
          <div class="field custom-margin">
            <label class="field-label q-mb-xs" for="signup-email">{{ tt('fields.email') }}</label> <input
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
          <p class="auth-helper">{{ tt('auth.loginHelper') }}</p>
        </div>

        <div class="field">
          <label class="field-label q-mb-xs" for="signup-dob">{{ tt('fields.dateOfBirth') }}</label>
          <input
            id="signup-dob"
            class="field-input field-input--button"
            :value="dateOfBirthLabel"
            autocomplete="bday"
            inputmode="none"
            readonly
            @click="onOpenDateSheet"
          />
        </div>

        <p class="terms-link terms-link-wrap terms-block">
          {{ tt('auth.byCreatingAccount') }}
          <router-link to="/" class="terms-link">{{ tt('auth.terms') }}</router-link>
        </p>

        <div class="q-mb-md">
          <q-btn
            :label="tt('auth.signUpAction')"
            class="no-auth-btn mono-text"
            no-caps
            flat
            @click="onSignUpTap"
          />
        </div>

        <p class="auth-error auth-error--below" :class="{ 'auth-error--visible': !!errorMessage }">
          {{ errorMessage }}
        </p>
        </form>

        <p class="bottom-text">
          {{ tt('auth.alreadyHaveAccount') }}
          <router-link to="/login" class="link">{{ tt('auth.loginAction') }}</router-link>
        </p>

        <div class="divider">
          <span class="divider-line"></span> <span class="divider-text">{{ tt('auth.orContinueWith') }}</span>
          <span class="divider-line"></span>
        </div>

        <div class="social-buttons">
          <q-btn
            class="social-btn apple-btn"
            flat
            round
            @click="loginWithApple"
          >
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

          <q-btn
            flat
            round
            @click="loginWithGoogle"
            class="social-btn google-btn"
          >
          <svg
            width="24"
            height="24"
            viewBox="-3 0 262 262"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid"
          >
            <path
              d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
              fill="#4285F4"
            />
            <path
              d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
              fill="#34A853"
            />
            <path
              d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
              fill="#FBBC05"
            />
            <path
              d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
              fill="#EB4335"
            />
          </svg>
          </q-btn>

          <q-btn
            class="social-btn tg-btn"
            flat
            round
            @click="loginWithTelegram"
          >
          <svg
            width="38"
            height="38"
            viewBox="0 0 1000 1000"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient
                x1="50%"
                y1="0%"
                x2="50%"
                y2="99.2583404%"
                id="tg-grad"
              >
                <stop stop-color="transparent" offset="0%" />
                <stop stop-color="#050608" offset="100%" />
              </linearGradient>
            </defs>
            <circle fill="url(#tg-grad)" cx="500" cy="500" r="500" />
            <path
              d="M226.328419,494.722069 C372.088573,431.216685 469.284839,389.350049 517.917216,369.122161 C656.772535,311.36743 685.625481,301.334815 704.431427,301.003532 C708.567621,300.93067 717.815839,301.955743 723.806446,306.816707 C728.864797,310.92121 730.256552,316.46581 730.922551,320.357329 C731.588551,324.248848 732.417879,333.113828 731.758626,340.040666 C724.234007,419.102486 691.675104,610.964674 675.110982,699.515267 C668.10208,736.984342 654.301336,749.547532 640.940618,750.777006 C611.904684,753.448938 589.856115,731.588035 561.733393,713.153237 C517.726886,684.306416 492.866009,666.349181 450.150074,638.200013 C400.78442,605.66878 432.786119,587.789048 460.919462,558.568563 C468.282091,550.921423 596.21508,434.556479 598.691227,424.000355 C599.00091,422.680135 599.288312,417.758981 596.36474,415.160431 C593.441168,412.561881 589.126229,413.450484 586.012448,414.157198 C581.598758,415.158943 511.297793,461.625274 375.109553,553.556189 C355.154858,567.258623 337.080515,573.934908 320.886524,573.585046 C303.033948,573.199351 268.692754,563.490928 243.163606,555.192408 C211.851067,545.013936 186.964484,539.632504 189.131547,522.346309 C190.260287,513.342589 202.659244,504.134509 226.328419,494.722069 Z"
              fill="#7B83EB"
            />
          </svg>
          </q-btn>
        </div>
      </div>
    </div>

    <q-dialog
      v-model="dateSheet"
      position="bottom"
      transition-show="slide-up"
      transition-hide="slide-down"
      :transition-duration="440"
      class="oracle-actions-dialog"
    >
      <section class="oracle-actions">
        <div class="sheet-handle" aria-hidden="true"></div>
        <div class="sheet-title">{{ tt('fields.dateOfBirth') }}</div>

        <div class="oracle-wheel-grid">
          <div class="oracle-wheel">
            <div class="oracle-wheel__window" aria-hidden="true"></div>
            <div ref="dayWheelRef" class="oracle-wheel__scroll" @scroll.passive="onDayWheelScroll">
              <div class="oracle-wheel__spacer"></div>
              <button
                v-for="(day, index) in dayOptions"
                :key="`day-${day}`"
                type="button"
                class="oracle-wheel__item"
                :class="{ 'oracle-wheel__item--active': index === selectedDayIndex }"
                @click="onDayWheelItemTap(index)"
              >
                {{ String(day).padStart(2, '0') }}
              </button>
              <div class="oracle-wheel__spacer"></div>
            </div>
          </div>

          <div class="oracle-wheel">
            <div class="oracle-wheel__window" aria-hidden="true"></div>
            <div ref="monthWheelRef" class="oracle-wheel__scroll" @scroll.passive="onMonthWheelScroll">
              <div class="oracle-wheel__spacer"></div>
              <button
                v-for="(month, index) in monthOptions"
                :key="`month-${month.value}`"
                type="button"
                class="oracle-wheel__item"
                :class="{ 'oracle-wheel__item--active': index === selectedMonthIndex }"
                @click="onMonthWheelItemTap(index)"
              >
                {{ month.label }}
              </button>
              <div class="oracle-wheel__spacer"></div>
            </div>
          </div>

          <div class="oracle-wheel">
            <div class="oracle-wheel__window" aria-hidden="true"></div>
            <div ref="yearWheelRef" class="oracle-wheel__scroll" @scroll.passive="onYearWheelScroll">
              <div class="oracle-wheel__spacer"></div>
              <button
                v-for="(year, index) in yearOptions"
                :key="`year-${year}`"
                type="button"
                class="oracle-wheel__item"
                :class="{ 'oracle-wheel__item--active': index === selectedYearIndex }"
                @click="onYearWheelItemTap(index)"
              >
                {{ year }}
              </button>
              <div class="oracle-wheel__spacer"></div>
            </div>
          </div>
        </div>

        <div class="oracle-actions__footer">
          <button type="button" class="oracle-actions__ok" @click="confirmDateWheel">
            Apply
          </button>
        </div>
      </section>
    </q-dialog>
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
  max-width: 440px;
  margin: 0 auto;
  padding: calc(96px + env(safe-area-inset-top)) 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
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
}

.field {
  padding-bottom: 4px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 16px;
}

.field-label {
  font-size: 12px;
  line-height: 18px;
  color: rgba(214, 225, 242, 0.78);
}

.field-input {
  padding: 2px 0 0;
  margin: 0;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 15px;
  line-height: 22px;
  color: rgba(224, 234, 248, 0.9);
}

.field-input--button {
  cursor: pointer;
}

.field-input::placeholder {
  color: #5f6a84;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
}

.auth-helper {
  margin: 0;
  font-size: 12px;
  line-height: 14px;
  color: rgba(214, 225, 242, 0.5);
}

.auth-error {
  margin: 6px 0 12px;
  font-size: 12px;
  line-height: 14px;
  color: rgba(255, 168, 168, 0.9);
  min-height: 14px;
  opacity: 0;
  transition: opacity 180ms ease;
}

.auth-error--visible {
  opacity: 1;
}

.auth-error--below {
  margin: 0 0 12px;
}

.no-auth-btn {
  height: 50px;
  width: 100%;
  background: linear-gradient(180deg, rgba(28, 38, 58, 0.92), rgba(10, 15, 27, 0.98));
  border: 1px solid rgba(156, 184, 235, 0.36);
  border-radius: 12px;
  font-size: 14px;
  line-height: 21px;
  color: #ffffff;
  letter-spacing: 0.02em;
  box-shadow: none;
  transition: transform 0.15s ease, opacity 0.15s ease, box-shadow 0.2s ease;

  &:active {
    opacity: 0.9;
    transform: scale(0.98);
  }
}

.bottom-text {
  font-size: 12px;
  color: rgba(214, 225, 242, 0.68);
  margin-bottom: 20px;
}

.link {
  font-weight: 400;
  font-size: 12px;
  line-height: 20px;
  text-decoration: underline;
  color: rgba(214, 225, 242, 0.92);
}

.divider {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
}

.divider-text {
  font-size: 10px;
  color: rgba(214, 225, 242, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.social-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.social-btn {
  width: 52px;
  height: 52px;
  padding: 0;
  border-radius: 14px;
  background: rgba(10, 12, 18, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.75) inset,
  0 10px 25px rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.12s ease, opacity 0.15s ease, border-color 0.2s ease;

  &:active {
    transform: scale(0.94);
    opacity: 0.9;
  }
}

.google-btn,
.apple-btn,
.tg-btn {
  background: #050608;
}

.bottom-btn-back {
  position: absolute;
  bottom: 50px;
  left: 16px;
}

.back-small-btn {
  color: #7E8AA5;

  background: transparent;
  transition: background 0.2s ease, transform 0.12s ease, border-color 0.2s ease;

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
  color: #7E8AA5;
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
  font-size: 11px;
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
  overflow-x: hidden;
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
  transition: color 140ms ease, transform 140ms ease;
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

.oracle-actions__ok {
  width: 100%;
  min-height: 48px;
  border-radius: 12px;
  border: 1px solid rgba(156, 184, 235, 0.36);
  padding: 12px 14px;
  background: linear-gradient(180deg, rgba(28, 38, 58, 0.92), rgba(10, 15, 27, 0.98));
  color: var(--oracle-text-main);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: none;
  box-shadow: none;
  transition: transform 120ms ease, box-shadow 160ms ease, border-color 160ms ease, filter 160ms ease;
}

.oracle-actions__ok:active:not(:disabled) {
  transform: translateY(1px);
  border-color: rgba(156, 184, 235, 0.28);
  filter: saturate(0.92);
  box-shadow: none;
}

.oracle-actions__ok:disabled {
  opacity: 0.42;
  border-color: rgba(120, 146, 194, 0.18);
  background:
    linear-gradient(180deg, rgba(20, 29, 46, 0.72), rgba(6, 10, 19, 0.82));
  box-shadow: inset 0 1px 0 rgba(214, 229, 255, 0.08);
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
