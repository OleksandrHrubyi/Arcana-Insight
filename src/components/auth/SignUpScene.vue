<template>
  <div class="signup-wrapper">
    <div class="signup-bg">
      <div class="signup-overlay"></div>

      <div class="signup-content">
        <!-- Top back + "Sign up" -->
        <header class="signup-header">
          <button type="button" class="back-btn mono-text" @click="goBack">
            <span class="back-label">Back</span>
          </button>
        </header>

        <!-- Intro text -->
        <section class="signup-intro">
          <h1 class="signup-title mono-text">
            Welcome to Horoscope
          </h1>
          <p class="signup-subtitle mono-text">
            Join to discover insights written in the
            stars — your horoscope, your way.
          </p>
        </section>

        <!-- Form -->
        <q-form class="signup-form" @submit.prevent="onSubmit">
          <div class="field-list">
            <!-- Name -->
            <div class="field-row">
              <div class="field-label mono-text">Name</div>
              <q-input
                v-model="form.name"
                borderless
                dense
                class="field-input"
                input-class="field-input-inner mono-text"
                placeholder="Jon Macc"
              />
            </div>

            <!-- Email -->
            <div class="field-row">
              <div class="field-label mono-text">Email</div>
              <q-input
                v-model="form.email"
                type="email"
                borderless
                dense
                class="field-input"
                input-class="field-input-inner mono-text"
                placeholder="name@mail.co"
              />
            </div>

            <!-- Date of birth -->
            <div class="field-row">
              <div class="field-label mono-text">Date of birth</div>
              <q-input
                v-model="form.dob"
                borderless
                dense
                class="field-input"
                input-class="field-input-inner mono-text"
                placeholder="__/__/____"
                mask="##/##/####"
                fill-mask
              />
            </div>

            <!-- City of birth -->
            <div class="field-row">
              <div class="field-label mono-text">City of birth</div>
              <q-input
                v-model="form.city"
                borderless
                dense
                class="field-input"
                input-class="field-input-inner mono-text"
                placeholder="New York"
              />
            </div>

            <!-- Country (без списку, тільки текст + стрілка як на макеті) -->
            <button
              type="button"
              class="field-row field-row--button"
            >
              <div class="field-label mono-text">Country</div>
              <div class="field-country-right mono-text">
                <span class="field-country-text">United States</span>
                <span class="field-country-arrow"></span>
              </div>
            </button>
          </div>

          <!-- Terms -->
          <p class="terms mono-text">
            By creating an account, you agree to
            our
            <button type="button" class="link-inline" @click="openTerms">
              Terms and Conditions
            </button>
          </p>

          <!-- Primary button -->
          <q-btn
            type="submit"
            label="Sign up"
            class="primary-btn mono-text"
            no-caps
            flat
          />

          <!-- Already have account -->
          <p class="login-hint mono-text">
            Alrady have account?
            <button
              type="button"
              class="link-inline"
              @click="goToLogin"
            >
              Login
            </button>
          </p>
        </q-form>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SignUpScene',

  data () {
    return {
      form: {
        name: '',
        email: '',
        dob: '',
        city: ''
      }
    }
  },

  methods: {
    onSubmit () {
      // TODO: валідація + запит на бек
      console.log('sign up form', this.form)
    },
    goBack () {
      this.$router.back();
      // TODO: router.back() або перехід на перший екран
      console.log('go back from signup')
    },
    goToLogin () {
      // TODO: router.push({ name: 'login' })
      console.log('go to login')
    },
    openTerms () {
      // TODO: відкрити сторінку з Terms
      console.log('open terms')
    }
  }
}
</script>

<style lang="scss" scoped>
.signup-wrapper {
  height: 100dvh;
  display: flex;
  justify-content: center;
}

.signup-bg {
  position: relative;
  width: 100%;
  max-width: 440px;
  height: 100dvh;
  background: linear-gradient(
      180deg,
      #101721 0%,
      #12202b 16.7%,
      #142632 35.58%,
      #12212b 57.35%,
      #080c0f 96.63%
  );
  overflow: hidden;
}

