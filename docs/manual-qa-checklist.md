# Manual QA Checklist — Arcana Insight (real device)

> How to test **qualitatively** and a screen-by-screen list to tick off.
> Mark each: `[ ]` not tested · `[x]` OK · `[!]` BUG (log it in §E).
> Test on a **real iPhone, release build**, after `npx cap sync ios` + clean run.

## A. Method — for EVERY screen check the 6 things
1. **Renders** — opens without black/blank/crash; layout correct (safe-area top/bottom, no overlap).
2. **States** — loading (skeleton/spinner), empty (no data), error (network off → retry), success.
3. **Every button & link** — does what its label says, goes to the **right** place (not a wrong route).
4. **Back/close** — returns somewhere sensible (never a dead-end or loop).
5. **Bottom-nav** — shown where expected, hidden on focused screens; **active tab matches the page**.
6. **Free vs Premium** and **Logged-in vs Logged-out** — gating correct in each combination.

Also run each screen in **EN and UK** (toggle in Settings) and watch for untranslated/overflowing text.

---

## B. Per-screen checklist

### Onboarding (fresh install)
- [ ] Delete app → reinstall → shows onboarding (interests), not black screen.
- [ ] Pick interests → continue → lands on Home; choices persist after app restart.
- [ ] Skip/again behaves sanely; can't get trapped.

### Home (LandingScene)
- [ ] Card-of-the-day + "focus today" + astro render; bottom-nav visible; **Home tab active**.
- [ ] Tap card-of-the-day → daily card opens.
- [ ] Streak badge shows correct number (if any).
- [ ] All home CTAs go to the right screens.

### Bottom navigation (every tab)
- [ ] Home / Horoscope / Tarot / Menu each open the right screen.
- [ ] Active tab highlight matches the current page (Home/Horoscope/Tarot/Menu).
- [ ] On Menu sub-pages (Cards, Compatibility, Readings, Account, Settings, Zodiac) the **Menu** tab stays active.
- [ ] Nav hidden on: Tarot (immersive), Daily card, Premium, Personal Horoscope, Onboarding, Login/Sign-up.

### Horoscope
- [ ] Zodiac wheel spins / sign selection works.
- [ ] Energy theme (free) shows text; Love/Career (premium, logged-out or free) show **blurred teaser + Unlock** — content NOT readable, NO auto-jump to paywall.
- [ ] Tapping the Unlock overlay → paywall.
- [ ] Premium user: Love/Career readable.
- [ ] Network off → error + retry; switching EN/UK reloads text.

### Tarot (immersive)
- [ ] Free user: 1-card draw works; 3/5 spreads show "Premium" and route to paywall on tap.
- [ ] 1 free reading/day enforced (second attempt → upsell/limit).
- [ ] Premium: 3/5 spreads, AI interpretation works; basic interpretation fallback if AI down.
- [ ] Clarifying question flow works (premium).
- [ ] Internal back/exit works (no bottom-nav here by design).
- [ ] Reading saved to history only for premium.

### Tarot Interpretation
- [ ] Renders the reading; positions explained; premium "aha" upsell for free.
- [ ] "New session" / "End" buttons go to the right place.

### Personal Horoscope
- [ ] Free/logged-out → lock panel, "Unlock Premium" CTA, **no redirect loop**; back works.
- [ ] No DOB → empty-state with CTA to add birth date (Account/Sign-up).
- [ ] Premium + DOB → generates a reading; EN/UK switch regenerates.

### Compatibility
- [ ] Free: deterministic synastry result shows; dimensions/AI locked with Unlock.
- [ ] Premium: AI narrative loads; **AI failure → inline error + retry** (not endless spinner).
- [ ] Inputs/validation behave.

### Card Library (Cards)
- [ ] Grid renders; tapping a card shows details; back works; **Menu tab active**.

### Zodiac Guide
- [ ] Signs render; details; share works (no `✨`); compatibility CTA.

### Saved Readings
- [ ] Free → lock (history is premium).
- [ ] Premium → list loads; fetch error shows retry (not "empty"); delete works + toast on failure.
- [ ] Logging out while here clears the list.

### Menu
- [ ] All items go to the right screens; **no "Rewards" entry** (hidden for launch).
- [ ] "Card of the day" launcher → daily card (not Home).

### Settings
- [ ] Language EN/UK toggles everything.
- [ ] Notifications toggle + time picker; "Apply" works.
- [ ] Links to Privacy/Terms/EULA open in browser; Support link works.

### Account
- [ ] Shows email (read-only, with hint), name, DOB (editable); Save works.
- [ ] Logout → premium turns OFF, returns to a sensible screen.
- [ ] Delete account → data gone, signed out, can't log back into the deleted account.
- [ ] Reached via deep link / first nav → back doesn't dead-end.

### Premium / Paywall
- [ ] Plans show price + "≈ $X/mo" on yearly; yearly pre-selected.
- [ ] Auto-renew disclosure text present (charged to Apple ID, auto-renews, manage in settings) + Terms + Privacy links.
- [ ] Purchase monthly/yearly works; button shows "Processing"; success notify.
- [ ] Already-premium: button reads "You're Premium" and closes (no re-purchase).
- [ ] Restore purchases works; billing-unavailable (no network) shows a clear note.
- [ ] Close/back returns correctly.

---

## C. Cross-cutting flows
- [ ] **Auth:** sign-up + email code; Sign in with Apple; login on a 2nd device (entitlement follows account).
- [ ] **Premium cycle:** logged-in+bought → premium; logout → off; login → auto-restores; cold-start logged-out → off (no flash).
- [ ] **IAP (sandbox):** purchase / survives app-kill / restore. (cancel→expiry, restore-as-non-subscriber = optional.)
- [ ] **Push:** enable + set 09:00 → arrives ~09:00 local next day; toggle off → none.
- [ ] **Network:** airplane mode (graceful errors, no infinite spinners); slow 3G (timeouts fire).
- [ ] **First launch vs returning:** fresh install onboarding; returning user restores state.
- [ ] **Devices/iOS:** iPhone SE (small, safe-area), a notch/Dynamic-Island phone, a Pro Max; iOS 14 (min) + latest.
- [ ] **Crashlytics:** confirm events appear (already verified once).

---

## D. App Store readiness (non-functional)
- [ ] No `✨`/`auto_awesome` AI-icons anywhere.
- [ ] No untranslated strings (EN/UK parity) on any screen.
- [ ] All external links reachable; Privacy + Support URLs live.
- [ ] No console errors in Safari Web Inspector on key screens.

---

## E. Found-issues log (fill as you test)
| # | Screen | What you did | Expected | Actual | Severity |
|---|--------|--------------|----------|--------|----------|
| 1 | Card Library | opened page | Menu tab active | Home was active / none | fixed 2026-06-24 |
| 2 | | | | | |
| 3 | | | | | |

> Add a row for every issue. Send me the filled rows and I'll fix them in priority order.
