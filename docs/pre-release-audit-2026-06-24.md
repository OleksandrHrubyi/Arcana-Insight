# Arcana Insight — Pre-Release Audit (2026-06-24)

> Global professional audit before App Store submission. No sugarcoating.
> **Reality check on the brief:** this is NOT a native Swift/SwiftUI app. It is **Vue 3 + Quasar wrapped in Capacitor (WKWebView)**. The "iOS Senior Developer" lens therefore audits the Capacitor/native-bridge layer, not Swift code.

## App context (filled in, since the brief left it blank)
- **What it is:** Tarot + daily horoscope + astrology (ascendant/synastry) + compatibility, mystic dark theme.
- **Stack:** Vue 3 (Options + `<script setup>`) · Quasar · Capacitor (iOS, WKWebView) · Supabase (Postgres + Deno Edge Functions) · RevenueCat (IAP) · Firebase Analytics · APNs push · Apple Sign In · `astronomy-engine` + GSAP.
- **Build:** appId `com.hrubyi.arcana`, version **1.0 (build 13)**, iOS **14.0+**, iPhone-only, portrait, category Lifestyle, display name **"Arcana"**.
- **Implemented:** AI tarot (premium) + free 1-card draw, daily card, horoscope (free energy / premium love+career), personal horoscope (premium), compatibility (free synastry + premium AI), zodiac guide, card library, saved readings (premium), onboarding (interests), Apple Sign In + email auth, premium paywall (monthly/yearly), push notifications, account deletion, server-side premium enforcement (RC webhook).

---

## 1. EXECUTIVE SUMMARY

**Ready to ship? CONDITIONAL GO.** The code, after a heavy bug-fix pass on 2026-06-23/24, is in genuinely good shape and the backend is solid and verified live. But the app has **never had a full real-device QA pass**, has **no crash reporting**, and only **24h ago its single most important feature (AI tarot) was 100% down in production (503) with nothing to detect it.** That is the core risk: not the code as it stands today, but the lack of a safety net to know when it breaks.

**Overall score: 7 / 10** (code health 8, but production-readiness/observability/QA-maturity drag it down).

**Top risks (ranked):**
1. **No crash reporting / no production monitoring.** You are blind to live failures. (The AI-tarot outage proves this is not theoretical.)
2. **No real-device end-to-end QA.** Every bug this week was found by manual clicking, not tests. Unknowns remain on real hardware.
3. **Apple IAP review (Guideline 3.1.2 / 2.1):** subscriptions still need to reach "Ready to Submit" + the paywall's auto-renew disclosure text must be exact, or it gets rejected.
4. **Apple "minimum functionality" (4.2) scrutiny** is possible for a hybrid mystic/AI app — defensible (push, IAP, Apple Sign In, real astro engine, haptics) but be ready.

---

## 2. AGENT VERDICTS

### 1. Team Lead — 7/10
- **Checked:** overall release coordination, what's done vs blocking.
- **Found:** code/backend essentially complete; 4 Apple-operational steps left (sandbox IAP checks, subs "Ready to Submit", screenshots upload, ASC privacy/age forms). ~19 real bugs fixed in the last 2 days incl. a total AI-tarot outage.
- **Critical:** the *rate* of elementary bugs found by the owner (not by tests) signals shallow pre-release verification.
- **Rec:** one disciplined real-device pass + add crash reporting before TestFlight-to-production. Don't submit the same day you finish coding.

### 2. Tech Lead — 7/10
- **Checked:** code quality, technical risk.
- **Found:** business logic cleanly isolated in `src/helpers/*` with ~220 unit tests; lint clean; build green. BUT several **God-components**: `TarotOraclePage.vue` 3287 lines, `LandingScene.vue` 3084, `HoroscopeComponent.vue` 2859, `CompatibilityPage.vue` 2586. High change-risk, hard to test in UI.
- **Critical:** none structural. The size is debt, not a blocker.
- **Rec:** post-launch, extract the tarot/horoscope mega-components. Now: freeze them, don't refactor pre-release.

