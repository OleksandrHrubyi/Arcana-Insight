<template>
  <q-page class="menu-page">
    <div class="menu-bg" aria-hidden="true"></div>

    <div class="menu-content">
      <header class="menu-hero">
        <div class="menu-hero__text">
          <div class="menu-title">{{ tt('nav.menu') }}</div>
          <div class="menu-kicker">{{ tt('menuPage.subtitle') }}</div>
        </div>
      </header>

      <section class="menu-stack">
        <div class="menu-card">
          <div class="menu-card__header">
            <div class="menu-card__title">
              {{ tt('menuPage.sections.main') }}
            </div>
          </div>
          <q-list class="menu-list">
            <q-item
              v-for="item in mainItems"
              :key="item.key"
              :clickable="!item.disabled"
              v-ripple="!item.disabled"
              class="menu-item"
              :class="{ 'menu-item--disabled': item.disabled }"
              @click="onItemClick(item)"
            >
              <q-item-section avatar class="menu-item__icon-section">
                <div class="menu-icon-wrap">
                  <svg
                    v-if="item.key === 'arcana'"
                    class="menu-icon menu-icon--svg"
                    width="22"
                    height="22"
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <circle cx="16" cy="15" r="12" stroke="currentColor" stroke-width="2" />
                    <path
                      d="M4 16C10.9231 8.24422 20.1538 7.75945 28 16"
                      stroke="currentColor"
                      stroke-width="2"
                    />
                  </svg>
                  <svg
                    v-else-if="item.key === 'horoscope'"
                    class="menu-icon menu-icon--svg"
                    width="22"
                    height="22"
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M27 14V8"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M30 11H24"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M21 3V7"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M23 5H19"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M27.0828 19.0812C25.1198 19.6267 23.0471 19.641 21.0767 19.1228C19.1064 18.6046 17.3089 17.5724 15.8683 16.1317C14.4276 14.6911 13.3954 12.8937 12.8772 10.9233C12.359 8.95291 12.3733 6.88025 12.9188 4.91724L12.9191 4.91733C10.983 5.45595 9.22171 6.49249 7.81085 7.92367C6.39998 9.35486 5.38873 11.1307 4.87785 13.0744C4.36696 15.0181 4.37427 17.0617 4.89905 19.0016C5.42382 20.9416 6.44774 22.7102 7.86881 24.1313C9.28988 25.5523 11.0585 26.5762 12.9985 27.101C14.9384 27.6257 16.982 27.633 18.9257 27.1221C20.8694 26.6112 22.6452 25.5999 24.0764 24.1891C25.5076 22.7782 26.5441 21.0169 27.0827 19.0808L27.0828 19.0812Z"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  <q-icon v-else :name="item.icon" size="22px" class="menu-icon" />
                </div>
              </q-item-section>

              <q-item-section>
                <q-item-label class="menu-label">{{ tt(item.labelKey) }}</q-item-label>
              </q-item-section>

              <q-item-section side class="menu-item__side">
                <div v-if="item.disabled" class="menu-badge">{{ tt('nav.soon') }}</div>
                <q-icon v-else name="chevron_right" size="18px" class="menu-chevron" />
              </q-item-section>
            </q-item>
          </q-list>
        </div>

        <div class="menu-card">
          <div class="menu-card__header">
            <div class="menu-card__title">
              {{ tt('menuPage.sections.support') }}
            </div>
          </div>
          <q-list class="menu-list">
            <q-item
              v-for="item in supportItems"
              :key="item.key"
              clickable
              v-ripple
              class="menu-item"
              @click="onItemClick(item)"
            >
              <q-item-section avatar class="menu-item__icon-section">
                <div class="menu-icon-wrap">
                  <q-icon :name="item.icon" size="22px" class="menu-icon" />
                </div>
              </q-item-section>

              <q-item-section>
                <q-item-label class="menu-label">{{ tt(item.labelKey) }}</q-item-label>
              </q-item-section>

              <q-item-section side class="menu-item__side">
                <q-icon name="chevron_right" size="18px" class="menu-chevron" />
              </q-item-section>
            </q-item>
          </q-list>
        </div>

        <SettingsComponent embedded :show-hero="false" :opaque-sheet="true" />
      </section>
    </div>
  </q-page>
</template>

