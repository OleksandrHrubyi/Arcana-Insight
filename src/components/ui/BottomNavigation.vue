<template>
  <nav ref="navEl" class="nav-pill" aria-label="Main navigation">
    <!-- Sliding active indicator -->
    <span
      v-show="activeIndex >= 0"
      class="nav-indicator"
      :style="{ transform: `translateX(${Math.max(activeIndex, 0) * 100}%)`, width: `calc(${100 / items.length}% - 2px)` }"
      aria-hidden="true"
    ></span>

    <button
      v-for="(item, idx) in items"
      :key="item.name"
      class="nav-tab"
      :class="{ 'nav-tab--active': current === item.name }"
      type="button"
      :aria-label="tt(item.labelKey)"
      :aria-current="current === item.name ? 'page' : undefined"
      @click="onClick(item.name, idx, $event)"
    >
      <span class="nav-tab__icon">
        <!-- Home -->
        <template v-if="item.name === 'arcana'">
          <svg class="nav-tab__svg nav-tab__svg--outline" viewBox="0 0 28 28" fill="none">
            <path d="M14 4.5v2M14 21.5v2M4.5 14h2M21.5 14h2M7.2 7.2l1.4 1.4M19.4 19.4l1.4 1.4M7.2 20.8l1.4-1.4M19.4 8.6l1.4-1.4"
              stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <circle cx="14" cy="14" r="4.5" stroke="currentColor" stroke-width="1.8"/>
          </svg>
          <svg class="nav-tab__svg nav-tab__svg--filled" viewBox="0 0 28 28" fill="none">
            <defs>
              <linearGradient :id="gradId('arc')" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#e6f0ff"/>
                <stop offset="100%" stop-color="#8ca8ff"/>
              </linearGradient>
            </defs>
            <path d="M14 4.5v2M14 21.5v2M4.5 14h2M21.5 14h2M7.2 7.2l1.4 1.4M19.4 19.4l1.4 1.4M7.2 20.8l1.4-1.4M19.4 8.6l1.4-1.4"
              :stroke="`url(#${gradId('arc')})`" stroke-width="2" stroke-linecap="round"/>
            <circle cx="14" cy="14" r="4.5" :fill="`url(#${gradId('arc')})`"/>
          </svg>
        </template>

        <!-- Sky (astronomy detail) -->
        <template v-else-if="item.name === 'sky'">
          <svg class="nav-tab__svg nav-tab__svg--outline" viewBox="0 0 28 28" fill="none">
            <path d="M21 15.5A8 8 0 0 1 12.5 7a8 8 0 1 0 8.5 8.5z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
            <path d="M20 6l.6 1.4L22 8l-1.4.6L20 10l-.6-1.4L18 8l1.4-.6z" fill="currentColor" opacity="0.6"/>
          </svg>
          <svg class="nav-tab__svg nav-tab__svg--filled" viewBox="0 0 28 28" fill="none">
            <defs>
              <linearGradient :id="gradId('hor')" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#d9e5ff"/>
                <stop offset="100%" stop-color="#7890e0"/>
              </linearGradient>
            </defs>
            <path d="M21 15.5A8 8 0 0 1 12.5 7a8 8 0 1 0 8.5 8.5z" :fill="`url(#${gradId('hor')})`"/>
            <path d="M20 5.5l.7 1.6L22.3 8l-1.6.9L20 10.5l-.7-1.6L17.7 8l1.6-.9z" fill="#fff"/>
            <circle cx="23" cy="12" r="0.9" fill="#fff"/>
          </svg>
        </template>

        <!-- Readings (tarot, horoscope, card of the day) -->
        <template v-else-if="item.name === 'readingsHub'">
          <svg class="nav-tab__svg nav-tab__svg--outline" viewBox="0 0 28 28" fill="none">
            <rect x="9" y="5" width="11" height="17" rx="2.2" stroke="currentColor" stroke-width="1.8" transform="rotate(-8 14.5 13.5)"/>
            <path d="M14.5 12l0.9 2 2 0.3-1.45 1.4.35 2-1.8-1-1.8 1 .35-2L11.6 14.3l2-.3z"
              stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" transform="rotate(-8 14.5 13.5)"/>
          </svg>
          <svg class="nav-tab__svg nav-tab__svg--filled" viewBox="0 0 28 28" fill="none">
            <defs>
              <linearGradient :id="gradId('tar')" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#8ca8ff"/>
                <stop offset="100%" stop-color="#3d52a8"/>
              </linearGradient>
            </defs>
            <rect x="9" y="5" width="11" height="17" rx="2.2" :fill="`url(#${gradId('tar')})`" transform="rotate(-8 14.5 13.5)"/>
            <path d="M14.5 11l1 2.2 2.3.35-1.65 1.6.4 2.3-2.05-1.1-2.05 1.1.4-2.3-1.65-1.6 2.3-.35z"
              fill="#fff" transform="rotate(-8 14.5 13.5)"/>
          </svg>
        </template>

        <!-- Menu -->
        <template v-else-if="item.name === 'menu'">
          <svg class="nav-tab__svg nav-tab__svg--outline" viewBox="0 0 28 28" fill="none">
            <rect x="5.5" y="5.5" width="7" height="7" rx="2" stroke="currentColor" stroke-width="1.8"/>
            <rect x="15.5" y="5.5" width="7" height="7" rx="2" stroke="currentColor" stroke-width="1.8"/>
            <rect x="5.5" y="15.5" width="7" height="7" rx="2" stroke="currentColor" stroke-width="1.8"/>
            <rect x="15.5" y="15.5" width="7" height="7" rx="2" stroke="currentColor" stroke-width="1.8"/>
          </svg>
          <svg class="nav-tab__svg nav-tab__svg--filled" viewBox="0 0 28 28" fill="none">
            <defs>
              <linearGradient :id="gradId('men')" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#a5b9ff"/>
                <stop offset="100%" stop-color="#5c7ae8"/>
              </linearGradient>
            </defs>
            <rect x="5.5" y="5.5" width="7" height="7" rx="2" :fill="`url(#${gradId('men')})`"/>
            <rect x="15.5" y="5.5" width="7" height="7" rx="2" :fill="`url(#${gradId('men')})`"/>
            <rect x="5.5" y="15.5" width="7" height="7" rx="2" :fill="`url(#${gradId('men')})`"/>
            <rect x="15.5" y="15.5" width="7" height="7" rx="2" :fill="`url(#${gradId('men')})`"/>
          </svg>
        </template>
      </span>

      <span class="nav-tab__label">{{ tt(item.labelKey) }}</span>
    </button>
  </nav>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { t, currentLocale } from 'src/i18n'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { isNavigationHapticsSuppressed } from 'src/helpers/navigationHaptics'