### 3. iOS Senior Developer (Capacitor/native) — 8/10
- **Checked:** Info.plist, entitlements, Capacitor config, native plugins, lifecycle.
- **Found:** `Info.plist` clean — **no unused `NS*UsageDescription` strings** (app uses none of camera/photos/location/tracking), `UIBackgroundModes=remote-notification`, portrait-only, `LSApplicationCategoryType=lifestyle`. Entitlements correct: `aps-environment=production` + Apple Sign In. `capacitor.config` has **no dev `server.url`** (bundles `dist/spa` locally — good, a common rejection cause avoided). `CapacitorHttp` enabled.
- **Critical:** none.
- **Verify manually:** (a) AppIcon is a single `AppIcon-512@2x.png` (1024²) — confirm it has **no alpha channel** (Apple rejects transparent icons); (b) signing/provisioning profile for distribution; (c) `TARGETED_DEVICE_FAMILY` = iPhone-only so no iPad screenshots are demanded.

### 4. Software Architect — 7/10
- **Checked:** structure, modularity, dependency flow.
- **Found:** clean layering — `pages/` (routed) → `components/` → `helpers/` (pure, tested) → `services/` (supabaseNative, analytics, billing) → `stores/` (Pinia: auth, premium, appEpoch). Edge functions share `_shared/`. Source-of-truth files documented. Good separation.
- **Critical:** none. Risk is the mega-components (see Tech Lead) and that several core tables (`app_users`, `tarot_readings`, `push_devices`) live **only in the Supabase dashboard, not in migrations** — schema drift risk; the `app_users` cascade bug came from exactly this.
- **Rec:** snapshot dashboard tables into migrations (`supabase db pull`) so schema is versioned.

### 5. QA Lead — 4/10  ← lowest, deliberately
- **Checked:** test coverage, regression safety.
- **Found:** ~220 **unit** tests (helpers only). **Zero E2E / device / interaction tests.** Every bug this week (daily launcher → wrong route, bottom nav gone on home, paywall re-purchase, personal-horoscope redirect loop, AI tarot 503, push timing) escaped to the owner because nothing exercises real flows.
- **Critical:** **no automated detection of a broken core feature.** AI tarot was fully down and only a human noticed.
- **Rec:** before production: run the full manual test plan in §10 on a real device; add 2-3 Playwright smoke flows (home→tarot, paywall render, horoscope) and a live "is tarot-reading returning 200" healthcheck.

### 6. UX/UI Designer — 7/10
- **Checked:** onboarding, home, nav, paywall, settings, states, copy, trust.
- **Found:** strong visual identity (cohesive dark mystic theme, unified `.arcana-btn` system, designed empty/loading/error states on key screens). Onboarding is intentionally light (interests only; DOB captured at signup/account). Nav fixed this week (home now shows tab bar; focused screens hide it). Paywall redesigned, scannable, with per-month price.
- **Critical:** none. See §8 for specifics.
- **Rec:** the **Tarot tab is intentionally immersive (no tab bar)** — confirm users discover the in-screen exit (the one place the tab bar is a one-way trip). QA on real device.

### 7. App Store Review Expert — 6/10
- **Checked:** rejection risk vs guidelines.
- **Found:** account deletion implemented (5.1.1(v) ✅), Apple Sign In present (4.8 ✅ since email login is offered), privacy + EULA links wired for WKWebView, privacy manifest complete, no unused permissions.
- **Critical / risks:** (1) **3.1.2 auto-renewable subscription disclosure** — the paywall must show, in-binary: subscription title, length, price-per-period, "auto-renews unless turned off ≥24h before period end," and functional Terms (EULA) + Privacy links. **Verify the exact disclosure text is present** (links exist; confirm the auto-renew sentence). (2) **2.1 / IAP must work in review** — finish sandbox checks. (3) **4.2 minimum functionality** for a hybrid — low-moderate risk, defensible. (4) Fortune-telling content — keep metadata honest, age rating set.
- **Rec:** add the explicit auto-renew disclosure block to the paywall if missing; fill reviewer notes with "no login required to evaluate; sandbox IAP."