.signup-overlay {
  position: absolute;
  inset: 0;
  background: rgba(8, 12, 19, 0.72);
  pointer-events: none;
}

.signup-content {
  position: relative;
  z-index: 1;
  height: 100%;
  padding: 32px 16px;
  display: flex;
  flex-direction: column;
  color: #ffffff;
}

.mono-text {
  font-family: 'JetBrains Mono', monospace;
  font-style: normal;
  font-weight: 400;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  padding: 0;
  color: #d9d9d9;
  font-size: 16px;
  line-height: 21px;
}

.back-icon {
  position: relative;
  width: 9.9px;
  height: 16.97px;
  transform: rotate(360deg); /* щоб стрілка дивилась вліво */
}

.back-line {
  position: absolute;
  width: 2px;
  height: 12px;
  left: 0;
  background: #d9d9d9;
  border-radius: 1px;
}

.back-line-top {
  top: 0;
  transform: rotate(45deg);
}

.back-line-bottom {
  top: 7.07px;
  transform: rotate(-45deg);
}

.back-label {
  font-size: 16px;
}

/* INTRO */

.signup-intro {
margin: 24px auto;
}

.signup-title {
  font-size: 18px;
  line-height: 24px;
  color: #ffffff;
  margin-bottom: 16px;
}

.signup-subtitle {
  font-size: 16px;
  line-height: 21px;
  color: #7e8aa5;
  max-width: 408px;
}

/* FORM */

.signup-form {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.field-list {
  width: 100%;
  max-width: 408px;
}

/* One row like in Figma */

.field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  border-bottom: 1px solid #142632;
}

.field-row--button {
  width: 100%;
  background: none;
  border: none;
  padding-inline: 0;
}

.field-label {
  font-size: 16px;
  line-height: 21px;
  color: #d9d9d9;
}

.field-input {
  flex: 1;
  max-width: 60%;
}

.field-input-inner {
  text-align: right;
  font-size: 16px;
  line-height: 21px;
  color: #444f67;
}

/* Country row */

.field-country-right {
  display: inline-flex;
  align-items: center;
  gap: 16px;
}

.field-country-text {
  font-size: 16px;
  line-height: 21px;
  color: #444f67;
}

/* стрілочка як у Figma (дві маленькі палички) */
.field-country-arrow {
  position: relative;
  width: 9.9px;
  height: 16.97px;
}

.field-country-arrow::before,
.field-country-arrow::after {
  content: "";
  position: absolute;
  width: 2px;
  height: 12px;
  left: 0;
  background: #7e8aa5;
  border-radius: 1px;
}

.field-country-arrow::before {
  top: 9.09px;
  transform: rotate(-135deg);
}

.field-country-arrow::after {
  top: 2.01px;
  transform: rotate(135deg);
}

/* TERMS */

.terms {
  max-width: 386px;
  margin-top: 32px;
  margin-bottom: 24px;
  font-size: 14px;
  line-height: 24px;
  color: #7e8aa5;
}

.link-inline {
  background: none;
  border: none;
  padding: 0;
  margin: 0 0 0 4px;
  font: inherit;
  color: #7e8aa5;
  text-decoration: underline;
}

/* PRIMARY BUTTON */

.primary-btn {
  width: 100%;
  max-width: 408px;
  height: 53px;
  margin-top: 0;
  margin-bottom: 24px;
  background: linear-gradient(
      98.11deg,
      #0c0d0e 14.75%,
      #242c35 54.07%,
      #0c0d0e 89.76%
  );
  border: 1px solid #9fd8f6;
  border-radius: 16px;
  font-size: 16px;
  line-height: 21px;
  color: #d9d9d9;
}

/* LOGIN HINT */

.login-hint {
  font-size: 16px;
  line-height: 24px;
  color: #7e8aa5;
  text-align: center;
}
</style>
