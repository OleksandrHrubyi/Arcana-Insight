# Stage 5 — Apple App Store Review Simulation

Date: 2026-07-02. Reviewed as if submitting today, against current App Review
Guidelines. Verdict tags: **PASS** · **RISK** (possible reject / needs action) ·
**BLOCKER** (submit-gating). Layer [code]/[device/ops].

---

## Guideline-by-guideline

### 2.1 App completeness / IAP works during review — **RISK (owner-operational)**
Apple purchases during review. Purchase works end-to-end on real device (RC→webhook→entitlement verified live, LR-12). **Not yet done:** the 4 remaining sandbox checks (Restore / Cancel / entitlement-survives-restart / negative-restore) and subscriptions confirmed **"Ready to Submit"** in ASC (sandbox tile showed `UNRATED`, LR-13). If a reviewer hits a subscription still `UNRATED` or a broken Restore → **reject**. This is the single highest reject probability. [ops]

### 3.1.1 / 3.1.2 In-app purchase & subscriptions — **PASS (code)**
- All digital unlocks go through StoreKit/RevenueCat; no external purchase links.
- **Restore Purchases** present + functional (`PremiumInfoComponent.vue:128`). PASS.
- Auto-renew disclosure complete: paywall footnote (`messages.bundle.js:2025`) + in-app Terms `termsSubscription` (auto-renew, period, price, cancel ≥24h, manage in App Store) + Apple standard EULA link. PASS.
- Price/period shown per tile + "≈ $X/mo". Free-trial label truthful (RC intro price 0 verified). **RISK NICE:** a *discounted* (non-free) intro shows only raw `offerLabel` — ensure duration + then-price are explicit (3.1.2 intro-offer disclosure). BUG B3.

### 5.1.1(v) Account deletion — **PASS (code)**
Reachable in Account → Danger Zone, two-step confirm, and **actually deletes** via `admin.deleteUser` + ON DELETE CASCADE across all user tables (`delete-account/index.ts:93`). Not "contact us". Failure keeps account + notifies. PASS.

### 4.8 Sign in with Apple — **PASS (code)**
Offered on iOS; the only other login is first-party email OTP (no third-party social login exposed — `telegram-auth` has no UI). Apple is present regardless. PASS. *(If Telegram login is ever surfaced, Apple must stay offered.)*

### 5.1.1 / 5.1.2 Privacy — data collection & manifest — **PASS code / RISK ops**
- `PrivacyInfo.xcprivacy` populated (LR-08): UserDefaults reason `CA92.1`, collected types incl. Device ID + Other User Content (tarot question), `NSPrivacyTracking=false`, empty tracking domains, `plutil -lint OK`. PASS [code].
- Hosted **Privacy Policy + Support URLs return HTTP 200** (verified this run). Policy lists processors (OpenAI, Supabase, RevenueCat, Firebase). PASS.
- **RISK [ops]:** the ASC **App Privacy questionnaire** (LR-16) is not yet filled — must be completed and **match the manifest + policy** (8 data types, all Linked / no Tracking). A mismatch is a common metadata reject. Cheat-sheet ready in `app-store/asc-age-rating-and-privacy.md`.
- **RISK [code-quality]:** compatibility stores **third parties' birth data** locally and it **persists across account switches on a shared device** (BUG A1). Not a hard reject, but a data-handling weakness — clear it on logout and ensure the policy discloses storing others' birth data.

### 2.5.x ATT / IDFA — **PASS (verify)**
No ATT prompt (none needed). App ships Firebase Analytics with `NSPrivacyTracking=false`. **Verify** Firebase is configured with **no IDFA** (no `GoogleAppMeasurementIdentitySupport` pod) so the no-tracking claim holds. `GoogleService-Info.plist IS_ANALYTICS_ENABLED=false` vs runtime `setEnabled(true)` — reconcile the posture (documented in LR-08). [ops]

### 4.2 Minimum functionality / 4.3 Spam — **PASS**
Rich multi-feature app (tarot + horoscope + compatibility + astro + rituals), not a template/web-wrapper in spirit. PASS.

