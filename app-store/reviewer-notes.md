# Zorya — App Review Notes

Use this text in App Store Connect reviewer notes.

## Suggested review note (v3, 2026-07-23 — repositioning response to the 4.3(b)
## rejection of build 62; keeps the 5.1.1 purchase justification and the
## AI-generated-content disclosure from v2)

```text
CONTEXT — RESPONSE TO YOUR 4.3(b) FEEDBACK:
This app was previously submitted as "Arcana: Tarot & Horoscope" (v1.0 build 62)
and rejected under Guideline 4.3(b). We took the feedback seriously and rebuilt
the concept rather than resubmitting: Zorya is now a daily reflection journal
guided by real astronomy. The name, subtitle, screenshots, onboarding, first-run
flow and the home screen's primary action all lead with the reflection ritual.
Tarot and horoscope remain as secondary, supporting features.

THE CORE EXPERIENCE (new in this version):
- A daily reflection journal: a one-tap mood check-in, today's real sky (Moon
  sign and phase, planetary day, retrogrades — computed on-device with the
  astronomy-engine library, not canned content), and ONE reflective question per
  day selected deterministically from that sky data and the day's number.
- Entries build into a private journal (on-device for guests; synced to the
  account after sign-in). The first run after onboarding lands directly in this
  flow.
- A daily ritual loop with streaks ties the journal, the daily card and the
  horoscope together; the journal is the primary step.

All prompts are reflective questions ("What deserves your patience today?") —
the app makes no predictions or guarantees and no medical or financial claims;
an explicit disclaimer is shown in-app and in the description.

FREE TIER (no account needed):
The reviewer can complete onboarding and use the full reflection journal, the
daily card, the daily horoscope (Energy theme), the 78-card library, the zodiac
guide, the compatibility overview and one 1-card reading per day without
signing in.

AI-GENERATED CONTENT:
The journal prompts are NOT AI — they are a curated, pre-written bank selected
by real sky data. Horoscope, tarot-interpretation and compatibility texts are
generated server-side (OpenAI gpt-4o-mini with a fallback provider), constrained
to a fixed JSON schema and passed through a content-safety filter that blocks
predictive/deterministic, medical and financial wording before anything reaches
the user. This is not an open chatbot: users cannot converse freely with the
model; the only free-text inputs are the user's own private journal entries and
an optional tarot question. AI processors are disclosed in the privacy policy.

SUBSCRIPTION (auto-renewable):
Products: arcana.premium.monthly, arcana.premium.yearly
(RevenueCat entitlement: premium; product IDs are legacy internal identifiers).
The paywall is reachable from the Premium screen, Personal Horoscope,
Saved Readings and Compatibility.

WHY SIGN-IN IS REQUIRED BEFORE PURCHASE:
Premium is account-based — it unlocks saved history and syncs the entitlement
across devices, and the subscription is verified server-side against the user's
account. Purchasing anonymously would risk losing the purchase on reinstall.
Sign-in takes seconds (Sign in with Apple or an email one-time code — no
password). A manual "Restore Purchases" button is on the Premium screen;
premium also restores automatically on sign-in.

TO TEST PREMIUM: create an account in-app (Sign in with Apple works in sandbox),
then purchase / restore with a Sandbox account.

ACCOUNT:
- Sign in with Apple is supported (the only third-party login; the alternative
  is a first-party email one-time code).
- No account is required for the free features listed above.
- Account deletion is available in-app:
  Settings -> Account -> Danger Zone -> Delete account.

Privacy Policy URL:
https://oleksandrhrubyi.github.io/Arcana-Insight/privacy-policy.html

Support URL:
https://oleksandrhrubyi.github.io/Arcana-Insight/support.html

The app uses standard HTTPS encryption only (ITSAppUsesNonExemptEncryption =
false).
```

## Final pre-submit replacements

Confirm these URLs are live before submission:

- `https://oleksandrhrubyi.github.io/Arcana-Insight/privacy-policy.html`
- `https://oleksandrhrubyi.github.io/Arcana-Insight/support.html`

Consider re-recording the App Review demo video (the current one shows the
tarot-led flow): 30–60s of onboarding → journal (mood + sky + question + save)
→ home → daily card. The video is attached in App Review Information.

## Notes for the owner

- Do not promise a review account unless you actually prepared one.
- Do not claim purchases work in review unless the sandbox runbook has been executed on a real iPhone.
- If Apple asks for a test account later, provide one separately instead of inventing it in advance.
