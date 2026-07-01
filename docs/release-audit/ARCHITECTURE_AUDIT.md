# Stage 1 — Architecture & Code-Quality Audit

Date: 2026-07-01 · Layer tags: **[code]** verified by reading/running · **[device]** needs a real run.

## 1. Build / static health (verified this run)
| Check | Result |
|---|---|
| `quasar build` (production SPA) | ✅ pass, no errors |
| `eslint src` (flat config) | ✅ 0 problems |
| `npm test` (node --test) | ✅ **249 / 249** |
| Route count | 23 screens |
| Edge functions | 19 (Deno) |
| Forbidden dup files in `src` | none |
| Prediction/guarantee copy (i18n scan) | none obvious |

## 2. Stack
- **Client:** Vue 3 (mixed Options + `<script setup>`) + Quasar 2 (Vite) → Capacitor 5 native shell. Target iOS 14+ (arm64).
- **Backend:** Supabase — Postgres + Auth + 19 Deno Edge Functions. AI via OpenAI `gpt-4o-mini` → OpenRouter fallback.
- **Payments:** RevenueCat (`@revenuecat/purchases-capacitor`). **Push:** own APNs `push-worker`. **Analytics:** Firebase.
- **i18n:** single runtime bundle `src/i18n/messages.bundle.js` (en/uk); `en.json`/`uk.json` are dead fixtures. Custom `t()` + `pluralForm()` (no vue-i18n at runtime).

## 3. Structure & source-of-truth
Clean separation: `pages/` (routed) · `components/` · `helpers/` (UI-less business logic = source of truth) · `services/` · `stores/` (Pinia) · `constants/` · `supabase/functions/`. Documented in `docs/canonical-files.md`. Business logic is isolated and **unit-tested under `node --test`** (helpers import no Capacitor statically → node-safe via dynamic imports). This is a genuine strength — 249 tests cover dailyCard, horoscope, ritual, premium, i18n/plural, onboarding, auth-redirect, etc.

## 4. Architecture strengths [code]
- **Premium invariant** enforced consistently: `premium ⇔ logged-in AND entitled`; local `arcana_premium_access_v1`, revoked on logout / no-session sync; server-authoritative RevenueCat REST check in `_shared/premium.ts` (`RC_ENFORCE_PREMIUM=true`, fail-open only on RC outage).
- **Edge functions hardened** (2026-06 pass): OpenAI→OpenRouter fallback, `fetchWithTimeout`, `containsDisallowed()` content-safety (EN+UK fatalism/medical/financial), CORS/OPTIONS/method guards, structured non-leaking errors, auth required on `tarot-reading`/`send-broadcast`, timing-safe secrets.
- **i18n statically bundled** → no cold-start raw-key flash (QA #20/#21).
- **Global error safety net**: `boot/error-handler.js` (Vue errorHandler + unhandledrejection + window error), registered first.
- **Atomic server ops**: `ritual_award_points` RPC (single txn), `delete-account` cascade FK (atomic, retry-safe).

## 5. Code-quality issues / tech debt [code]
| ID | Item | Severity |
|---|---|---|
| AR-1 | **Giant components** — `TarotOraclePage.vue` (~3.5k lines), `LandingScene.vue` (~3k), `HoroscopeComponent.vue`, `CompatibilityPage.vue`. Maintainability only, not a bug. | NICE |
| AR-2 | **Dead code** — `netStatus.js` (no real offline detection), `PREMIUM_MODEL_LIMITS` (`premiumModel.js` — dead config, gating uses inline literals but docs call it source-of-truth → drift risk), dead edge fns `horoscope` + `tarot-draw` (client reads `horoscopes` table / draws locally). | NICE |
| AR-3 | **New untracked dup files** — `ios/App/App/config 2.xml`, `config 3.xml` (Capacitor/Xcode sync artifacts, forbidden ` 2`/` 3` suffix). Also `src/data/cardsV1/tarot_meta.json` lingering. Verify unused + remove. **Not deleted (needs owner OK).** | NICE |
| AR-4 | **Duplicated DOB→sign logic** in 3 places (Horoscope, Personal, ZodiacGuide) — consistent but should share one helper. | NICE |
| AR-5 | **Dead branches** — `HoroscopeComponent isThemeUnlockedByReward` L648 identical ternary arms; `confirmQuestion` empty branch (was unreachable). Cosmetic. | NICE |
| AR-6 | **Decorative emoji map** `LandingScene.vue:1180` (`🌟🔮💫…`) — NOT the forbidden `auto_awesome/✨`, but confirm intentional per the "no AI-ish icons" rule. | REVIEW |
| AR-7 | **Guest purchase → RC alias** — purchase before login can orphan entitlement; verify RC alias transfer in sandbox (also a billing concern). | SHOULD (billing) |

## 6. Server correctness gap carried into this audit
- **LR-26 (premium `detailed` leak at source)** — the `horoscopes` table read ships premium love/career `detailed` text to non-entitled clients (client strips before cache/DOM, but plaintext is on the wire). Mitigated at device layer only; **server-side entitlement read still open.** See UX_AUDIT F1 / APPLE_REVIEW / RELEASE_REPORT. **[code] SHOULD-FIX.**

## Verdict (Stage 1)
Architecture is **release-grade**: clean layering, strong test coverage, hardened backend, correct premium model. No build/lint/test blockers. Remaining items are maintainability (giant components), dead-code cleanup, the config dup files, and the one server-side content-leak (LR-26) that spans into compliance. Nothing here blocks submission on its own.
