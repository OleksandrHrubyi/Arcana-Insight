# Arcana Insight App Store Release Plan

## Goal

Ship a review-safe iPhone build to App Store Review with:

- stable auth and account flows
- compliant privacy and subscription UX
- a functional home screen
- no obvious dead ends, misleading states, or unfinished flows

Current status: not ready for submission.

## Release Rule

Do not submit until all `Must ship` items are done and verified on a real iPhone build.

## Priorities

### Must ship

- Separate login from signup logic.
- Remove mandatory date of birth from signup, or justify it as truly core and collect it later.
- Fix account email editing so it updates real auth email, or remove edit email UI.
- Make delete account failure states visible and understandable.
- Fix cold-start auth guard so protected routes do not redirect before session restore completes.
- Rewrite privacy policy and terms to match actual data flows and SDK usage.
- Make Privacy and Terms links land on the correct destination or section from the paywall.
- Strengthen paywall disclosure and subscription clarity.
- Rework home screen into an action hub.
- Verify reset-password flow on a real iPhone end-to-end.
- Enforce fresh web build plus Capacitor sync before every iOS archive.
- Resolve failing tests and run a clean release verification pass.

### Should ship

- Remove or hide legacy screens and duplicate files from the release surface.
- Improve onboarding so it explains value, not just aesthetics.
- Add visible content disclaimer near tarot and horoscope flows.
- Simplify first tarot session and reduce confusion.
- Unify saved reading behavior across flows.
- Align app naming across iOS bundle display name, product name, and metadata.
- Add a recovery path to iOS Settings after push permission denial.
- Strengthen support surface beyond a bare mailto link.

### Nice to have

- Add a "continue where you left off" block on home.
- Add better empty states for premium and profile-dependent screens.
- Add demo mode or reviewer-safe sample path if review access is fragile.

## Two-Week Plan

## Week 1

### Day 1: Auth and account audit

- Map every auth path: email login, email signup, Apple sign-in, Google sign-in, confirm code, logout, reset password.
- Decide target behavior for each path in one short spec.
- Confirm whether guest mode is a first-class product mode.
- Audit router guard behavior on cold app launch with an existing stored session.
- Freeze any new feature work until auth/account issues are closed.

Exit criteria:

- One agreed auth matrix exists.
- Team knows which flows are guest, optional account, and required account.
- Cold-start session restore behavior is understood and documented.

### Day 2: Fix login/signup boundaries

- Change email login so it does not create new users.
- Keep signup as the only user-creation email path.
- Verify confirm-code screen works for both login and signup without mixing profile creation rules.
- Review copy so buttons match behavior exactly.
- Fix auth guard timing so route protection waits for auth readiness instead of raw in-memory user state only.

Exit criteria:

- Existing user can log in.
- New user can sign up.
- Login does not silently create accounts.
- Stored session survives cold launch without false redirects to login.

### Day 3: Reduce personal data collection

- Remove mandatory date of birth from signup.
- Collect DOB only when needed for personal horoscope or zodiac-based personalization.
- Review all profile fields and classify each as required vs optional.
- Update copy and validation messages accordingly.

Exit criteria:

- User can access core app without providing unnecessary personal info.
- Signup form contains only fields justified by core use.

### Day 4: Account management correctness

- Fix email editing to update auth email properly, including verification if needed.
- If full auth email change is not ready, remove email editing from the release build.
- Verify profile caching does not show stale identity data.
- Improve account save errors and success states.

Exit criteria:

- No field in account screen lies to the user.
- Account edits are either real or removed.

### Day 5: Delete account and privacy compliance

- Make delete-account UX explicit on success and failure.
- Ensure backend deletion covers auth user, profile, and saved readings consistently.
- Rewrite in-app privacy/terms content to reflect:
  - Supabase auth and profile storage
  - analytics
  - push notifications
  - RevenueCat subscriptions
  - account deletion flow
- Prepare final external privacy policy URL for App Store Connect.
- Make paywall `Privacy` and `Terms` actions route to the correct content reliably.

Exit criteria:

- Delete account works end-to-end on device.
- Privacy text matches actual behavior.
- Legal links from paywall behave correctly.

## Week 2

### Day 6: Paywall and subscription transparency

