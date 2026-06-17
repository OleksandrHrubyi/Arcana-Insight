<script>
import BottomNavigation from 'components/ui/BottomNavigation.vue'

export default {
  name: 'BlankLayout',
  components: { BottomNavigation },
  computed: {
    // Той самий список сторінок без навігації, що й у оригіналі.
    hideNavigation() {
      return ['tarot', 'tarotInterpretation', 'TarotResult', 'daily'].includes(this.$route.name)
    },
  },
  watch: {
    // Страхівка: при кожному переході прибираємо body-клас, якщо попередня сторінка
    // забула його зняти (наприклад CardLibraryPage / SavedReadingsPage / CompatibilityPage
    // додають hide-bottom-nav коли відкривається внутрішній шит і можуть не очистити).
    '$route'() {
      if (typeof document !== 'undefined') {
        document.body.classList.remove('hide-bottom-nav')
        document.body.classList.remove('astro-sheet-open')
        document.body.classList.remove('settings-sheet-open')
        document.body.classList.remove('oracle-sheet-open')
        document.body.classList.remove('energy-sheet-open')
      }
    },
  },
}
</script>

<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container class="page-container">
      <router-view />
    </q-page-container>

    <!-- Nav завжди в DOM, ховається лише через CSS — не демонтується при переходах -->
    <div class="bottom-nav-wrap" :class="{ 'bottom-nav-wrap--hidden': hideNavigation }">
      <BottomNavigation />
    </div>
  </q-layout>
</template>

<style scoped>
.page-container {
  height: 100vh;
  background: radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 40%, #050d15 100%);
}

/* ─── Bottom nav wrapper: завжди в DOM, плавне приховування ─── */
.bottom-nav-wrap {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  isolation: isolate;
  padding: 0 0 calc(env(safe-area-inset-bottom, 0px) + 16px);
  pointer-events: auto;

  opacity: 1;
  transform: translateY(0);
  transition:
    opacity 260ms cubic-bezier(0.4, 0, 0.2, 1),
    transform 320ms cubic-bezier(0.34, 1.3, 0.64, 1);
  will-change: opacity, transform;
}

.bottom-nav-wrap--hidden {
  opacity: 0;
  transform: translateY(16px);
  pointer-events: none;
  /* The wrapper's pointer-events:none does NOT stop the inner .nav-tab buttons
     (they re-enable pointer-events:auto), so the invisible nav (z-index 9999)
     still stole taps from page content beneath it (e.g. the Daily close button).
     visibility:hidden cascades and cannot be overridden by a child's
     pointer-events, fully disabling the hidden nav's hit area. */
  visibility: hidden;
}

.bottom-nav-wrap::before {
  content: '';
  position: absolute;
  left: 50%;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 2px);
  width: min(430px, calc(100% - 24px));
  height: 84px;
  transform: translateX(-50%);
  border-radius: 28px;
  background:
    radial-gradient(70% 100% at 50% 100%, rgba(4, 8, 14, 0.58) 0%, rgba(4, 8, 14, 0.22) 48%, rgba(4, 8, 14, 0) 82%);
  filter: blur(16px);
  pointer-events: none;
  z-index: -1;
}

:global(body.hide-bottom-nav .bottom-nav-wrap) {
  opacity: 0;
  transform: translateY(16px);
  pointer-events: none;
  /* pointer-events:none on the wrapper does NOT stop the inner .nav-tab buttons
     (they re-enable pointer-events:auto), so the invisible nav (z-index 9999)
     still steals taps from page content and open dialogs beneath it. visibility
     cascades and cannot be overridden by a child's pointer-events. */
  visibility: hidden;
}

@media (prefers-reduced-motion: reduce) {
  .bottom-nav-wrap { transition: opacity 120ms ease; transform: none; }
  .bottom-nav-wrap--hidden { transform: none; }
}
</style>
