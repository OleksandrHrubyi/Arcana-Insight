# Arcana — App Review Notes

Use this text in App Store Connect reviewer notes.

> Canonical source: this note is kept in sync with `app-store/asc-metadata.md`
> (astronomy-first, v1.0.1). App Store name: **Arcana: Night Sky & Moon**.

## Suggested review note (v4, 2026-07-30 — astronomy repositioning; keeps the
## 5.1.1 purchase justification and the AI-generated-content disclosure)

```text
CONTEXT — RESPONSE TO YOUR 4.3(b) FEEDBACK:
This app was previously submitted as "Arcana: Tarot & Horoscope" (v1.0 build 62)
and rejected under Guideline 4.3(b). We took the feedback seriously and rebuilt
the concept rather than resubmitting. Arcana is now a real astronomy tool — a
night-sky / Moon instrument (App Store name: "Arcana: Night Sky & Moon"). The
name, subtitle, screenshots, onboarding and the whole primary navigation lead
with astronomy. The three primary tabs — Home, Sky and Journal — are computed
sky data and a private written reflection; none of them shows a horoscope, a
tarot card or a reading. Tarot and horoscope are secondary, optional features
reached only from the Menu — never the home screen and never a primary tab.

THE CORE EXPERIENCE (all computed ON-DEVICE with the open-source astronomy-engine
library — real ephemeris, functionality not content; works offline, no account):
- Home: tonight's Moon for the user's location — phase, illumination, rise/set —
  over a real photo of the night sky.
- "Sky" tab — a genuine observing instrument:
  • Best time to observe: tonight's astronomical-dark window minus moonlight,
    plus a cloud forecast.
  • Live Moon data: phase, distance (km), apparent size, next perigee/apogee.
  • Planet visibility: which planets are up, compass/altitude, magnitude, and each
    one's rise/set and highest (meridian transit) time.
  • ISS pass predictions (real SGP4 propagation of live Celestrak TLEs), plus a
    premium "satellite pack" (Tiangong, Hubble).
  • A sky-events feed — eclipses, meteor-shower peaks, solstices/equinoxes — each
    with an optional local-notification reminder.
  • Sunrise/sunset and moonrise/moonset compass bearings, and a month Moon calendar.
- A home-screen WidgetKit widget shows tonight's Moon phase.
- "Journal" tab: a daily reflection — a one-tap mood check-in and one grounded,
  reflective question derived from today's sky. Entries stay private on-device
  (synced to the account after sign-in).

The app makes no predictions or guarantees and no medical or financial claims;
all journal prompts are reflective questions, and an explicit disclaimer is shown
in-app and in the description.

FREE TIER (no account needed):
The reviewer can complete onboarding and use the entire astronomy tool (Home,
the full Sky tab, the widget) and the reflection journal without signing in.
The secondary features in the Menu — daily card, daily horoscope (Energy theme),
78-card library, zodiac guide, compatibility overview, one 1-card reading per day
— also work signed-out.

AI-GENERATED CONTENT:
The journal prompts are NOT AI — they are a curated, pre-written bank selected by
real sky data. Horoscope, tarot-interpretation and compatibility texts (the
optional Menu features) are generated server-side (OpenAI gpt-4o-mini with a
fallback provider), constrained to a fixed JSON schema and passed through a
content-safety filter that blocks predictive/deterministic, medical and financial
wording before anything reaches the user. This is not an open chatbot: users
cannot converse freely with the model; the only free-text inputs are the user's
own private journal entries and an optional tarot question. AI processors are
disclosed in the privacy policy.

SUBSCRIPTION (auto-renewable):
Products: arcana.premium.monthly, arcana.premium.yearly
(RevenueCat entitlement: premium; product IDs are legacy internal identifiers).
Premium adds depth/convenience — saved observing places, journal reflection
insights, the satellite pack, plus the deeper divination formats. The paywall is
reachable from the Premium screen and from the premium locks (saved places,
journal insights, satellite pack, Personal Horoscope, Saved Readings,
Compatibility).

WHY SIGN-IN IS REQUIRED BEFORE PURCHASE:
Premium is account-based — it unlocks saved history and syncs the entitlement
across devices, and the subscription is verified server-side against the user's
account. Purchasing anonymously would risk losing the purchase on reinstall.
Sign-in takes seconds (Sign in with Apple or an email one-time code — no
password). A manual "Restore Purchases" button is on the Premium screen; premium
also restores automatically on sign-in.

TO TEST PREMIUM: create an account in-app (Sign in with Apple works in sandbox),
then purchase / restore with a Sandbox account.

ACCOUNT:
- Sign in with Apple is supported (the only third-party login; the alternative is
  a first-party email one-time code).
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
