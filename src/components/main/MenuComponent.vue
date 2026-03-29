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
        <button type="button" class="menu-daily-launcher" @click="onDailyLauncherClick">
          <span class="menu-daily-launcher__copy">
            <span class="menu-daily-launcher__eyebrow">{{ tt('menuPage.dailyLauncher.eyebrow') }}</span>
            <span class="menu-daily-launcher__title">{{ tt(dailyLauncherTitleKey) }}</span>
            <span class="menu-daily-launcher__hint">{{ tt(dailyLauncherHintKey) }}</span>
            <span class="menu-daily-launcher__cta">
              <span>{{ tt(dailyLauncherCtaKey) }}</span>
              <q-icon name="chevron_right" size="16px" />
            </span>
          </span>

          <span class="menu-daily-launcher__visual">
            <span
              class="menu-daily-card"
              :class="{
                'menu-daily-card--opened': hasDailyCardToday,
                'menu-daily-card--reversed': dailyCardOrientation === 'reversed',
              }"
            >
              <img
                v-if="hasDailyCardToday && dailyCardImage"
                class="menu-daily-card__img"
                :src="dailyCardImage"
                :alt="dailyCardTitle"
              />
              <span v-else class="menu-daily-card__back" aria-hidden="true">
                <img class="menu-daily-card__back-logo" :src="menuDailyBackLogo" alt="" />
              </span>
            </span>

            <span v-if="dailyLauncherCardTitle" class="menu-daily-launcher__card-title">
              {{ dailyLauncherCardTitle }}
            </span>
          </span>
        </button>

        <div v-if="personalizedItems.length" class="menu-card">
          <div class="menu-card__header">
            <div class="menu-card__title">
              {{ tt('menuPage.sections.personalized') }}
            </div>
            <div class="menu-card__subtitle">
              {{ tt('menuPage.personalizedHint') }}
            </div>
          </div>
          <q-list class="menu-list">
            <q-item
              v-for="item in personalizedItems"
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
                <q-item-label caption class="menu-label-hint">{{ tt(item.hintKey) }}</q-item-label>
              </q-item-section>

              <q-item-section side class="menu-item__side">
                <q-icon name="chevron_right" size="18px" class="menu-chevron" />
              </q-item-section>
            </q-item>
          </q-list>
        </div>

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
import { defineComponent, computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { t, currentLocale } from 'src/i18n'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import logo from 'src/assets/images/logo.svg'
import SettingsComponent from 'components/main/SettingsComponent.vue'
import {
  ONBOARDING_INTERESTS_KEY,
  ONBOARDING_PREFERENCES_UPDATED_EVENT,
  readOnboardingInterests,
} from 'src/helpers/onboardingPrefs'
import { useAuthStore } from 'stores/authStore'
import { loadDailyCardsSnapshot } from 'src/helpers/dailyCardCore'
import { loadTarotData } from 'src/helpers/tarotData'
import { DAILY_ACTIVITY_KEYS, hasDailyActivityToday, getLocalDateKey } from 'src/helpers/dailyRitual'
import { analytics } from 'src/services/analytics'
import { ONBOARDING_EVENTS } from 'src/constants/analyticsEvents'

export default defineComponent({
  name: 'MenuComponent',
  components: { SettingsComponent },
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    const selectedLocale = computed(() => currentLocale.value || 'en')
    const tt = (key) => t(selectedLocale.value, key)
    const menuDailyBackLogo = logo
    const ANON_DAILY_SEED_KEY = 'arcana_daily_seed_v1'
    const hasDailyCardToday = ref(false)
    const dailyCards = ref([])
    const personalizedInterests = ref(readOnboardingInterests())

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
      { key: 'rewards', labelKey: 'nav.rewards', icon: 'redeem', routeName: 'ritualRewards' },
      { key: 'premium', labelKey: 'nav.premium', icon: 'workspace_premium', routeName: 'premium' },
    ]

    const fallbackPersonalizedInterests = ['energy', 'self', 'love']
    const personalizedEntryMap = {
      love: {
        key: 'focus-love',
        icon: 'favorite',
        labelKey: 'onboardingPage.interests.love',
        hintKey: 'menuPage.personalizedHints.love',
        routeName: 'tarot',
        query: { focus: 'love', source: 'menu_interest_love', entry: 'personalized' },
      },
      career: {
        key: 'focus-career',
        icon: 'work_outline',
        labelKey: 'onboardingPage.interests.career',
        hintKey: 'menuPage.personalizedHints.career',
        routeName: 'horoscope',
        query: { theme: 'career', source: 'menu_interest_career', entry: 'personalized' },
      },
      money: {
        key: 'focus-money',
        icon: 'payments',
        labelKey: 'onboardingPage.interests.money',
        hintKey: 'menuPage.personalizedHints.money',
        routeName: 'tarot',
        query: { focus: 'money', source: 'menu_interest_money', entry: 'personalized' },
      },
      self: {
        key: 'focus-self',
        icon: 'self_improvement',
        labelKey: 'onboardingPage.interests.self',
        hintKey: 'menuPage.personalizedHints.self',
        routeName: 'daily',
        query: { source: 'menu_interest_self', entry: 'personalized' },
      },
      energy: {
        key: 'focus-energy',
        icon: 'bolt',
        labelKey: 'onboardingPage.interests.energy',
        hintKey: 'menuPage.personalizedHints.energy',
        routeName: 'horoscope',
        query: { theme: 'energy', source: 'menu_interest_energy', entry: 'personalized' },
      },
      future: {
        key: 'focus-future',
        icon: 'travel_explore',
        labelKey: 'onboardingPage.interests.future',
        hintKey: 'menuPage.personalizedHints.future',
        routeName: 'tarot',
        query: { focus: 'future', source: 'menu_interest_future', entry: 'personalized' },
      },
    }

    const personalizedItems = computed(() => {
      const source = personalizedInterests.value.length
        ? personalizedInterests.value
        : fallbackPersonalizedInterests
      const out = []
      for (const interest of source) {
        const item = personalizedEntryMap[interest]
        if (!item) continue
        if (out.some((entry) => entry.key === item.key)) continue
        out.push(item)
        if (out.length >= 3) break
      }
      return out
    })

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
      if (item.query) {
        await router.push({ name: item.routeName, query: item.query })
        return
      }
      if (item.routeName === 'premium') {
        await router.push({ name: item.routeName, query: { source: 'menu_premium', entry: 'secondary' } })
        return
      }
      await router.push({ name: item.routeName })
    }

    const hashString = (value) => {
      let hash = 0
      const raw = String(value || '')
      for (let i = 0; i < raw.length; i += 1) {
        hash = (hash * 31 + raw.charCodeAt(i)) >>> 0
      }
      return hash
    }

    const getOrCreateAnonSeed = () => {
      if (typeof window === 'undefined') return 'anon'
      const stored = localStorage.getItem(ANON_DAILY_SEED_KEY)
      if (stored) return stored

      const next =
        (window.crypto &&
          typeof window.crypto.randomUUID === 'function' &&
          window.crypto.randomUUID()) ||
        `${Date.now()}-${Math.random().toString(36).slice(2)}`

      localStorage.setItem(ANON_DAILY_SEED_KEY, next)
      return next
    }

    const dailySeed = computed(() => {
      const userId = authStore.state.user?.id
      const identity = userId || getOrCreateAnonSeed()
      return `${getLocalDateKey()}::${identity}`
    })

    const dailyIndex = computed(() => {
      if (!dailyCards.value.length) return 0
      const hash = hashString(`${dailySeed.value}::card`)
      return hash % dailyCards.value.length
    })

    const dailyCardOrientation = computed(() => {
      const hash = hashString(`${dailySeed.value}::orientation`)
      return hash % 2 === 0 ? 'upright' : 'reversed'
    })

    const dailyCard = computed(() => dailyCards.value[dailyIndex.value] || null)
    const dailyCardImage = computed(() => {
      const file = dailyCard.value?.file
      return file ? `/images/cards/${file}` : ''
    })
    const dailyCardTitle = computed(
      () =>
        dailyCard.value?.name?.[selectedLocale.value] ||
        dailyCard.value?.name?.en ||
        tt('menuPage.dailyLauncher.fallbackCardTitle'),
    )
    const dailyLauncherCardTitle = computed(() => (hasDailyCardToday.value ? dailyCardTitle.value : ''))
    const dailyLauncherTitleKey = computed(() =>
      hasDailyCardToday.value
        ? 'menuPage.dailyLauncher.openTitle'
        : 'menuPage.dailyLauncher.closedTitle',
    )
    const dailyLauncherHintKey = computed(() =>
      hasDailyCardToday.value
        ? 'menuPage.dailyLauncher.openHint'
        : 'menuPage.dailyLauncher.closedHint',
    )
    const dailyLauncherCtaKey = computed(() =>
      hasDailyCardToday.value
        ? 'menuPage.dailyLauncher.ctaOpen'
        : 'menuPage.dailyLauncher.ctaClosed',
    )

    const refreshDailyLauncherState = () => {
      hasDailyCardToday.value = hasDailyActivityToday(DAILY_ACTIVITY_KEYS.dailyCard)
    }

    const refreshPersonalizedInterests = () => {
      personalizedInterests.value = readOnboardingInterests()
    }

    const initializeDailyPreview = async () => {
      const { cards } = await loadDailyCardsSnapshot({ loadTarotData })
      dailyCards.value = cards
    }

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      refreshDailyLauncherState()
      refreshPersonalizedInterests()
    }

    const onStorageChange = (event) => {
      if (!event?.key || event.key === ONBOARDING_INTERESTS_KEY) {
        refreshPersonalizedInterests()
      }
    }

    const onOnboardingPreferencesUpdated = () => {
      refreshPersonalizedInterests()
    }

    async function onDailyLauncherClick() {
      void hapticLight()
      void analytics.logEvent(ONBOARDING_EVENTS.firstActionClick, {
        source: 'menu_daily_launcher',
        had_daily_card_today: hasDailyCardToday.value,
      })
      await router.push({
        name: 'daily',
        query: { source: 'menu_daily_launcher', entry: 'menu_launcher' },
      })
    }

    const setBottomNavDark = (enabled) => {
      if (typeof document === 'undefined') return
      document.body.classList.toggle('cards-nav-dark', enabled)
    }

    onMounted(() => {
      setBottomNavDark(true)
      refreshDailyLauncherState()
      refreshPersonalizedInterests()
      void initializeDailyPreview()
      window.addEventListener('focus', refreshDailyLauncherState, { passive: true })
      window.addEventListener('focus', refreshPersonalizedInterests, { passive: true })
      window.addEventListener('storage', onStorageChange)
      window.addEventListener(ONBOARDING_PREFERENCES_UPDATED_EVENT, onOnboardingPreferencesUpdated)
      document.addEventListener('visibilitychange', onVisibilityChange, { passive: true })
    })

    onBeforeUnmount(() => {
      setBottomNavDark(false)
      window.removeEventListener('focus', refreshDailyLauncherState)
      window.removeEventListener('focus', refreshPersonalizedInterests)
      window.removeEventListener('storage', onStorageChange)
      window.removeEventListener(ONBOARDING_PREFERENCES_UPDATED_EVENT, onOnboardingPreferencesUpdated)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    })

    return {
      tt,
      personalizedItems,
      mainItems,
      supportItems,
      onItemClick,
      onDailyLauncherClick,
      menuDailyBackLogo,
      hasDailyCardToday,
      dailyCardImage,
      dailyCardTitle,
      dailyLauncherCardTitle,
      dailyCardOrientation,
      dailyLauncherTitleKey,
      dailyLauncherHintKey,
      dailyLauncherCtaKey,
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

.menu-daily-launcher {
  width: 100%;
  border: 1px solid rgba(163, 212, 255, 0.24);
  border-radius: 20px;
  background:
    radial-gradient(120% 160% at 100% 0%, rgba(125, 188, 255, 0.28) 0%, rgba(125, 188, 255, 0) 62%),
    linear-gradient(164deg, rgba(11, 18, 30, 0.96), rgba(7, 12, 22, 0.99));
  box-shadow:
    0 20px 44px rgba(2, 7, 14, 0.58),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  padding: 18px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  text-align: left;
  color: inherit;
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}

.menu-daily-launcher:active {
  transform: translateY(1px) scale(0.996);
  border-color: rgba(191, 225, 255, 0.32);
  box-shadow:
    0 16px 32px rgba(2, 7, 14, 0.56),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.menu-daily-launcher__copy {
  display: grid;
  gap: 8px;
}

.menu-daily-launcher__eyebrow {
  font-size: 10px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  font-weight: 600;
  color: rgba(189, 220, 245, 0.72);
}

.menu-daily-launcher__title {
  font-size: 17px;
  line-height: 1.3;
  letter-spacing: 0.01em;
  font-weight: 600;
  color: rgba(237, 244, 255, 0.98);
}

.menu-daily-launcher__hint {
  font-size: 13px;
  line-height: 1.42;
  color: rgba(213, 226, 242, 0.78);
}

.menu-daily-launcher__cta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  font-weight: 600;
  color: rgba(188, 222, 255, 0.9);
}

.menu-daily-launcher__visual {
  width: 98px;
  display: grid;
  gap: 7px;
  justify-items: center;
}

.menu-daily-card {
  width: 72px;
  aspect-ratio: 0.64 / 1;
  border-radius: 12px;
  border: 1px solid rgba(176, 210, 242, 0.34);
  overflow: hidden;
  box-shadow:
    0 14px 24px rgba(1, 5, 10, 0.52),
    0 0 0 1px rgba(255, 255, 255, 0.03) inset;
  background:
    radial-gradient(circle at 20% 0%, rgba(157, 210, 255, 0.2), rgba(11, 18, 28, 0) 55%),
    linear-gradient(160deg, #16324a, #0b1726 56%, #08111c);
  transform: rotate(-8deg);
  transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease;
}

.menu-daily-card__back {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: rgba(205, 232, 255, 0.9);
}

.menu-daily-card__back-logo {
  width: 50px;
  height: 50px;
  opacity: 0.98;
  filter: drop-shadow(0 3px 9px rgba(3, 8, 15, 0.56));
}

.menu-daily-card--opened {
  transform: rotate(-2deg);
  border-color: rgba(219, 234, 255, 0.56);
  box-shadow:
    0 18px 30px rgba(1, 5, 10, 0.58),
    0 0 26px rgba(131, 198, 255, 0.24),
    0 0 0 1px rgba(255, 255, 255, 0.08) inset;
}

.menu-daily-card--reversed .menu-daily-card__img {
  transform: rotate(180deg);
}

.menu-daily-card__img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  transition: transform 220ms ease;
}

.menu-daily-launcher__card-title {
  width: 100%;
  max-width: 96px;
  text-align: center;
  font-size: 10px;
  line-height: 1.35;
  color: rgba(204, 220, 242, 0.82);
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

.menu-card__subtitle {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.45;
  color: rgba(214, 225, 242, 0.76);
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

.menu-label-hint {
  margin-top: 2px;
  color: rgba(214, 225, 242, 0.66);
  font-size: 12px;
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
