# Release Action Plan — work top-down, tick as we go

> Working checklist distilled from `docs/pre-release-audit-2026-06-24.md`.
> Owner: 🤖 = assistant can do solo · 👤 = needs you (Apple/dashboard/device) · 🤝 = both.
> Status: `[ ]` todo · `[~]` in progress · `[x]` done.
> Rule: do them in order. Don't submit to App Store until every **P0** is `[x]`.

---

## 🔴 P0 — BLOCKING (must be done before submission)

- [ ] **P0-1 · Crash reporting** — 🤖 (then 👤 verify on device)
  Install Firebase Crashlytics (Firebase is already in the project) or Sentry. Wire init in app boot; confirm a test crash appears in the console. *Why: today you had a silent core-feature outage (AI tarot 503) and nothing detected it.*

- [ ] **P0-2 · Paywall auto-renew disclosure** — 🤖
  Verify/ add the exact subscription disclosure on the paywall: title, length, price-per-period, "auto-renews unless cancelled ≥24h before period end", + functional Terms (EULA) & Privacy links. *Top cause of 3.1.2 rejection.*

- [ ] **P0-3 · Real-device QA pass** — 👤 (🤖 provides the script)
  Run the full §10 test plan on a real iPhone (release build): smoke flow + subscription (purchase / **restore / cancel / survives app-kill / restore-as-non-subscriber**) + auth + edge cases + airplane/slow network + push timing.

- [ ] **P0-4 · IAP sandbox runbook finished** — 👤
  Complete the remaining checks in `docs/release-reviewer/references/ios-sandbox-billing-runbook.md` (restore, cancel, restart-survival, negative restore) and record results. (Purchase already verified.)

- [ ] **P0-5 · Subscriptions "Ready to Submit"** — 👤
  In ASC, both products (`arcana.premium.monthly`, `arcana.premium.yearly`) → state **Ready to Submit** + attached to the app version.

- [ ] **P0-6 · ASC Age-Rating + App-Privacy forms** — 👤
  Fill both forms in App Store Connect to match `app-store/asc-age-rating-and-privacy.md` (Age 4+, 8 data types, Tracking = No).

- [ ] **P0-7 · AppIcon has no alpha channel** — 👤 (🤖 can check the file)
  Confirm `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` is 1024×1024, opaque (Apple rejects icons with transparency).

---

## 🟠 P1 — SHOULD FIX BEFORE RELEASE

- [ ] **P1-1 · Rotate `RC_WEBHOOK_SECRET`** — 🤝
  Replace the temporary test secret with your own; set in Supabase secrets AND the RevenueCat dashboard webhook (must match).

- [ ] **P1-2 · Host + verify Support and Privacy URLs** — 👤
  Ensure `support.html` is live and the Privacy Policy URL loads; both must be reachable from App Store + in-app.

- [ ] **P1-3 · `supabase db pull`** — 🤖
  Snapshot dashboard-only tables (`app_users`, `tarot_readings`, `push_devices`) into migrations to kill schema-drift risk.

- [ ] **P1-4 · Smoke automation + healthcheck** — 🤖
  Add 2–3 Playwright smoke flows (home→tarot, paywall render, horoscope) + a scheduled "tarot-reading returns 200 for premium" healthcheck.

- [ ] **P1-5 · Remove dangling "rewards/points" copy** — 🤖
  Confirm no remaining UI copy/CTA promises points/rewards after hiding that feature.

- [ ] **P1-6 · Review + upload screenshots** — 👤
  Review `app-store/screenshots/` (6.5"/6.9"); optionally add captioned marketing frames; upload to ASC.

- [ ] **P1-7 · Privacy Policy names all processors** — 🤝
  Ensure the policy lists Supabase, Firebase, RevenueCat, OpenAI/OpenRouter, Open-Meteo + DOB/birth-city handling.

---

## 🟡 P2 — AFTER RELEASE (v1.1 / v1.2)

- [ ] **P2-1** Refactor God-components (TarotOraclePage 3287, LandingScene 3084, HoroscopeComponent 2859, CompatibilityPage 2586).
- [ ] **P2-2** Full accessibility pass: Dynamic Type, contrast tuning, VoiceOver polish.
- [ ] **P2-3** Tarot journal / patterns (LR-23, deferred).
- [ ] **P2-4** Web push (desktop notifications).
- [ ] **P2-5** Marketing-grade ASO screenshots + localized keyword optimization.
- [ ] **P2-6** Move premium gating literals into runtime `PREMIUM_MODEL_LIMITS`.
- [ ] **P2-7** On-device performance profiling (astronomy-engine main-thread calc, GSAP screens) → optimize if janky.

---

## Progress log
- 2026-06-24 — Plan created from the 15-role pre-release audit. Starting P0-1.
