# Device Checklist — manual QA on a real iPhone (pre-submit)

**What this is:** the tests that CANNOT be verified from code or `quasar dev` — they
need the built app on a real device (native iOS, WKWebView, StoreKit sandbox,
hardware). Walk top-to-bottom, tick each box, note anything that fails. This is the
owner's pass before **Submit for Review**.

Legend: `[ ]` todo · `[x]` pass · `[!]` fail (write a note). Fix `[!]` items or file them.

---

## 0. Setup (once)
- [ ] Build a **release/TestFlight** build (Xcode Archive) and install on a real iPhone. (A debug build on-device is fine for most, but IAP + performance want release.)
- [ ] Have a **Sandbox Apple ID** ready (Settings → App Store → Sandbox Account) for IAP.
- [ ] Confirm prod `VITE_RC_IOS_API_KEY` is in the release env (else purchases won't load).

---

## 1. Launch & app shell
- [ ] **Cold start (no white flash):** force-quit, relaunch. The gap between the splash and first paint must be dark (navy/black), **never a white flash**. [device-only]
- [ ] **Cold start speed:** first meaningful paint feels ≤ ~2s; no long blank hang.
- [ ] **Offline banner:** enable **Airplane Mode**, open the app / navigate → top banner "Немає з'єднання з інтернетом" appears; disable airplane → it slides away. (N6)
- [ ] **Offline degrade:** while offline, Home shows hero + fallback (no infinite spinner); Horoscope shows cached or an error+retry (not an endless skeleton); Tarot still opens.
- [ ] **Resume / midnight refresh:** background the app, wait (or change the device clock past midnight), reopen → Home greeting/date/streak/daily-progress update (not yesterday's). (N1)
- [ ] **Rotation / portrait lock:** rotate the phone → app stays portrait (or handles landscape without breaking). Confirm the intended orientation lock.
- [ ] **Safe areas:** notch/Dynamic-Island/home-indicator don't cover content or buttons on any screen.

## 2. In-app purchase / billing  ← highest reject risk (LR-12/13)
- [ ] **Catalog loads:** open Premium → plans + prices render (not "$0.00"/blank).
- [ ] **Purchase monthly (sandbox):** buy → success → premium unlocks (love/career, unlimited tarot, saved history).
- [ ] **Purchase yearly (sandbox):** same, on a fresh sandbox account.
- [ ] **Free trial label (if configured):** trial tile reads "N-day free trial", not "$0.00".
- [ ] **Restore Purchases (fresh install):** delete + reinstall, sign in, tap Restore → premium returns. (LR-12)
- [ ] **Cancel:** cancel the sub in Settings → premium persists until period end, then revokes on next check. (LR-12)
- [ ] **Entitlement survives restart:** buy → force-quit → relaunch → still premium. (LR-12)
- [ ] **Entitlement survives background→resume:** buy → background a while → resume → still premium. (LR-09)
- [ ] **Negative restore:** on an account with NO purchase, tap Restore → no unlock + a clear "no active purchases" message. (LR-12)
- [ ] **Guest purchase → sign in:** (if reachable) purchase, then sign in → entitlement follows the account (RC alias). Otherwise confirm purchase is gated behind sign-in (redirects to login).
- [ ] **Silent-charge messaging (B1):** if a purchase ever completes but premium doesn't unlock, the message says to tap Restore / contact support — NOT a bare "purchase failed".
- [ ] **Offline purchase/restore:** in airplane mode, tap Buy/Restore → a network error notice, no hang.
- [ ] **ASC:** both subscriptions show **"Ready to Submit"** and are attached to the version. (LR-13)

## 3. Auth & account
- [ ] **Sign in with Apple:** works → lands back where you started (redirect preserved).
- [ ] **Email OTP login:** request code → enter → success. Wrong code → clear inline error, retype works. Too many requests → "too many attempts" (not a generic error). (A3)
- [ ] **Sign up:** name + email → OTP → account created.
- [ ] **Sign out:** premium revokes; you're logged out.
- [ ] **Delete account:** Account → Danger Zone → confirm → account actually deleted, signed out. Relaunch → truly gone (5.1.1(v)).
- [ ] **Cross-account PII (A1):** account A saves a compatibility connection → sign out → sign in as B → B does NOT see A's saved people.

## 4. Core features (quick walk)
- [ ] **Tarot custom question:** the input is clearly visible (border/focus). Wheel opens on "Confirm question", disabled until ≥10 chars, then confirms. (this session)
- [ ] **Tarot draw:** rapid double-tap the deck → only ONE draw happens (no double). (T2)
- [ ] **Tarot free AI gift:** first AI reading on a fresh account is free; a spent-grant account shows an honest "already used — Premium" upsell, not a silent basic. (T3)
- [ ] **Focus-today (home):** with no sign chosen, the prompt shows in FULL (no "…" mid-word); with a sign, a short teaser → tap opens the full horoscope. (this session)
- [ ] **Horoscope:** energy free, love/career locked → tap opens paywall (no loop). Disclaimer visible at the end of the reading text. (T4/H2)
- [ ] **Disclaimers present:** tarot result, horoscope, personal horoscope, zodiac guide, compatibility each show "for reflection… not a prediction".
- [ ] **Compatibility reminder:** enable weekly reminder → if notifications are denied, a toast explains (not silent). (C1)
- [ ] **Daily card / card library / zodiac guide:** open, work offline-ish, no dead-ends.
- [ ] **All bottom-sheet close buttons** are tappable (no taps falling through).

## 5. Notifications
- [ ] **Permission prompt is contextual:** it appears only when you enable Daily Push in Settings (not at launch).
- [ ] **Grant → token registers;** **Deny → app still works**, toggle reflects off.
- [ ] **Receive a test push** (send one) → arrives, opens the right screen.

## 6. Accessibility & performance  [device-only]
- [ ] **VoiceOver:** enable → key buttons have labels; the horoscope sign wheel is steppable; nothing is an unlabeled trap.
- [ ] **Dynamic Type:** bump system text size → no clipping / overlap on main screens.
- [ ] **Contrast:** dark theme text is readable in bright light.
- [ ] **60fps:** tarot video stage + Home scroll are smooth; no stutter.
- [ ] **Memory:** run a long tarot session / navigate a lot → no crash or reload (memory warning).

## 7. Privacy / config  [device/ops]
- [ ] **Firebase IDFA:** confirm no IDFA collection (no `GoogleAppMeasurementIdentitySupport` pod) so the "no tracking" claim holds; reconcile `IS_ANALYTICS_ENABLED`.
- [ ] **PrivacyInfo.xcprivacy** matches the ASC App-Privacy answers you fill (LR-16).
- [ ] **Privacy + Terms URLs** open and load in-app (already 200 on web).
- [ ] **App Privacy + Age Rating (4+)** filled in ASC to match the manifest. (LR-16)

## 8. Screenshots & metadata (LR-14)
- [ ] Review the generated screenshots (6.9″ + 6.5″) in `app-store/screenshots/`, optionally polish, **upload to ASC**.
- [ ] Description/keywords set; keep the "for reflection/entertainment — does not predict the future" line; no "free"/superlatives/prediction claims.

---

## Submit gate
When sections 2, 7, 8 are green (LR-12/13/14/16) and nothing critical in 1/3/4/5
failed → **Submit for Review**. Anything minor from 6 can be a 1.0.1 fast-follow.
