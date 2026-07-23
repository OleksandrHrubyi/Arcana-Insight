# Screen Status — page-by-page tracker

Living tracker for finishing the app one screen at a time. Pairs with:
- `docs/screen-contracts.md` — the contract each screen must satisfy
- `docs/definition-of-done-mobile.md` — when a screen is "done"
- `docs/canonical-files.md` — which file is the active one

Status legend: 🟢 solid · 🟡 needs UX/polish review · 🔴 known regression/blocker · ⚪ thin wrapper (logic lives in component)

> Structural flags below come from a code snapshot (size, `display:none` blocks, `console.*`, TODO markers), **not** a full UX review. Each screen still needs a real review pass per the process at the bottom.

## How to read "flags"
- **none:N** — N `display:none` blocks → verify each is intentional, not abandoned/half-built UI.
- **console:N** — N `console.*` calls → remove debug logs before App Store (keep only real error logging).

## Tracker

| Screen | Route | Active file | Flags | Status | Known gaps / next |
|--------|-------|-------------|-------|--------|-------------------|
| Home | `/` | `components/main/LandingScene.vue` | console:4 (catch-only) | 🟢 | RP-03 (2026-07-23): `.daily-track` chip replaced by the full-width single-row `.ritual-band` in the header (4-dot progress + adaptive CTA → journal-first; owner rejected a two-row sky-line variant — it pushed the astro strip down and duplicated the MOON PHASE card); circle hero scaled ×0.92, eyebrow "DAILY CARD"; all 6 baselines (iphone-14/se × 3 states) regenerated + reviewed. Cold-start reveal bug fixed; daily-progress + adaptive next-action added; astro-strip de-duped; App Store pass done (card skeleton, ≥14px primary copy, tightened intro, unified num icon). Verified via Playwright QA screenshots (iphone-14, `?qa=home`). Bottom-margin reduction was tried and **reverted** — the bottom nav IS shown on home (the `hideBottomNav` route meta is dead/unused; nav hides only via the `body.hide-bottom-nav` class, which home never sets). 4 `display:none` confirmed intentional. |
| Daily Card | `/daily` | `components/main/DailyCardComponent.vue` (810) | console:4 | 🟡 | Confirm teaser vs full-interpretation separation per contract. |
| Horoscope | `/horoscope` | `components/main/HoroscopeComponent.vue` (2704) | none:6 console:10 | 🟡 | 6 `display:none` — verify intentional. Heavy debug logging. |
| Personal Horoscope | `/personal-horoscope` | `pages/PersonalHoroscopePage.vue` (804) | console:4 | 🟡 | Birth-date dependency + loading/error visibility per contract. |
| Tarot | `/tarot` | `components/TarotOraclePage.vue` (3185) | none:1 console:5 (catch-only) | 🟢 | Deep-audit + real-session pass (2026-06). Security: AI `tarot-reading` auth-required (`verify_jwt`), client AI timeout 65s. Billing: DB save premium-gated (matrix-aligned). Reliability: interpretation-error rendered; logs 10→5. i18n: all copy/ternaries → `tarotOracle.ui.*`/`tarotSpreads`. UX: intro plays once per session (no replay on re-entry); honest `· Reward`/`· Premium` wheel. Analytics: full mid-funnel (`TAROT_SESSION_EVENTS`). a11y: `prefers-reduced-motion`, 44px targets. **Real-session depth:** theme-matched spread positions (`tarotSpreads`: relationships→You/Them/Between, decision→Option A/B/Unseen…); adaptive **clarifying question** before the draw (premium, `mode:'clarify'`, hard fallback to normal flow); woven-narrative AI prompt. **Needs `supabase functions deploy tarot-reading`** + device QA. |
| Tarot Interpretation | `/tarot-interpretation` | `pages/TarotInterpretationPage.vue` (719) | console:5 | 🟢 | i18n complete (`tarotInterpretation.*`, no ternaries). Premium preview no longer misrepresents free content. Post-session upsell impression tracked. 44px targets. **Real-session depth:** each card shows its position meaning ("Shadow — what works beneath the surface"), theme-aware via `tarotSpreads` with generic fallback. |
| Compatibility | `/compatibility` | `pages/CompatibilityPage.vue` (1581) | none:1 console:0 | 🟢 | Premium gating restored 2026-06-15; contract tests green. UX review of preview/lock split still useful. |
| Saved Readings | `/readings` | `pages/SavedReadingsPage.vue` (1119) | none:1 console:7 | 🟡 | Candidate home for the journal/reflection retention feature. |
| Premium | `/premium` | `components/main/PremiumInfoComponent.vue` (1485) | none:2 console:3 | 🟡 | Verify free/locked/premium paths + restore visibility. |
| Menu | `/menu` | `components/main/MenuComponent.vue` (930) | console:1 | 🟢 | Utility hub; light review. |
| Onboarding | `/onboarding` | `components/main/OnboardingComponent.vue` (614) | clean | 🟡 | Guard logic + first-session momentum; verify duplicate-component note in CLAUDE.md is resolved. |
| Zodiac Guide | `/zodiac-guide` | `components/main/ZodiacGuideComponent.vue` (1707) | console:10 | 🟡 | Heavy debug logging. |
| Card Library | `/cards` | `pages/CardLibraryPage.vue` (755) | none:1 console:3 | 🟡 | Browse/search review. |
| Ritual Rewards | `/rewards` | `pages/RitualRewardsPage.vue` (1490) | none:1 | 🟡 | Tie into daily-ritual loop. |
| Account | `/account` | `pages/AccountPage.vue` (1448) | none:1 | 🟢 | Email intentionally read-only with explanatory hint (`accountPage.emailNote`). Prod console.* stripped at build (quasar.config esbuild.drop). |
| Settings | `/settings` | `pages/SettingsPage.vue` (16, ⚪ wrapper) | — | 🟡 | Confirm component target + content completeness. |
| FAQ / Support | `/support` | `pages/FaqSupportPage.vue` (12, ⚪ wrapper) | — | 🟡 | Confirm component + live content. |
| Privacy / Terms | `/privacy-terms` | `pages/PrivacyTermsPage.vue` (12, ⚪ wrapper) | — | 🔴 | App Store **requires** live, accurate privacy + terms. Verify content + URLs. |
| Auth (login/signup/confirm/reset) | `/login` `/sign-up` `/confirm-code` `/reset-password` | `components/auth/*` | — | 🟡 | Sign-up keeps birth date out of step 1 (contract-tested). Review full auth flow. |

## Cross-cutting cleanup (not per-screen)
- **Debug logs:** ✅ Resolved — `quasar.config.js` strips `console.*`/`debugger` from production builds (esbuild `drop`, prod-only). Dev logs remain.
- **Tests:** 241/241 green as of 2026-06-28. Run `npm test` after each screen change; many screens have contract tests.

## Per-screen work process (do this for each row)
1. Read its contract in `docs/screen-contracts.md` (if missing, that screen has no contract yet — add one first).
2. Invoke the matching skill(s): `arcana-core-product` always; plus `arcana-content-guardrails` / `arcana-daily-ritual-ux` / `arcana-premium-trust` / `arcana-i18n-consistency` / `arcana-routing-and-flow-guardrails` / `arcana-analytics-and-conversion` as relevant; `docs/skills/*` for layout/App-Store/iOS.
3. Verify the active file via `docs/canonical-files.md` before editing.
4. Make targeted edits (no structural refactors unless required).
5. Check against `docs/definition-of-done-mobile.md`.
6. `npm test` + lint; for UI, verify on a real mobile screenshot.
7. Update this row's status.