### 8. Security Engineer — 8/10
- **Checked:** secrets, tokens, data storage, API exposure.
- **Found:** **no API keys in the client** (OpenAI/OpenRouter live only in edge-function secrets); edge functions auth-gated; **server-side premium enforcement now live** on personal-horoscope + tarot-reading + compatibility (flag `RC_ENFORCE_PREMIUM=true`), verified 403 for non-subscribers; RevenueCat webhook verifies a shared secret; account deletion is atomic (cascade) — no orphaned PII; `PrivacyInfo.xcprivacy` declares tracking=false.
- **Critical:** none found.
- **Verify manually:** rotate the temporary `RC_WEBHOOK_SECRET` I set during testing to your own value and confirm it matches the RevenueCat dashboard; confirm Supabase RLS on dashboard-created tables (`app_users`, `tarot_readings`) restricts reads to the owner.

### 9. Performance Engineer — 7/10
- **Checked:** bundle, leaks, network, jank.
- **Found:** total JS ~1.5MB **bundled locally** (no network cost in WKWebView); route-level code splitting present (per-page chunks). Timers/listeners are **balanced** (5 setInterval / 13 clearInterval; 13 addEventListener / 13 removeEventListener) — no obvious leak. `prefers-reduced-motion` respected in 17 places.
- **Critical:** none from static analysis.
- **Verify on device:** `astronomy-engine` (107KB) runs synchronously on the main thread — profile the ascendant/synastry calc for jank on older devices (iPhone SE / A12). GSAP-heavy screens (LandingScene wheel, horoscope wheel) — check 60fps + battery on a real device. **Memory/battery cannot be judged from code.**

### 10. Product Manager — 7/10
- **Checked:** value, feature logic, monetization coherence.
- **Found:** clear core loop (daily card → horoscope → tarot → compatibility), sensible free/premium split (1 free tarot/day + 1-card, energy horoscope free; AI interpretation, 3/5 spreads, love/career, personal horoscope, history = premium). Value is legible within ~30s on the home screen.
- **Critical:** the **rewards/ritual-points** system was built then **hidden** for launch — confirm no copy/CTA still promises points/rewards (dangling value prop). 
- **Rec:** decide the streak/retention story explicitly; the daily card + push is the retention spine.

### 11. ASO / Marketing — 6/10
- **Checked:** name, subtitle, keywords, screenshots, positioning.
- **Found:** ASC metadata drafted (`app-store/asc-metadata.md`, EN+UK), screenshots generated for **6.5" and 6.9"** (home/tarot/horoscope/compatibility/premium). Display name "Arcana" (home screen) vs "Arcana Insight" (store) — intentional but be consistent.
- **Critical:** none. 
- **Rec:** screenshots are auto-generated app frames — for conversion, add captioned marketing screenshots (value props), not just raw screens. Keyword field: pack tarot/horoscope/astrology/zodiac/compatibility synonyms.

### 12. Monetization Expert — 7/10
- **Checked:** subs, paywall, trial, pricing, restore.
- **Found:** monthly + yearly products wired through RevenueCat; paywall shows price + **normalized "≈ $X/mo"** on annual; restore-purchases present; free-trial extraction supported; post-purchase state fixed (button → "You're Premium", no re-purchase); already-premium re-entry handled.
- **Critical:** verify a **free trial is actually configured** in ASC if you intend one (code supports it; it must exist on the product). 
- **Rec:** 8+ paywall entry points exist at high-intent moments — good. Confirm yearly is visually defaulted (it is) and the discount vs monthly is shown.