const emit = defineEmits(['change'])
const route = useRoute()
const router = useRouter()

const navEl = ref(null)
const current = ref('arcana')
const selectedLocale = computed(() => currentLocale.value || 'en')

const items = [
  { name: 'arcana',   labelKey: 'nav.home' },
  { name: 'sky',      labelKey: 'nav.sky' },
  { name: 'readingsHub', labelKey: 'nav.readingsHub' },
  { name: 'menu',     labelKey: 'nav.menu' },
]

// Unique ID suffix so multiple instances of the component don't collide with gradient IDs
const uid = Math.random().toString(36).slice(2, 8)
const gradId = (key) => `nav-grad-${key}-${uid}`

// -1 when no tab is active (e.g. on a sub-page). The indicator is v-show-hidden in
// that case — previously this fell back to 0, parking the pill under Home so Home
// looked selected on pages that should highlight nothing.
const activeIndex = computed(() => items.findIndex((it) => it.name === current.value))

const tt = (key) => t(selectedLocale.value, key)

async function hapticLight() {
  if (isNavigationHapticsSuppressed()) return
  try { await Haptics.impact({ style: ImpactStyle.Light }) } catch { /* */ }
}

function isNavTapLocked() {
  if (typeof document === 'undefined') return false
  if (document.body.classList.contains('hide-bottom-nav')) return true
  const lockUntil = Number(document.body.dataset.navTapLockUntil || 0)
  return Number.isFinite(lockUntil) && Date.now() < lockUntil
}

