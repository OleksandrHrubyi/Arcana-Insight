<template>
  <q-page class="policy-page">
    <div class="policy-bg" aria-hidden="true"></div>

    <div class="policy-content">
      <header class="policy-hero policy-hero--with-back">
        <button type="button" class="policy-back" @click="onBack">
          <q-icon name="chevron_left" size="18px" />
        </button>
        <div class="policy-hero__text">
          <div class="policy-title">{{ tt('policyPage.title') }}</div>
          <div class="policy-kicker">{{ tt('policyPage.subtitle') }}</div>
        </div>
      </header>

      <section class="policy-card">
        <div class="policy-card__title">{{ tt('policyPage.privacyTitle') }}</div>
        <p class="policy-text">{{ tt('policyPage.privacyText1') }}</p>
        <p class="policy-text">{{ tt('policyPage.privacyText2') }}</p>
        <p class="policy-text">{{ tt('policyPage.privacyText3') }}</p>
      </section>

      <section class="policy-card">
        <div class="policy-card__title">{{ tt('policyPage.termsTitle') }}</div>
        <p class="policy-text">{{ tt('policyPage.termsText1') }}</p>
        <p class="policy-text">{{ tt('policyPage.termsText2') }}</p>
        <p class="policy-text">{{ tt('policyPage.termsText3') }}</p>
      </section>

      <section class="policy-card policy-card--note">
        <div class="policy-card__title">{{ tt('policyPage.contactTitle') }}</div>
        <p class="policy-text">{{ tt('policyPage.contactText') }}</p>
      </section>
    </div>
  </q-page>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { t, currentLocale } from 'src/i18n'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'

const locale = computed(() => currentLocale.value || 'en')
const tt = (key) => t(locale.value, key)
const router = useRouter()

const hapticTap = async () => {
  if (!Capacitor.isNativePlatform()) return
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch (e) {
    console.error(e)
  }
}

const onBack = async () => {
  await hapticTap()
  router.back()
}
</script>

<style scoped lang="scss">
.policy-page {
  min-height: 100vh;
  color: #e9edf4;
  position: relative;
  overflow: hidden;
}

.policy-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 40%, #050d15 100%);
  z-index: 0;
}

.policy-content {
  position: relative;
  z-index: 1;
  padding: calc(90px + env(safe-area-inset-top)) 18px 90px;
  max-width: 560px;
  margin: 0 auto;
  display: grid;
  gap: 16px;
}

.policy-hero {
  display: grid;
  gap: 3px;
}

.policy-hero--with-back {
  position: relative;
  grid-template-columns: 1fr;
  align-items: center;
  justify-items: center;
  gap: 10px;
}

.policy-hero__text {
  text-align: center;
  display: grid;
  gap: 3px;
  justify-items: center;
  padding: 0 44px;
}

.policy-title {
  font-size: 18px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.policy-kicker {
  font-size: 9px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.6);
}

.policy-back {
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

.policy-card {
  padding: 16px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(11, 15, 24, 0.8);
  box-shadow:
    0 18px 40px rgba(2, 6, 12, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  display: grid;
  gap: 8px;
}

.policy-card__title {
  font-size: 10px;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.62);
}

.policy-text {
  font-size: 13px;
  line-height: 1.55;
  color: rgba(214, 225, 242, 0.8);
  margin: 0;
}

.policy-card--note {
  background: rgba(8, 12, 20, 0.75);
}
</style>