### 13. Analytics Expert — 8/10
- **Checked:** events, funnels, onboarding/conversion tracking.
- **Found:** comprehensive, contract-tested instrumentation: `PAYWALL_FUNNEL_EVENTS` (view/close/purchase_click/success/error/restore/trial), `PAYWALL_ENTRY_POINTS`, `ONBOARDING_EVENTS`, `RETENTION_EVENTS` (daily_active, ritual_complete), `TAROT_SESSION_EVENTS`, `CONTENT_SHARE_EVENTS`, with `REQUIRED_*` lists enforced by tests. Analytics wrapper is fail-safe (no-ops when plugin unavailable).
- **Critical:** none.
- **Verify:** that Firebase events actually land in the console from a real device build (web/dev no-ops by design). No PII should be in event params — spot-confirm.

### 14. Accessibility Expert — 5/10
- **Checked:** Dynamic Type, VoiceOver, contrast, tap targets.
- **Found:** partial — 24 `aria-label`, 13 `alt`, reduced-motion respected (17×), **0 icon-only buttons without a label** (good). 
- **Critical:** **Dynamic Type is effectively unsupported** — typography is fixed `px`, so users with larger text sizes won't get scaling. Common for Quasar apps; not a guaranteed rejection but an accessibility gap. Low-contrast risk on the dark theme (white at <0.5 opacity).
- **Rec:** post-launch a11y pass; pre-launch, at minimum verify VoiceOver can navigate the core flow and nothing is an unlabeled trap.

### 15. Legal / Privacy Expert — 7/10
- **Checked:** Privacy Policy, Terms/EULA, GDPR/CCPA, nutrition labels.
- **Found:** Privacy Policy hosted (`oleksandrhrubyi.github.io/Arcana-Insight/privacy-policy.html`), Apple standard EULA linked, support page drafted, App Privacy mapping prepared (`asc-age-rating-and-privacy.md`) and matching `PrivacyInfo.xcprivacy` (8 data types, tracking=No). Account deletion present (GDPR erasure).
- **Critical / verify:** (1) **Support URL must be live + reachable** (host `support.html`). (2) Privacy Policy must explicitly name third-party processors (Supabase, Firebase, RevenueCat, OpenAI/OpenRouter, Open-Meteo) and DOB/birth-city handling. (3) Confirm the Privacy Policy is reachable **from inside the app** (it is, via WKWebView-safe `window.open`).

---

## 3. APP STORE READINESS CHECKLIST

| Item | Status | Comment | Priority |
|---|---|---|---|
| Builds & runs (release) | OK | quasar build green; no dev server URL | — |
| App icon (1024, no alpha) | Needs Work | single 512@2x present — verify no alpha | P1 |
| Launch screen | OK | LaunchScreen.storyboard present | — |
| Version/build | OK | 1.0 (13) | — |
| Permissions (Info.plist) | OK | no unused/missing usage strings | — |
| Entitlements (push, Apple Sign In) | OK | aps=production, applesignin | — |
| Privacy manifest | OK | complete, tracking=No | — |
| Crash reporting | **Critical** | **none installed** | P0 |
| Real-device E2E QA | **Critical** | never done end-to-end | P0 |
| IAP works in sandbox (full runbook) | Needs Work | purchase verified; restore/cancel/restart/negative pending | P0 |
| Subs "Ready to Submit" in ASC | Needs Work | exist + wired; finalize state | P0 |
| Auto-renew disclosure on paywall | Needs Work | **verify exact text present** | P0 |
| Privacy Policy URL live | Needs Work | hosted; re-confirm reachable | P1 |
| Support URL live | Needs Work | support.html must be hosted | P1 |
| Terms/EULA link | OK | Apple standard EULA | — |
| Account deletion in-app | OK | atomic cascade, verified | — |
| Screenshots (6.5"/6.9") | Needs Work | generated; review + upload | P1 |
| ASC metadata + age rating + privacy form | Needs Work | drafted; fill in ASC | P0 |
| Server premium enforcement | OK | live + verified | — |
| Analytics funnel | OK | comprehensive, fail-safe | — |
| Accessibility (Dynamic Type/VoiceOver) | Needs Work | partial; gap acceptable v1 | P2 |
| RC_WEBHOOK_SECRET rotated | Needs Work | replace test value | P1 |

---

