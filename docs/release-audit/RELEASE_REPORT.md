# Stage 6 — Final Release Report

Date: 2026-07-02 · Arcana Insight (tarot + horoscope + astrology + compatibility), Vue 3 + Quasar + Capacitor → iOS.
Synthesizes `ARCHITECTURE_AUDIT.md`, `UX_AUDIT.md`, `TEST_MATRIX.md`, `EDGE_CASES.md`, `APPLE_REVIEW_AUDIT.md`.
Layer tags: **[code]** verified by reading/running · **[device]** needs a real run.

---

## 1. Executive Summary
The app is **engineering-complete and release-grade in its fundamentals**: production build passes, `eslint` clean, **249/249 tests**, a hardened Deno/Supabase backend (provider fallback, timeouts, EN+UK content-safety, auth, atomic ops), and a correct premium model (`premium ⇔ logged-in AND entitled`, server-authoritative RC check). A 6-surface adversarial audit found **no crash/blocker-class code defects**, but ~20 **SHOULD-FIX** quality/trust/compliance items and a longer NICE/debt tail. The **only hard submission gate is owner-operational** (finish IAP sandbox checks, mark subs Ready-to-Submit, upload screenshots, fill ASC privacy/age forms). Recommended before release: a small batch of quick code fixes (disclaimers, silent-charge messaging, cross-account PII clear, reward-spread guard, 404-for-fresh-users).

## 2. Overall project state
Solo dev, pre-first-submission. Launch plan was ~92/100 code-complete (2026-06-23); this deeper audit is more adversarial and nets the practical readiness to **~85/100** (extra SHOULD-FIX backlog + pending owner ops). No architectural rework needed. Distance to submit: **owner's ~40 min ASC/sandbox + ~1–2 days of optional quick fixes.**

## 3. Architecture assessment — 9/10
Clean layering (pages/components/helpers/services/stores), UI-less business logic as source-of-truth and node-unit-tested, static i18n bundle, global error net, atomic server RPCs, cascade delete. Main debt: a few giant components (TarotOracle ~3.5k, LandingScene ~3k) — maintainability only. Orphan `MainLayout.vue`; CLAUDE.md's "LandingScene у MainLayout" is stale (app uses BlankLayout).

## 4. Code quality — 8.5/10
Green build/lint/tests; consistent patterns; strong guard-rails. Deductions: giant components, dead code (`netStatus.js`, `PREMIUM_MODEL_LIMITS`, dead edge fns `horoscope`/`tarot-draw`), duplicated DOB→sign logic (×3) and Settings markup (×2), new untracked dup files `config 2.xml`/`config 3.xml` (not deleted — needs owner OK).

## 5. UI/UX — 7.5/10
Cohesive dark mystic system, unified `.arcana-btn`, safe-area aware, sheets fixed for the pointer-events trap. Gaps: home not refreshed on resume/midnight (N1); deep-link intent lost through onboarding (N2); 404 unreachable for fresh users (N3); duplicate Continue/Skip (N4); no offline cue (N6); orphan/back-less `/settings` (N8); no real light mode (N11). Recent session polish (focus-today full text, onboarding language picker, tarot input visibility) verified good.

## 6. Performance — 7/10 [mostly device]
Static-bundled i18n kills cold-start raw-key flash; fixed-width loading dots. Unverified from code: 60fps on giant components, video tarot stage under memory pressure, cold-start-to-paint. Needs a device pass (PERF-01..04).

## 7. Memory — [device]
Timers cleared on unmount in audited components; fire-and-forget tasks caught. Memory-warning behavior on the WKWebView video stage is device-only (EDGE 2.9).

## 8. Security — 8.5/10
Server-authoritative RC premium check (fail-open only on RC outage), `RC_ENFORCE_PREMIUM=true`, auth-gated `tarot-reading`/`send-broadcast`/`push-worker` (secret), timing-safe secret compares, structured non-leaking errors, no anonymous purchase path. **Open:** LR-26 — `horoscopes` read ships premium `detailed` to non-entitled clients (client strips, but plaintext on the wire) [code, H1].