<script>
import { defineComponent, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { t, currentLocale } from 'src/i18n'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import SettingsComponent from 'components/main/SettingsComponent.vue'

export default defineComponent({
  name: 'MenuComponent',
  components: { SettingsComponent },
  setup() {
    const router = useRouter()
    const selectedLocale = computed(() => currentLocale.value || 'en')
    const tt = (key) => t(selectedLocale.value, key)

    const mainItems = [
      { key: 'arcana', labelKey: 'arcana', icon: 'auto_awesome', routeName: 'arcana' },
      { key: 'horoscope', labelKey: 'horoscope', icon: 'nightlight_round', routeName: 'horoscope' },
      { key: 'tarot', labelKey: 'tarot', icon: 'style', routeName: 'tarot' },
      { key: 'daily', labelKey: 'nav.daily', icon: 'calendar_today', routeName: 'daily' },
      {
        key: 'compatibility',
        labelKey: 'nav.compatibility',
        icon: 'favorite',
        routeName: 'compatibility',
      },
      { key: 'cards', labelKey: 'nav.cards', icon: 'auto_stories', routeName: 'cards' },
      { key: 'zodiacGuide', labelKey: 'nav.zodiacGuide', icon: 'stars', routeName: 'zodiacGuide' },
      { key: 'readings', labelKey: 'nav.readings', icon: 'history', routeName: 'readings' },
      { key: 'premium', labelKey: 'nav.premium', icon: 'workspace_premium', routeName: 'premium' },
    ]

    const supportItems = [
      { key: 'support', labelKey: 'nav.support', icon: 'help_outline', routeName: 'support' },
      { key: 'privacy', labelKey: 'nav.privacy', icon: 'policy', routeName: 'privacyTerms' },
    ]

    async function hapticLight() {
      try {
        await Haptics.impact({ style: ImpactStyle.Light })
      } catch (e) {
        console.error(e)
      }
    }

    async function onItemClick(item) {
      if (item.disabled || !item.routeName) return
      void hapticLight()
      await router.push({ name: item.routeName })
    }

    const setBottomNavDark = (enabled) => {
      if (typeof document === 'undefined') return
      document.body.classList.toggle('cards-nav-dark', enabled)
    }

    onMounted(() => {
      setBottomNavDark(true)
    })

    onBeforeUnmount(() => {
      setBottomNavDark(false)
    })

    return {
      tt,
      mainItems,
      supportItems,
      onItemClick,
    }
  },
})
</script>

<style scoped lang="scss">
.menu-page {
  min-height: 100vh;
  color: #e9edf4;
  position: relative;
  overflow: hidden;
}

.menu-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 40%, #050d15 100%);
  z-index: 0;
}

.menu-content {
  position: relative;
  z-index: 1;
  padding: calc(90px + env(safe-area-inset-top)) 18px calc(32px + env(safe-area-inset-bottom) + 84px);
  max-width: 540px;
  margin: 0 auto;
}

.menu-hero {
  display: grid;
  gap: 6px;
  margin-bottom: 20px;
  text-align: center;
}

.menu-hero__text {
  display: grid;
  gap: 4px;
}

.menu-title {
  font-size: 22px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-weight: 600;
  color: rgba(235, 242, 255, 0.96);
}

.menu-kicker {
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.62);
}

.menu-stack {
  display: grid;
  gap: 18px;
}

.menu-card {
  padding: 0;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: linear-gradient(160deg, rgba(14, 20, 32, 0.92), rgba(6, 10, 18, 0.98));
  box-shadow:
    0 18px 40px rgba(2, 6, 12, 0.52),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(16px) saturate(130%);
  -webkit-backdrop-filter: blur(16px) saturate(130%);
  overflow: hidden;
}

.menu-card__header {
  padding: 18px 18px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.menu-card__title {
  font-size: 10px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.62);
  font-weight: 600;
}

.menu-list {
  display: grid;
  gap: 0;
  padding: 0;
}

.menu-item {
  border-radius: 0;
  padding: 14px 18px;
  min-height: 56px;
  transition: all 180ms ease;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:active:not(.menu-item--disabled) {
  background: rgba(255, 255, 255, 0.05);
}

.menu-item--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.menu-item__icon-section {
  min-width: 40px;
  margin-right: 4px;
}

.menu-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(8, 12, 20, 0.78);
  border: 1px solid rgba(173, 210, 255, 0.16);
}

.menu-item--disabled .menu-icon-wrap {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.06);
}

.menu-icon {
  color: rgba(173, 210, 255, 0.9);
}

.menu-item--disabled .menu-icon {
  color: rgba(214, 225, 242, 0.5);
}

.menu-icon--svg {
  display: block;
}

.menu-icon--svg * {
  stroke: currentColor;
}

.menu-label {
  font-size: 14px;
  letter-spacing: 0.02em;
  font-weight: 500;
  color: rgba(235, 242, 255, 0.92);
}

.menu-item--disabled .menu-label {
  color: rgba(214, 225, 242, 0.6);
}

.menu-item__side {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: auto;
}

.menu-badge {
  font-size: 10px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.5);
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.menu-chevron {
  color: rgba(214, 225, 242, 0.4);
}
</style>