function emitSparkles(tabEl) {
  if (!navEl.value || !tabEl) return
  const navRect = navEl.value.getBoundingClientRect()
  const tabRect = tabEl.getBoundingClientRect()
  const cx = tabRect.left - navRect.left + tabRect.width / 2
  const cy = tabRect.top - navRect.top + tabRect.height / 2 - 6

  for (let i = 0; i < 6; i++) {
    const s = document.createElement('span')
    s.className = 'nav-sparkle'
    s.style.left = cx + 'px'
    s.style.top = cy + 'px'
    const angle = (Math.PI * 2 * i) / 6 + (Math.random() * 0.5)
    const dist = 16 + Math.random() * 10
    s.style.setProperty('--dx', Math.cos(angle) * dist + 'px')
    s.style.setProperty('--dy', Math.sin(angle) * dist + 'px')
    navEl.value.appendChild(s)
    requestAnimationFrame(() => s.classList.add('nav-sparkle--animate'))
    setTimeout(() => s.remove(), 700)
  }
}

async function onClick(name, idx, event) {
  if (isNavTapLocked()) return
  void hapticLight()
  // Skip only when already ON that tab's root route — NOT merely when the tab is
  // highlighted. Menu sub-pages (compatibility, cards, …) set meta.tab:'menu', so
  // current.value is 'menu' there; guarding on current.value trapped the user
  // (tapping Menu did nothing). Guarding on route.name lets them reach /menu.
  if (name === route.name) return
  current.value = name
  emit('change', name)
  // Sparkle feedback on tap
  const btn = event?.currentTarget
  if (btn) emitSparkles(btn)
  try { await router.push({ name }) } catch { /* */ }
}

watch(
  () => route.name,
  // Highlight a tab ONLY when you're actually on that tab's own root route — not on
  // sub-pages that merely belong to its section. (Tab names match the four top-level
  // route names.) So /compatibility, /cards, /readings, … light nothing; Menu lights
  // only on /menu itself. Pairs with onClick guarding on route.name so the tap still
  // navigates to the section root.
  () => { current.value = items.some((it) => it.name === route.name) ? route.name : '' },
  { immediate: true }
)
</script>

<style scoped>
/* ═══ Premium glass tab bar — Arcana Insight ═══ */
/* Палітра узгоджена з темою проекту: deep navy/teal фон, cool periwinkle акцент */

.nav-pill {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;

  max-width: 396px;
  margin: 0 auto;
  width: calc(100% - 16px);
  padding: 5px;
  border-radius: 26px;
  isolation: isolate;
  pointer-events: auto;
  overflow: hidden;

  /* Outer frame — darker telegram-like navy glass */
  background:
    linear-gradient(180deg, rgba(150, 181, 230, 0.14) 0%, rgba(48, 70, 108, 0.04) 100%);
  border: 1px solid rgba(138, 170, 219, 0.14);
  box-shadow:
    0 20px 42px rgba(0, 0, 0, 0.5),
    0 6px 18px rgba(0, 0, 0, 0.2),
    0 0 28px rgba(48, 82, 138, 0.1);
}

/* Inner glass layer — deep navy to match page background */
.nav-pill::before {
  content: '';
  position: absolute;
  inset: 3px;
  border-radius: 23px;
  pointer-events: none;
  z-index: 0;
  background:
    linear-gradient(180deg, rgba(12, 20, 31, 0.88) 0%, rgba(6, 11, 18, 0.96) 100%);
  backdrop-filter: blur(26px) saturate(135%);
  -webkit-backdrop-filter: blur(26px) saturate(135%);
  box-shadow:
    inset 0 1px 0 rgba(184, 208, 236, 0.04),
    inset 0 -1px 0 rgba(0, 0, 0, 0.42);
}

.nav-pill::after {
  content: '';
  position: absolute;
  left: 14px;
  right: 14px;
  top: 0;
  height: 1px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(214, 228, 247, 0.28) 50%, rgba(255, 255, 255, 0) 100%);
  pointer-events: none;
  opacity: 0.8;
}