## 9. Privacy — 8/10
Manifest populated (LR-08, plutil OK), hosted policy 200, processors disclosed, no IDFA/tracking claim. **Gaps:** ASC App-Privacy form not yet filled (must match manifest, LR-16); compatibility stores third parties' birth data locally and it **persists across account switches** (A1) — clear on logout + disclose.

## 10. Accessibility — [device]
Icon buttons carry aria-labels; horoscope wheel exposes arrow-stepping; 44pt targets addressed in a prior pass. VoiceOver/Dynamic-Type/contrast need a device pass (A11Y-01..05).

## 11. Localization — 9/10
en/uk parity tested; `pluralForm` correct; device-language default; recent uk copy pass fixed anglicisms/typos/Козеріг/em-dashes. Residual: long-uk-string layout is device-only (L10N-06); 429-on-send not localized on login/signup (A3).

## 12. StoreKit — 8/10 [code] / gated [ops]
RevenueCat integration solid: gated purchase/restore, entitlement resolution, restore, resume-refresh, logout de-alias, idempotent strictly-newer webhook, auto-renew/EULA disclosure. **Fix:** silent-charge messaging on success-without-entitlement (B1); disable Buy on missing price (B4); discounted-intro disclosure (B3). **Ops:** LR-12/13 sandbox + Ready-to-Submit.

## 13. Backend — 9/10
19 Deno edge fns, hardened: OpenAI→OpenRouter fallback, `fetchWithTimeout`, `containsDisallowed` (EN+UK), CORS/OPTIONS/method guards, atomic `ritual_award_points` + cascade delete. Dead: `horoscope`, `tarot-draw`. Open: entitlement-aware `horoscopes` read (LR-26).

## 14. AI features — 8.5/10
Tarot (woven narrative + adaptive clarifier), personal horoscope, batch horoscopes, compatibility — all provider-fallback + content-safety guarded, strict-JSON, fallbacks on failure (no infinite spinner). **Fixes:** free-AI sign-in promise can break (T3); missing "AI-generated" labeling on tarot gift (NICE); compatibility AI cache is global-by-sign-pair so "personal" is overstated (C7).

## 15. Analytics — 8/10
Paywall funnel fully instrumented; retention (`daily_active`, `ritual_complete`), onboarding, tarot mid-funnel events. Gaps: no theme/question-entry events in the tarot pre-draw funnel (this-session change was reverted per owner); router logs raw unknown paths as screen names (high-cardinality).

## 16. Crash risk — LOW [code]
No unguarded async that strands the UI in audited paths; global error net; Capacitor thenable-trap pattern respected; double-submit guards. Residual device-only crash surfaces: memory warning on video stage, 60fps under load. Highest logic risk = tarot deck re-entrancy (T2) — bad state, not a crash.

## 17. Apple review risk — MEDIUM (mostly ops)
See `APPLE_REVIEW_AUDIT.md`. Blockers are operational (IAP Ready-to-Submit + sandbox, screenshots, privacy/age forms). Code-side residual: fortune-telling disclaimer only on Compatibility (T4/H2); Firebase IDFA posture to confirm.

## 18. Technical debt
Giant components; dead code (netStatus, PREMIUM_MODEL_LIMITS, `horoscope`/`tarot-draw` fns, `cardsV1/tarot_meta.json`); duplicated DOB→sign + Settings markup; orphan `MainLayout`/`/settings`; `config 2/3.xml` dups; no real light mode; guest-purchase RC-alias to verify in sandbox.

## 19. Remaining bugs (consolidated, by surface)
Tarot: T1 reward bypass, T2 deck re-entrancy, T3 free-AI promise, T4 disclaimer, T5 empty-share inert, T6 kill-app value loss, T7 dead `tarot-draw`.
Billing: B1 silent-charge msg, B2 403 thrash, B3 intro disclosure, B4 price-pending CTA.
Horoscope: H1 detailed-leak (LR-26), H2 disclaimer, H3 locale re-gen, H4 401 handling, H5 wheel affordance.
Compatibility: C1 reminder-silent, C2 reminder-subject, C3 401 loop, C4 abandoned-mutate, C5 teaser-score exposure, C6 same-person, C7 global-cache framing.
Auth: A1 PII bleed, A2 dead reset-flow, A3 429-send, A4 Apple-upsert consistency, A5 offline-edit cue.
Nav/shell: N1 home-resume, N2 deeplink-onboarding, N3 404-fresh, N4 continue/skip, N5 launch-flash, N6 no-offline, N7 silent-home, N8 orphan-settings, N9 MainLayout, N10 dup-markup, N11 no-light-mode.

