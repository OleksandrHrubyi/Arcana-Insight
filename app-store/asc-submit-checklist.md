# Arcana v1.0.1 — App Store Connect submit checklist

Astronomy repositioning resubmit (v1.0 build 62 was rejected under **4.3(b)**).
Canonical copy: `app-store/asc-metadata.md`. Reviewer notes: `app-store/reviewer-notes.md` (v4).
Tick each box in App Store Connect. Order = the ASC version page top-to-bottom.

---

## 0. Before you open ASC
- [ ] Confirm the two hosted URLs return **200** (a 404 = instant 5.1.1 reject):
  - https://oleksandrhrubyi.github.io/Arcana-Insight/privacy-policy.html
  - https://oleksandrhrubyi.github.io/Arcana-Insight/support.html
- [ ] Delete `ios/App/Pods/**/Frameworks 2/` junk dirs before archiving (IDFA/IdentitySupport footgun).
- [ ] `npm run iosprep` → run on a **real iPhone** once: onboarding → Home (Moon) → Sky (best-time, tour, ISS bell) → Journal. No crashes, haptics fire, no blank states (Guideline 2.1 / 4.2).

## 1. App Information (app-level, not version)
- [ ] **Name (≤30):** `Arcana: Night Sky & Moon`  (uk: `Arcana: Небо і Місяць`)
- [ ] **Subtitle (≤30):** `Moon, planets & tonight's sky`  (uk: `Місяць, планети й небо вночі`)
- [ ] **Primary category → Reference** (secondary: Lifestyle). ⬅ change from the old Lifestyle — reinforces the non-divination identity.
- [ ] **Privacy Policy URL** set (above).
- [ ] Content rights: no third-party content (RWS tarot deck is public domain).

## 2. Version metadata (1.0.1 — the version page)
- [ ] **Promotional Text (≤170):** the astronomy-first line from asc-metadata.md.
- [ ] **Keywords (≤100):** `moon phase,stargazing,astronomy,night sky,planets,moon calendar,iss,milky way,journal,meteor` (uk: `фази місяця,астрономія,нічне небо,планети,зорі,мкс,чумацький шлях,щоденник,календар місяця,метеори`). Без `tarot,horoscope` — прибрано до апруву (рішення 2026-08-01), повернути metadata-update'ом після апруву.
- [ ] **Description:** paste the astronomy-first description (leads with the sky tool; subscription block + EULA + privacy links at the end). uk locale too.
- [ ] **What's New (1.0.1):** the "now built around the real night sky" copy.
- [ ] **Support URL / Marketing URL** set.
- [ ] Add the **uk** localization (name, subtitle, keywords, description, what's-new) — all in asc-metadata.md.

## 3. Screenshots ⬅ THE thing that sank the last attempt
- [ ] Upload the **regenerated astronomy-first set** from `app-store/screenshots/`:
  `1-home, 2-sky-observe, 3-sky-moon, 4-sky-events, 5-sky-visible, 6-journal, 7-menu, 8-premium`.
- [ ] Sizes: **6.9" 1320×2868** and **6.5" 1242×2688** (smaller sizes auto-scale).
- [ ] Confirm shot #1 (Home) is first — the Moon over the Milky Way, NOT a tarot card.
- [ ] Do **NOT** re-upload the old journal/tarot set (deleted from the repo — don't resurrect).
- [ ] (Optional) retake #8 (premium) on a real device so it shows live pricing instead of "Purchases unavailable".

## 4. Subscriptions / In-App Purchases
- [ ] `arcana.premium.monthly` & `arcana.premium.yearly` both **"Ready to Submit"**, attached to this version's build.
- [ ] Subscription **display names + descriptions** (en+uk) match asc-metadata.md; group localization present.
- [ ] Each sub has a **review screenshot** of the paywall.
- [ ] The **yearly free trial** intro offer is attached to the RevenueCat offering (already configured — verify it still shows in-app).
- [ ] IAP tested end-to-end on a **Sandbox** account (purchase + Restore). No dead price tiles.

## 5. App Privacy (nutrition label)
- [ ] Data types match `PrivacyInfo.xcprivacy` + the policy: Email, DOB, User ID, Device ID, Purchase History, Product Interaction, Other User Content (tarot question) — all **Linked = Yes**, **Tracking = No** (no IDFA/ATT).
- [ ] Firebase Analytics reconciled: `GoogleService-Info.plist IS_ANALYTICS_ENABLED` vs runtime — the App Privacy answers must be truthful.

## 6. Age Rating
- [ ] Answer honestly → **4+** likely (astronomy/journal primary; optional tarot/horoscope in Menu). Accept 9+/12+ if the reviewer raises it. Made for Kids = No.

## 7. App Review Information
- [ ] Paste **reviewer-notes.md (v4)** verbatim — it opens with the 4.3(b) response, names "Arcana: Night Sky & Moon", explains the on-device astronomy + divination-in-Menu, and the 5.1.1 sign-in-before-purchase justification.
- [ ] **Re-record the demo video** (astronomy flow: onboarding → Home Moon → Sky best-time/ISS → Journal). Any old tarot/journal-led video CONTRADICTS the submission — remove it if you can't re-record.
- [ ] Contact first/last name + phone + email filled.
- [ ] "Sign-in required" checkbox **OFF** (free tier is fully reviewable without an account).
- [ ] If you provide a demo account, make sure it actually works; otherwise leave it out.

## 8. Build
- [ ] Archive the current build in Xcode (version 1.0.1, bump build number), validate — no icon/architecture/privacy-manifest warnings.
- [ ] Attach the build to the version; confirm export compliance = **ITSAppUsesNonExemptEncryption false** (standard HTTPS only).

## 9. Submit
- [ ] Review everything once more, then **Submit for Review**. Expect ~24h–3 days.

---

## Rejection-risk assessment (highest → lowest) + fix before submit

1. **4.3(b) again (the whole reason for v1.0.1).** MITIGATED: divination is verified secondary (only in Menu, never Home/Sky/Journal/a tab); real on-device astronomy instrument; astronomy-first name/subtitle/keywords/description/screenshots.
   → **Residual risk = the ASSETS.** If any old tarot-first screenshot, the old "Daily Sky Journal"/"Tarot & Horoscope" reviewer note, or a tarot-led demo video reaches ASC, it re-triggers 4.3(b). **Double-check §3 and §7.**
2. **2.1 / 4.2 (Capacitor wrapper feels like a website).** MITIGATED: haptics on every tap, offline soft-fail, native widget, real computed data. → Do the real-device pass (§0) so nothing shows a blank/loading dead-end.
3. **3.1.2 (auto-renew disclosure).** MITIGATED: full subscription block in the description + in-app Terms. → Just confirm it's in the pasted description.
4. **5.1.1 (account before purchase).** MITIGATED: justified in reviewer notes; free tier needs no account; Restore visible. → Confirm the "Sign-in required" box is OFF.
5. **Privacy-label mismatch.** → Make §5 match the manifest + policy exactly (esp. the analytics posture).
6. **404 on privacy/support URL.** → §0 first box.

Owner-only, all above. Nothing left in code.
