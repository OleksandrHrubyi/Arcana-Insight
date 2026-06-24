# Submit Checklist — final steps before App Store

> Do top to bottom. Don't hit **Submit for Review** until every 🔴 box is checked.
> Owner: 👤 = you · 🤖 = assistant-done (verify). References point to prepared cheat-sheets.

---

## 0. Code & QA gate (do FIRST)
- [ ] 👤 **Finish the manual QA pass** — walk `docs/manual-qa-checklist.md` §B on a real iPhone; log issues in §E; send them to me to fix. *(Not a formality — this week's manual passes found black screen, premium leak, AI-tarot outage. Expect a few more.)*
- [x] 🤖 Code health: all known bugs fixed; tests 220/220; `quasar build` + `cap sync` green; Crashlytics verified on device.
- [ ] 👤 After the QA pass + any fixes: one final `git pull` so the build includes everything.

## 1. Secrets & hosted URLs (🔴)
- [ ] 👤 **Rotate `RC_WEBHOOK_SECRET`** — set your own value in **Supabase secrets** AND the **RevenueCat dashboard webhook** (must match). *(A temporary test value is live now.)*
  `supabase secrets set RC_WEBHOOK_SECRET=<your-strong-secret>`
- [ ] 👤 **Re-publish Privacy Policy** — push the updated `app-store/privacy-policy.html` (now lists OpenRouter + Open-Meteo) to `oleksandrhrubyi.github.io/Arcana-Insight/privacy-policy.html`; open it in a browser to confirm.
- [ ] 👤 **Host + verify Support URL** (`app-store/support.html`) — must load; you'll paste it into ASC.

## 2. App Store Connect — product config (🔴)
- [ ] 👤 **Subscriptions → "Ready to Submit"** (P0-5): both `arcana.premium.monthly` + `arcana.premium.yearly` — localized name/description, price, **review screenshot** uploaded; attach them to the app version.
- [ ] 👤 **App Privacy** form — fill per `app-store/asc-age-rating-and-privacy.md` (8 data types, Linked=Yes, Tracking=No). Must match `PrivacyInfo.xcprivacy`.
- [ ] 👤 **Age Rating** — all None/No → **4+** (Made for Kids = No).
- [ ] 👤 **App Review Information → Notes** — paste from `app-store/reviewer-notes.md` (includes "Premium requires sign-in; restores on sign-in; use a Sandbox account").
- [ ] 👤 **Metadata** — name/subtitle/description/keywords from `app-store/asc-metadata.md`; **Support URL** + **Privacy Policy URL** set; category = Lifestyle.
- [ ] 👤 **Screenshots** — review `app-store/screenshots/` (6.5" + 6.9"), optionally add captioned marketing frames, upload.

## 3. Build & upload (🔴)
- [ ] 👤 `npx cap sync ios` (final), confirm version = **1.0 / build ≥ 13** in Xcode (bump build if re-uploading).
- [ ] 👤 Xcode → **Product → Archive** → **Distribute App → App Store Connect → Upload**.
- [ ] 👤 In ASC version page → select the uploaded build → ensure subscriptions are attached.
- [ ] 👤 Confirm AppIcon shows (no missing-asset error on upload). *(Verified opaque 1024² already.)*

## 4. Submit
- [ ] 👤 **Submit for Review.**

## 5. Right after submission
- [ ] 👤 Watch **Crashlytics** (Firebase console), **RevenueCat** (purchases), and Firebase **Analytics funnel** for the first real traffic.
- [ ] 👤 When confident there are real subscribers with `user_entitlements` rows, you may keep `RC_ENFORCE_PREMIUM=true` (already on; no action).

---

## Deferred to v1.1+ (NOT blockers — see docs/release-action-plan.md P2)
- LandingScene home-block + ZodiacGuide "my sign" silent-failure polish (low impact; fix in the LandingScene refactor).
- Crashlytics dSYM Run Script (symbolicated Debug crashes; release dSYMs auto-upload with the archive).
- IAP sandbox D/E (cancel-expiry, restore-as-non-subscriber); full accessibility pass; web push; god-component refactors.

## Top Apple-rejection risks to keep in mind
- **3.1.2** subscription disclosure — ✅ in the paywall; also ensure subs metadata is complete.
- **2.1** IAP must work in review — ✅ verified on device; reviewer notes explain sign-in.
- **4.2** hybrid "minimum functionality" — defensible (push, IAP, Apple Sign In, haptics, real astro engine); reviewer notes help.
- **5.1.1** account deletion — ✅ in-app; data fully removed (atomic cascade).