## 20. High-priority issues (fix before/at release)
B1 (silent charge → user charged, sees "failed"), H1/LR-26 (premium leak on wire), A1 (cross-account PII bleed), T1 (reward-spread free bypass), T4+H2 (missing disclaimer — compliance), N3 (404 broken for fresh users), N1 (stale home on resume).

## 21. Medium-priority issues
T2 deck re-entrancy, T3 free-AI promise, B2 403 thrash, C1/C2/C3 reminder+401, H3 locale re-gen, N2 deeplink, N4 continue/skip, N5 launch-flash, N6 offline cue, A2 reset flow.

## 22. Low-priority issues
T5, T6, T7, B3, B4, H4, H5, C4, C5, C6, C7, A3, A4, A5, N7, N8, N9, N10, N11 + all debt items.

## 23. Must-fix before release
**Hard gate (owner ops):** LR-12 sandbox 4 checks · LR-13 subs Ready-to-Submit · LR-14 upload screenshots · LR-16 privacy+age forms.
**Strongly recommended (code, ~1 day):** T4+H2 disclaimers · B1 silent-charge messaging · A1 PII-clear-on-logout · T1 reward-spread guard · N3 404-allowWithoutOnboarding. (Each is small and de-risks trust/compliance.)

## 24. Nice to have
Home resume-refresh (N1), deep-link preservation (N2), offline banner (N6), reminder fixes (C1/C2), 401 handler (H4/C3), reset-flow decision (A2), continue/skip (N4), dead-code + dup-file cleanup, disclaimer for AI-labeling, light-mode or remove the dead path.

## 25. Go / No-Go
**NO-GO to submit today** (owner ops undone; a few quick trust/compliance fixes recommended).
**GO after:** (1) LR-12/13/14/16 done, and (2) the ~1-day code batch in §23. That combination clears the reject blockers and the highest trust/compliance risks. The remaining backlog is safe as fast-follow (post-launch point releases).

