# Arcana — App Review Notes

Use this text in App Store Connect reviewer notes.

> Canonical source: this note is kept in sync with `app-store/asc-metadata.md`
> (astronomy-first, v1.0.1). App Store name: **Arcana: Night Sky & Moon**.

## Suggested review note (v5, 2026-08-02 — стиснуто під ліміт ASC 4000 зн.; заливається полем Notes через скіл asc-api)
```text
CONTEXT - RESPONSE TO YOUR 4.3(b) FEEDBACK:
This app was previously submitted as "Arcana: Tarot & Horoscope" (v1.0 build 62) and rejected under Guideline 4.3(b). We took the feedback seriously and rebuilt the concept rather than resubmitting. Arcana is now a real astronomy tool - "Arcana: Night Sky & Moon". The name, subtitle, screenshots, onboarding and the whole primary navigation lead with astronomy. The three primary tabs - Home, Sky and Journal - show computed sky data and a private written reflection; none of them shows a horoscope, a tarot card or a reading. Tarot and horoscope are secondary, optional features reached only from the Menu - never the home screen and never a primary tab.

THE CORE EXPERIENCE (computed ON-DEVICE with the open-source astronomy-engine library - real ephemeris; works offline, no account):
- Home: tonight's Moon for the user's location - phase, illumination, rise/set - over a real night-sky photo.
- Sky tab: best time to observe (astronomical-dark window minus moonlight, plus cloud forecast); live Moon data (distance, apparent size, perigee/apogee); planet visibility with rise/set and transit times; ISS pass predictions (real SGP4 on live Celestrak TLEs) plus a premium satellite pack (Tiangong, Hubble); a sky-events feed (eclipses, meteor peaks, solstices) with local-notification reminders; sunrise/sunset compass bearings and a month Moon calendar.
- A WidgetKit home-screen widget with tonight's Moon phase.
- Journal tab: a one-tap mood check-in and one reflective question derived from today's sky; entries stay private on-device (sync after sign-in).
No predictions and no medical or financial claims; an explicit disclaimer is shown in-app and in the description.

FREE TIER (no account needed): the reviewer can complete onboarding and use the entire astronomy tool, the widget and the journal without signing in. The Menu extras (daily card, daily horoscope, 78-card library, compatibility overview, one 1-card reading per day) also work signed-out.

AI-GENERATED CONTENT: journal prompts are NOT AI - a curated, pre-written bank selected by real sky data. Horoscope, tarot-interpretation and compatibility texts (the optional Menu features) are generated server-side (OpenAI gpt-4o-mini with a fallback provider), constrained to a fixed JSON schema and passed through a content-safety filter that blocks predictive/deterministic, medical and financial wording. This is not an open chatbot - users cannot converse freely with the model. AI processors are disclosed in the privacy policy.

SUBSCRIPTION (auto-renewable): arcana.premium.monthly / arcana.premium.yearly (RevenueCat entitlement: premium; product IDs are legacy internal identifiers). Premium adds saved observing places, journal reflection insights, the satellite pack and deeper reading formats.

WHY SIGN-IN IS REQUIRED BEFORE PURCHASE: Premium is account-based - it unlocks saved history and syncs the entitlement across devices, and the subscription is verified server-side against the user's account; an anonymous purchase would risk being lost on reinstall. Sign-in takes seconds (Sign in with Apple, or a first-party email one-time code). A manual "Restore Purchases" button is on the Premium screen; premium also restores automatically on sign-in.

TO TEST PREMIUM: create an account in-app (Sign in with Apple works in sandbox), then purchase / restore with a Sandbox account.

ACCOUNT: no account is required for the free features above. Deletion is available in-app: Settings -> Account -> Danger Zone -> Delete account.

Privacy Policy: https://oleksandrhrubyi.github.io/Arcana-Insight/privacy-policy.html
Support: https://oleksandrhrubyi.github.io/Arcana-Insight/support.html
Marketing: https://oleksandrhrubyi.github.io/Arcana-Insight/

The app uses standard HTTPS encryption only (ITSAppUsesNonExemptEncryption = false).
```

## Final pre-submit replacements

Confirm these URLs are live before submission:

- `https://oleksandrhrubyi.github.io/Arcana-Insight/privacy-policy.html`
- `https://oleksandrhrubyi.github.io/Arcana-Insight/support.html`

RE-RECORD the App Review demo video (any existing one shows the OLD tarot-led /
journal-led flow, which now contradicts the submission): 30–60s of
onboarding → astronomy Home (Moon) → Sky tab (best-time-to-observe, Moon detail,
ISS/events) → Journal (mood + reflective question). Attach it in App Review
Information.

## Notes for the owner

- Category: primary **Reference** (or Education), secondary Lifestyle — matches
  the astronomy-tool identity (see asc-metadata.md).
- Do not promise a review account unless you actually prepared one.
- Do not claim purchases work in review unless the sandbox runbook has been
  executed on a real iPhone.
- If Apple asks for a test account later, provide one separately instead of
  inventing it in advance.