## 4. CRITICAL — MUST FIX BEFORE SUBMISSION (P0)
1. **Add crash reporting** (Sentry or Firebase Crashlytics). Without it you cannot detect production failures — and you already had a silent core-feature outage. ~1–2h.
2. **Full real-device QA pass** using the §10 plan (esp. IAP: purchase, **restore, cancel, entitlement survives app restart, restore-as-non-subscriber**).
3. **Subscriptions → "Ready to Submit"** in App Store Connect + attached to the version (LR-13).
4. **Verify the paywall's auto-renew disclosure text** (title, period, price/period, "auto-renews unless cancelled", Terms + Privacy links). Add the sentence if missing — top IAP rejection cause (3.1.2).
5. **Fill the ASC Age-Rating + App-Privacy forms** to match `asc-age-rating-and-privacy.md` (LR-16).
6. **Confirm AppIcon has no alpha channel.**

## 5. SHOULD FIX BEFORE RELEASE (P1)
1. Rotate `RC_WEBHOOK_SECRET` to your own value (matches RevenueCat dashboard).
2. Host + verify **Support URL** and re-verify Privacy Policy URL loads.
3. Review + upload screenshots (consider captioned marketing frames).
4. `supabase db pull` to version the dashboard-only tables (`app_users`, `tarot_readings`, `push_devices`) → kill schema-drift risk.
5. Add 2–3 Playwright smoke flows + a scheduled "tarot-reading returns 200" healthcheck.
6. Confirm no dangling "rewards/points" copy after hiding that feature.

## 6. CAN WAIT (v1.1 / v1.2)
- Refactor the God-components (TarotOraclePage, LandingScene, HoroscopeComponent, CompatibilityPage).
- Full accessibility pass (Dynamic Type, contrast tuning, VoiceOver polish).
- Tarot journal / patterns (LR-23, deferred).
- Web push (desktop notifications) — currently iOS-only by design.
- Marketing-grade ASO screenshots & localized keyword optimization.
- Move premium gating literals into `PREMIUM_MODEL_LIMITS` at runtime (currently annotated mirror).