## 26. Release Readiness Score — **85 / 100**
Build/CI 95 · Architecture 90 · Security 85 · Privacy 80 · UX 75 · StoreKit 80 (code) / gated (ops) · Backend 90 · Localization 90 · A11y/Perf unscored (device). Weighted ≈ **85**. (Launch-plan's 92 predates this adversarial pass; 85 reflects the SHOULD-FIX backlog surfaced here.)

## 27. Estimated App Store approval probability
- Submit today (ops undone): **~30%**.
- After LR-12/13/14/16 only: **~80–85%**.
- After ops + disclaimers (T4/H2) + Firebase-IDFA confirm: **~90–93%**.

## 28. Top 20 riskiest places
1. IAP Ready-to-Submit + Restore during review (LR-12/13) · 2. Screenshots/metadata unfilled (LR-14) · 3. ASC App-Privacy form vs manifest (LR-16) · 4. B1 silent-charge (money-in-no-access-msg) · 5. H1/LR-26 premium `detailed` on wire · 6. A1 cross-account PII bleed · 7. T1 reward-spread free bypass · 8. T4/H2 fortune-telling disclaimer gap · 9. T2 deck double-tap re-entrancy · 10. N3 404 broken for fresh users · 11. N1 stale home on resume · 12. B2 403 revoke thrash · 13. C3/H4 401 retry loops · 14. N2 deep-link lost through onboarding · 15. N6 no offline state (airplane-mode review) · 16. N5 launch-flash color/config · 17. Firebase IDFA posture vs no-tracking claim · 18. T3 free-AI promise break · 19. C1/C2 reminder silent/wrong-subject · 20. Guest-purchase RC alias (verify sandbox) + `config 2/3.xml` dup hygiene.

## 29. Step-by-step pre-release plan
1. **Code batch (~1 day):** wire disclaimer on tarot/horoscope/personal/zodiac (T4/H2); B1 messaging + startup RC-id assertion; add compat keys to `clearAccountScopedLocalState` (A1); guard reward-spread consume + deck re-entrancy (T1/T2); `allowWithoutOnboarding` on catchAll (N3); home visibility/resume refresh (N1). Add a Playwright/unit regression per fix. `npm test` + `eslint` + `quasar build` green.
2. **Confirm Firebase no-IDFA**; reconcile `IS_ANALYTICS_ENABLED`.
3. **Delete** `config 2.xml`/`config 3.xml` + dead `tarot-draw`/`horoscope` fns (with your OK).
4. **Owner ops:** LR-12 sandbox 4 checks → LR-13 Ready-to-Submit → LR-14 upload screenshots → LR-16 privacy+age forms.
5. **Regression device pass** (Manual QA checklist + device-only items below).
6. **Archive with Xcode 14+**, validate, **Submit**.
7. **Fast-follow backlog:** N2/N6/C1-3/A2/H3 + debt in a 1.0.1.

## 30. Final pre-Submit checklist
- [ ] `npm test` green · `eslint` clean · `quasar build` OK
- [ ] Disclaimer visible on tarot + horoscope + personal + zodiac
- [ ] B1 silent-charge messaging + RC-id startup assertion
- [ ] Cross-account PII cleared on logout (A1)
- [ ] Reward-spread + deck re-entrancy guarded (T1/T2)
- [ ] 404 reachable for not-onboarded (N3)
- [ ] Firebase no-IDFA confirmed; `PrivacyInfo.xcprivacy` matches ASC form
- [ ] LR-12 sandbox: purchase / restore / cancel / restart-persist / negative-restore ✅
- [ ] LR-13 both subs "Ready to Submit" + attached to version
- [ ] LR-14 screenshots uploaded (6.9″ + 6.5″)
- [ ] LR-16 Age Rating 4+ + App Privacy answered to match manifest+policy
- [ ] Privacy + Terms URLs 200 (re-verify at submit — verified 200 on 2026-07-02)
- [ ] Device pass: offline, memory-warning, rotation-lock, white-flash, VoiceOver, 60fps
- [ ] `config 2/3.xml` dup files removed
- [ ] Prod `VITE_RC_IOS_API_KEY` in release env

---

# Stage 7 — Consistency re-check (<95% confidence areas)

**Contradictions reconciled:**
- Nav agent flagged "PrivacyInfo.xcprivacy not found" — **incorrect** (agent lacked launch-plan context). Per LR-08 the manifest **is** populated + `plutil -lint OK`. Resolved: manifest present; the real open item is the *ASC form* (LR-16), not the manifest.
- Multiple agents independently confirmed the same premium 403→revoke path — consistent (no contradiction), and jointly surfaced the thrash risk (B2). Confidence: high.
- H1 (server ships `detailed`) and the client-strip mitigation both confirmed — consistent; the leak is on the wire only. Confidence: high [code].

**Lowest-confidence (<95%) — require a device pass; NOT claimed verified here:**
1. White/launch-flash actual appearance + which `capacitor.config` the iOS build consumes (N5).
2. 60fps on TarotOracle/LandingScene; memory-warning on the video stage (PERF/Memory).
3. Network handoff (WiFi↔LTE) mid-AI request behavior (EDGE 3.6).
4. VoiceOver / Dynamic-Type / contrast (A11Y).
5. Real IAP sandbox: restore/cancel/restart-persist/negative-restore (LR-12) — code paths look correct but only a device confirms.
6. Firebase IDFA posture (needs the built binary / pods).
7. Portrait orientation lock (Info.plist not in audit scope).

**Gaps intentionally not deep-audited (out of the 6 surfaces):** ritual/streak engine internals (parked rewards), push delivery on device, deep-linking entitlement config, the `build-astro-context` cron accuracy. Recommend a targeted pass on ritual/streak before enabling rewards post-launch.

**Net conclusion:** high confidence [code] on architecture, security, billing logic, auth, i18n, backend safety; the release decision rests on completing owner-ops + the §23 quick batch, then a disciplined device pass for the 7 items above. No evidence of a hidden crash/blocker in the audited code.