- Make plan labels, duration, and billing meaning obvious.
- Ensure restore purchases is easy to find and works.
- Add clearer legal text around renewal and cancellation.
- Check paywall copy consistency across premium lock screens.
- Verify no premium screen overpromises unavailable features.
- Align naming and branding on paywall and native shell so the app identity is consistent.

Exit criteria:

- Reviewer can understand price, duration, renewal, and restore path without guessing.

### Day 7: Home screen redesign into product hub

- Replace decorative-first home with action-first structure.
- Add one primary CTA:
  - open daily card
  - continue horoscope
  - ask tarot
- Add quick actions row.
- Add daily ritual/progress block.
- Add one practical "today for you" summary.

Exit criteria:

- In 5 seconds, a new user knows what to do next.
- Home drives engagement instead of only mood.

### Day 8: Onboarding and first-session clarity

- Update onboarding to explain what Arcana Insight gives the user.
- Connect selected interests to real first-session recommendations.
- Reduce confusion in first tarot and horoscope entry points.
- Ensure free value is visible before upsell pressure.

Exit criteria:

- First-time user can complete one satisfying session without confusion.

### Day 9: Surface cleanup and release trimming

- Remove, hide, or de-route unfinished/legacy screens.
- Review router for unreachable, outdated, or confusing routes.
- Check duplicate files and stale components.
- Verify no accidental debug or dead code leaks into release flow.
- Clean release packaging discipline:
  - fresh web build
  - fresh Capacitor copy/sync
  - verify iOS shell is using current assets only

Exit criteria:

- Release surface contains only supported screens and flows.
- iOS archive process is deterministic and documented.

### Day 10: QA, metadata, and App Review prep

- Run full release smoke test on a physical iPhone.
- Run `npm test` and `npm run lint` until clean.
- Validate all core routes from cold launch.
- Validate reset-password deep link flow from a real email.
- Validate paywall legal links, restore purchases, and push permission denial recovery.
- Prepare App Store assets and metadata:
  - subtitle
  - description
  - screenshots
  - privacy URL
  - support URL
- Align displayed app name everywhere:
  - icon label
  - metadata
  - screenshots
  - review notes
- Write App Review notes:
  - how to test auth
  - how to test premium
  - how to test delete account
  - how to test reset password
  - what makes the app distinct

Exit criteria:

- Clean test/lint status.
- Real-device smoke pass complete.
- Review notes ready.

## Release Checklist

### Product

- Home screen is functional, not decorative-only.
- Free tier feels real and useful.
- Premium value is clear and not misleading.
- Tarot, horoscope, and card library each work as standalone value.

### Compliance

- Account deletion works inside the app.
- Privacy policy is accurate and accessible.
- No unnecessary personal data is required for core functionality.
- Subscription flow is transparent.
- Restore purchases works.
- Privacy and Terms links go to the correct destination.
- Support contact is real and reachable.

### Stability

- No obvious broken states on poor network.
- No dead buttons.
- No screens that load forever.
- No misleading success states.
- No obvious routing bugs after login/logout/delete.
- No false login redirects on cold start with an existing session.
- Reset-password flow works from a real deep link.

### App Review Package

- Demo account or reviewer-safe flow prepared.
- Premium review path explained in notes.
- Backend is live during review.
- Screenshots reflect real current UI.
- Metadata avoids unverifiable claims.
- App naming is consistent across native shell and App Store presentation.

### Build Hygiene

- Web build was generated fresh for the submission build.
- Capacitor copy/sync was run after the last frontend changes.
- iOS shell is not shipping stale bundled assets.

## Suggested Ownership

### Track 1: Core release blockers

- auth
- account
- delete account
- privacy
- paywall

### Track 2: Product readiness

- home
- onboarding
- first-session UX
- premium lock UX

### Track 3: Release operations

- testing
- metadata
- App Review notes
- final submission checklist

## Submission Gate

Submit only if all statements are true:

- Auth flows are unambiguous.
- Account editing is trustworthy.
- Delete account is verified on device.
- Privacy and terms are accurate.
- Paywall is transparent.
- Paywall legal links behave correctly.
- Home screen is functional.
- Reset-password deep link is verified on device.
- Cold-start auth routing is verified on device.
- Tests and lint are green.
- Real-device smoke test is complete.
- App Review notes are prepared.

If any of these are false, delay submission.
