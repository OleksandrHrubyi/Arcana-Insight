<template>
  <q-page class="menu-page">
    <div class="menu-bg" aria-hidden="true"></div>

    <div class="menu-content">
      <header class="menu-hero">
        <div class="menu-title">{{ tt('nav.menu') }}</div>
        <div class="menu-kicker">{{ tt('menuPage.subtitle') }}</div>
      </header>

      <section class="menu-stack">
        <div class="menu-card">
          <div class="menu-card__title">
            {{ tt('menuPage.sections.main') }}
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
              <q-item-section avatar class="row items-center justify-center">
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
                  <path d="M27 14V8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M30 11H24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M21 3V7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M23 5H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  <path
                    d="M27.0828 19.0812C25.1198 19.6267 23.0471 19.641 21.0767 19.1228C19.1064 18.6046 17.3089 17.5724 15.8683 16.1317C14.4276 14.6911 13.3954 12.8937 12.8772 10.9233C12.359 8.95291 12.3733 6.88025 12.9188 4.91724L12.9191 4.91733C10.983 5.45595 9.22171 6.49249 7.81085 7.92367C6.39998 9.35486 5.38873 11.1307 4.87785 13.0744C4.36696 15.0181 4.37427 17.0617 4.89905 19.0016C5.42382 20.9416 6.44774 22.7102 7.86881 24.1313C9.28988 25.5523 11.0585 26.5762 12.9985 27.101C14.9384 27.6257 16.982 27.633 18.9257 27.1221C20.8694 26.6112 22.6452 25.5999 24.0764 24.1891C25.5076 22.7782 26.5441 21.0169 27.0827 19.0808L27.0828 19.0812Z"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <q-icon v-else :name="item.icon" size="20px" class="menu-icon" />
              </q-item-section>

              <q-item-section>
                <q-item-label class="menu-label">{{ tt(item.labelKey) }}</q-item-label>
              </q-item-section>

              <q-item-section side class="row items-center no-wrap menu-side">
                <div v-if="item.disabled" class="menu-meta">{{ tt('nav.soon') }}</div>
                <q-icon
                  v-else
                  name="chevron_right"
                  size="18px"
                  class="menu-chevron"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </div>

        <div class="menu-card">
          <div class="menu-card__title">
            {{ tt('menuPage.sections.support') }}
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
              <q-item-section avatar class="row items-center justify-center">
                <q-icon :name="item.icon" size="20px" class="menu-icon" />
              </q-item-section>

              <q-item-section>
                <q-item-label class="menu-label">{{ tt(item.labelKey) }}</q-item-label>
              </q-item-section>

              <q-item-section side class="row items-center no-wrap menu-side">
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
      { key: 'compatibility', labelKey: 'nav.compatibility', icon: 'favorite', routeName: 'compatibility' },
      { key: 'cards', labelKey: 'nav.cards', icon: 'auto_stories', routeName: 'cards' },
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
  }
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
  padding: calc(90px + env(safe-area-inset-top)) 20px 90px;
}

.menu-hero {
  display: grid;
  gap: 3px;
  margin-bottom: 14px;
}

.menu-title {
  font-size: 18px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.menu-kicker {
  font-size: 9px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.64);
}

.menu-stack {
  display: grid;
  gap: 16px;
}

.menu-card {
  padding: 16px 14px 8px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(11, 15, 24, 0.6);
  box-shadow:
    0 18px 40px rgba(2, 6, 12, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(16px) saturate(130%);
  -webkit-backdrop-filter: blur(16px) saturate(130%);
}

.menu-card__title {
  font-size: 11px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.62);
  padding: 0 4px 10px;
}

.menu-list {
  display: grid;
  gap: 4px;
}

.menu-item {
  border-radius: 12px;
  padding: 10px 8px;
  transition: background 220ms ease;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.03);
}

.menu-item--disabled {
  opacity: 0.55;
}

.menu-icon {
  color: rgba(210, 222, 244, 0.82);
}

.menu-icon--svg * {
  stroke: currentColor;
}

.menu-label {
  font-size: 13px;
  letter-spacing: 0.01em;
}

.menu-side {
  gap: 6px;
}

.menu-meta {
  font-size: 10px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: rgba(210, 222, 244, 0.55);
}

.menu-chevron {
  color: rgba(214, 225, 242, 0.5);
}

</style>
