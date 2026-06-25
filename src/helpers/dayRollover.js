// True when content rendered for `renderedDayKey` (a YYYY-MM-DD local day key) is
// now stale because the local day has rolled over. Used by resume/visibility
// handlers (Horoscope, Daily Card) to decide whether to re-fetch after the app
// returns to foreground: iOS freezes JS timers while backgrounded, so the
// scheduled midnight refresh may never have fired (QA findings #9/#10).
export const isDayKeyStale = (renderedDayKey, currentDayKey) =>
  Boolean(renderedDayKey) && renderedDayKey !== currentDayKey