### 1.1 / 5.x Fortune-telling & generated content — **RISK (medium)**
Fortune-telling apps are allowed, but Apple rejects apps that **claim to predict the future / give harmful guidance**. Defenses are strong: server system prompts forbid determinism; `containsDisallowed` (EN+UK) blocks fatalism/medical/financial/soulmate/marry-divorce, drops unsafe output → fallback (`tarot-reading`, `personal-horoscope`, `generate-horoscopes`). **RISK:** a "for reflection/entertainment, not prediction" **disclaimer exists but is wired only to Compatibility** — tarot, horoscope, personal-horoscope, zodiac-guide have none (BUG T4/H2). Add it on those surfaces; it's the standard, cheap guard against 1.1 discretion. Copy already in bundle (`messages.bundle.js:1361`).

### 4.1 / 2.3.x Metadata & screenshots — **BLOCKER (owner)**
Screenshots: raw set generated at exact 6.9″/6.5″ dims (LR-14), **not yet uploaded**. Description/keywords drafted (ASO section of launch plan) — keep the "for reflection/entertainment — does not predict the future" line, avoid "free"/superlatives/prediction claims. Must upload + fill metadata before submit. [ops]

### Age rating — **RISK (low)**
Set to **4+** (LR-16). A fortune-telling app can be bumped to **12+** at reviewer discretion (infrequent/mature themes). Not a reject, just a rating change; answer the questionnaire honestly. [ops]

### 4.5.x Push notifications — **PASS**
Permission requested **contextually** (only when enabling Daily Push in Settings), not at launch. `PushNotifications` presentation options declared. Own APNs worker now auth-gated (`ADMIN_PUSH_SECRET`). PASS.

### 2.5.1 Background modes / capabilities — **PASS**
Only remote-notifications; no undisclosed background execution. PASS.

### Deep / Universal links — **PASS (with UX gap)**
No Universal Links entitlement issues in scope. Note the UX bug N2 (deep-link intent dropped through onboarding) — not a review item, but hurts push-driven retention.

---

## Reject-risk register (most→least likely)
| # | Risk | Guideline | Severity | Owner/Code |
|---|---|---|---|---|
| 1 | Subscriptions not "Ready to Submit" / Restore or sandbox checks fail during review | 2.1 / 3.1.2 | **BLOCKER** | ops (LR-12/13) |
| 2 | Screenshots not uploaded / metadata incomplete | 2.3 | **BLOCKER** | ops (LR-14) |
| 3 | App Privacy form unfilled or mismatched vs manifest | 5.1.1 | HIGH | ops (LR-16) |
| 4 | Fortune-telling framing — no disclaimer on tarot/horoscope | 1.1 | MEDIUM | code (T4/H2) |
| 5 | Firebase IDFA posture unconfirmed vs no-tracking claim | 2.5 | MEDIUM | ops/code |
| 6 | Third-party birth-data handling (local, cross-account) | 5.1.1 | LOW-MED | code (A1) |
| 7 | Intro-offer (discounted) disclosure thin | 3.1.2 | LOW | code (B3) |
| 8 | Age rating bumped to 12+ | — | LOW (not reject) | ops |

## Probability of approval
- **If submitted TODAY as-is (LR-12/13/14/16 not done):** ~**30%** — near-certain "metadata/IAP incomplete" bounce.
- **After completing the 4 owner-operational items (LR-12/13/14/16) with no other change:** ~**80–85%**. Residual risk = fortune-telling discretion (#4) + Firebase IDFA (#5).
- **After also adding the disclaimer on tarot/horoscope (#4) and confirming Firebase no-IDFA (#5):** ~**90–93%**.

## Critical blockers before "Submit for Review"
1. **LR-12** — finish 4 sandbox checks (Restore / Cancel / restart-persist / negative-restore) on a real device + sandbox account; confirm prod `VITE_RC_IOS_API_KEY`.
2. **LR-13** — both subscriptions **"Ready to Submit"** + attached to the version.
3. **LR-14** — upload screenshots.
4. **LR-16** — fill Age Rating (4+) + App Privacy questionnaire to match the manifest.
5. **(Strongly recommended, code)** add the reflection/entertainment disclaimer to tarot + horoscope + personal + zodiac (T4/H2), and confirm Firebase ships no IDFA.