/* ─── Sliding active indicator (the "pill" that moves) ─── */
.nav-indicator {
  position: absolute;
  top: 8px;
  left: 5px;
  height: calc(100% - 16px);
  border-radius: 18px;
  pointer-events: none;
  z-index: 1;

  background:
    radial-gradient(circle at 50% 0%, rgba(121, 169, 227, 0.2), transparent 70%),
    linear-gradient(180deg, rgba(96, 139, 194, 0.16) 0%, rgba(44, 74, 116, 0.08) 100%);
  border: 1px solid rgba(133, 178, 228, 0.14);
  box-shadow:
    inset 0 1px 0 rgba(206, 225, 246, 0.06),
    0 4px 14px rgba(30, 60, 103, 0.24);

  transition: transform 0.5s cubic-bezier(0.34, 1.3, 0.64, 1);
}

/* Glowing top line above the active tab */
.nav-indicator::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 26px;
  height: 3px;
  background: linear-gradient(90deg, transparent, #89b0de 50%, transparent);
  border-radius: 999px;
  box-shadow: 0 0 10px rgba(104, 151, 207, 0.34), 0 0 18px rgba(104, 151, 207, 0.2);
}

/* ─── Tabs ─── */
.nav-tab {
  position: relative;
  z-index: 2;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;

  flex: 1;
  min-width: 0;
  min-height: 54px;
  padding: 5px 2px 3px;
  border-radius: 14px;

  background: none;
  border: 0;
  outline: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  user-select: none;

  /* 0.62 alpha ≈ 5.1:1 contrast over the #0b1220 glass (AA needs 4.5:1 for the
     11px labels; the previous 0.42 measured ~3.0:1 — unreadable in daylight). */
  color: rgba(194, 206, 224, 0.62);
  transition:
    color 220ms ease,
    transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.nav-tab:active { transform: scale(0.9); }

.nav-tab--active { color: #c9ddf6; }

/* ─── Icons (outline → filled morph) ─── */
.nav-tab__icon {
  position: relative;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.nav-tab__svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transition: opacity 0.35s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.nav-tab__svg--outline { opacity: 1; }

.nav-tab__svg--filled {
  opacity: 0;
  transform: scale(0.7);
}

.nav-tab--active .nav-tab__icon {
  transform: translateY(-1px) scale(1.08);
}

.nav-tab--active .nav-tab__svg--outline { opacity: 0; }

.nav-tab--active .nav-tab__svg--filled {
  opacity: 1;
  transform: scale(1);
  filter: drop-shadow(0 0 7px rgba(118, 162, 214, 0.34));
}

/* ─── Label ─── */
.nav-tab__label {
  position: relative;
  font-size: 11px;
  line-height: 1;
  font-weight: 500;
  letter-spacing: 0.1px;
  white-space: nowrap;
  transition: color 220ms ease, font-weight 220ms ease;
}

.nav-tab--active .nav-tab__label {
  font-weight: 600;
}

.nav-tab:focus-visible {
  color: #c9ddf6;
}

/* ─── Sparkle particles on tap ─── */
:global(.nav-sparkle) {
  position: absolute;
  width: 4px;
  height: 4px;
  background: #89b0de;
  border-radius: 50%;
  pointer-events: none;
  opacity: 0;
  box-shadow: 0 0 8px rgba(118, 162, 214, 0.38);
  z-index: 3;
}

:global(.nav-sparkle--animate) {
  animation: nav-sparkle-out 0.6s cubic-bezier(0.25, 0.8, 0.3, 1) forwards;
}

@keyframes nav-sparkle-out {
  0% { opacity: 1; transform: translate(0, 0) scale(0.5); }
  50% { opacity: 1; }
  100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(0); }
}

/* ─── Small screens ─── */
@media (max-width: 380px) {
  .nav-pill {
    width: calc(100% - 14px);
    padding: 4px;
    border-radius: 22px;
  }
  .nav-pill::before { border-radius: 19px; }
  .nav-indicator { border-radius: 16px; top: 7px; height: calc(100% - 14px); }
  .nav-tab { min-height: 50px; }
  .nav-tab__icon { width: 22px; height: 22px; }
  .nav-tab__label { font-size: 10px; }
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .nav-indicator,
  .nav-tab,
  .nav-tab__icon,
  .nav-tab__svg {
    transition: none !important;
  }
  :global(.nav-sparkle--animate) { animation: none; display: none; }
}
</style>