## 7. APPLE REVIEW RISKS (explicit)
1. **3.1.2 (subscriptions):** missing/incomplete auto-renew disclosure on the paywall → **most likely rejection**. Mitigate: verify text.
2. **2.1 (IAP doesn't work in review):** finish sandbox runbook; ensure reviewer can purchase (no login required to reach paywall — good).
3. **4.2 (minimum functionality / web wrapper):** hybrid + AI content. Mitigate: native push/IAP/Apple Sign In/haptics/astro engine make it more than a website; state this in reviewer notes.
4. **5.1.1 (data collection / account):** account deletion ✅; ensure sign-up clearly states what's collected; privacy form must match manifest.
5. **1.x (fortune-telling content):** keep descriptions non-deceptive ("for entertainment"), age rating honest. Tarot copy already avoids medical/financial/deterministic claims.
6. **4.8 (Sign in with Apple):** present ✅ (required because email login is offered).
7. **Metadata:** screenshots must reflect actual app; no placeholder text.

## 8. UX/UI AUDIT
- **Onboarding:** light (interests), no DOB gate — correct; persisted to native Preferences + localStorage. Reachable, not a wall. ✅
- **Home (LandingScene):** card-of-the-day + focus-today + astro; bottom nav now shows (fixed). Value clear. ✅
- **Navigation:** tab bar (Home/Horoscope/Tarot/Menu); focused screens hide nav correctly (fixed this session). **Tarot tab is immersive (no nav) — verify the exit is discoverable.**
- **Paywall:** scannable, yearly default, per-month price, restore, post-purchase state correct. **Verify auto-renew disclosure.**
- **Settings:** notification toggle + time, language, interests. Note: push toggle reflects per-device state (web shows off — expected, not user-facing on iOS).
- **States:** empty/loading/error present on home, horoscope, personal horoscope, tarot, saved readings, compatibility (AI error+retry added this session). ✅
- **Copy:** i18n EN+UK with parity tests; no AI-sigil icons (✨/auto_awesome removed). ✅
- **Trust:** privacy/terms links, account deletion, honest premium claims. ✅

## 9. TECHNICAL AUDIT
- **Structure/architecture:** clean layered, source-of-truth helpers, tested. ✅
- **Networking:** edge calls via `invokeFunction` with timeouts; OpenAI→OpenRouter fallback on AI. Retriable tarot data cache. ✅
- **State:** Pinia (auth/premium/appEpoch); premium revoked on logout/delete, applied on purchase/restore, boot/resume sync guarded. ✅
- **async/await + error handling:** consistent try/catch on async UI actions; error envelopes from edge fns; user-facing error+retry on key screens. ✅
- **DI:** helpers take injected deps (testable). ✅
- **Persistence:** native Preferences backup for onboarding; localStorage hot-path. ⚠️ verify no *critical* state is localStorage-only.
- **Security:** keys server-side only; premium enforced server-side; atomic deletion. ✅
- **Logging:** no ungated production console.log. ✅
- **Analytics:** comprehensive, fail-safe. ✅
- **Crash reporting:** ❌ **absent — P0.**
- **Performance:** acceptable statically; needs device profiling for astro calc + GSAP.

## 10. QA TEST PLAN
**Smoke (real device, release build):** launch → onboarding → home renders → daily card → horoscope (energy) → tarot 1-card free → open paywall → settings → account.
**Subscription:** purchase monthly; purchase yearly; **restore**; **cancel** (sandbox) → access ends after period; **entitlement survives app kill+relaunch**; **restore as non-subscriber** (nothing granted); buy → AI tarot unlocks; webhook writes `user_entitlements`.
**Auth:** email sign-up + confirm code; Apple Sign In; logout (premium revoked); login on 2nd device (entitlement follows account); account deletion → data gone, signed out.
**Edge cases:** no DOB → personal horoscope empty-state CTA; non-premium → personal horoscope lock (no redirect loop — fixed); locked horoscope theme shows blur (no paywall bounce — fixed); free tarot daily limit; expired sub on resume.
**Network:** airplane mode (graceful errors, no spinners-forever); slow 3G (timeouts fire); AI provider failure → fallback / clear error (the 503 path).
**First launch vs returning:** fresh install onboarding; returning user lands home with state restored.
**Device matrix:** iPhone SE (A-series small screen, safe-area top), iPhone 14/15 (notch/Dynamic Island), a large Pro Max. **iOS 14 (min) + iOS 17/18.**
**Push:** set time 09:00 → arrives ~09:00 local next day (fixed `next_send_at`); toggle off → none.

## 11. RELEASE PLAN
**Today/tonight (code — already done by the assistant):** all reported bugs + audit fixes committed & deployed; edge functions deployed; migrations applied.
**Before TestFlight:** add crash reporting; rotate RC secret; `npx cap sync ios` + archive; run §10 smoke on a real device; verify auto-renew disclosure + AppIcon alpha.
**Before App Store Review:** finish IAP sandbox runbook; subs "Ready to Submit"; fill ASC age-rating + privacy + metadata; upload screenshots; host/verify support + privacy URLs; reviewer notes (no login needed; sandbox IAP).
**After release:** watch Crashlytics + RevenueCat + analytics funnel; enable web-push later if wanted; schedule God-component refactor + a11y pass for 1.1.

## 12. FINAL DECISION

### CONDITIONAL GO.
The product and code are good enough to ship **after** these are done, in order:
1. **Crash reporting installed** (you cannot fly blind). 
2. **One real-device QA pass** (esp. the full IAP sandbox runbook).
3. **Paywall auto-renew disclosure verified** + **ASC subs "Ready to Submit"** + **age-rating/privacy forms filled**.
4. **AppIcon alpha + Support/Privacy URLs verified.**

Do **NOT** submit straight off the code finish. The single biggest lesson of the last 48h: things broke silently (AI tarot fully down) and only a human caught them. Close that gap (crash reporting + one real device pass) and it's a confident GO.
