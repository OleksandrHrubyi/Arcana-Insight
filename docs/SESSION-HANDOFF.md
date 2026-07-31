# Session handoff — Arcana v1.0.1 (astronomy repositioning)

**Snapshot date:** 2026-07-31 · **HEAD:** `814ba88` · **Tests:** 345/345 · lint + build clean · all work committed on `main`.

> One-line status: **The app is code-complete and submit-ready. Everything left is owner-operational in App Store Connect / Xcode.**

---

## What this was

v1.0 (build 62) was **rejected under App Store Guideline 4.3(b)** (saturated astrology/tarot category, "duplicate of existing apps"). Research showed appeals/feature-trimming fail; the only path that works is repositioning the app's PRIMARY identity away from divination. This arc rebuilt Arcana into a **real on-device astronomy instrument + reflection journal**, with tarot/horoscope demoted to a secondary Menu section.

## What's DONE (all committed)

### Product / identity
- **Astronomy home** (`SkyHomePage`) is the app's front door: photoreal Moon over a real Milky Way photo, live phase/illumination/rise-set, conditions chip, essentials, tonight's-headline-event chip (deep-links into /sky). Living background (twinkle + drift + gentle float + rare thin meteor), calm & Apple-tuned, haptics on every tap.
- **Sky tab** (`SkyPage`) = a genuine observing instrument, all real ephemeris (`astronomy-engine` + SGP4 via `satellite.js`): Best-time-to-observe (dark window − moonlight + cloud forecast), **Tonight's tour** (ordered plan), moon calendar, Moon-tonight stats + horizon bearings, upcoming events with **meteor ZHR + moon-interference** + reminder bells, planet visibility with rise/set/highest times, **ISS passes with "look up" reminders**, premium satellite pack (Tiangong/Hubble), Sun with bearings, **Milky Way core planner**.
- **Journal tab** = daily reflection (mood + sky-tied prompt); each entry now shows the **sky it was written under** (observing log). Premium **reflection insights** (30-day mood mix, streaks, phases).
- **Nav = Home / Sky / Journal / Menu.** Divination (tarot/horoscope/compatibility/card-of-day) lives ONLY in the Menu — never on the home or a primary tab (verified, 4.3(b)-safe). Menu redesigned: reflection-Moon hero (no tarot card), For-you pillar quick-actions, Readings / More sections.
- **Onboarding** reframed to 3 pillars (Night sky / Reflection / Readings); fits iPhone SE.
- Moon-phase **WidgetKit widget** (exists; code + bridge done).

### Monetization (A1 — additive, nothing existing broken)
Same products/entitlement/trial untouched. NEW premium value, all gated on the existing `premium` flag, each with a locked-teaser → paywall:
- **Saved observing places** (free 1 / premium unlimited)
- **Journal reflection insights**
- **Satellite pack** (Tiangong + Hubble)
Paywall reframed: Free column leads with the astronomy tool; premium grid leads with the 3 new sky/journal perks before tarot/horoscope.

### App Store assets & docs (the 4.3(b) blockers)
- **Screenshots regenerated** astronomy-first (8 shots, both sizes) → `app-store/screenshots/`. Old journal/tarot set deleted. Generator: `tests/visual/appstore-shots.spec.js`.
- **Metadata** rewritten astronomy-first → `app-store/asc-metadata.md` (name "Arcana: Night Sky & Moon", Reference category). CANONICAL.
- **Reviewer notes v4** → `app-store/reviewer-notes.md` (astronomy-first, matches the binary).
- Stale tarot-first ASO in `docs/launch-readiness-plan.md` marked SUPERSEDED.
- **`app-store/asc-submit-checklist.md`** — step-by-step ASC submit checklist + risk list.

### Code health (post-review)
3 review agents ran (code review clean/no premium leaks, QA 8/8 pass on iPhone 14 + SE, readiness audit). Fixed: onMoonReady leak, Menu dead code, premium mirror drift, onboarding SE, orphaned readings-hub route. Deferred with reason: horoscope="Sky" labels (dead surfaces only), guest 401 (cosmetic web-only, risky auth). New logic lives in tested pure cores: `skyCore` (+ observing window, planet times, bearings, meteorPeakInfo, computeMilkyWayWindow), `skyFavoritesCore`, `journalInsightsCore`, `skyTourCore`.

## What's LEFT — owner-only (nothing in code)

Follow **`app-store/asc-submit-checklist.md`**. Summary:
1. Confirm privacy + support URLs return 200.
2. Delete `ios/App/Pods/**/Frameworks 2/` before archiving.
3. Real-device pass (`npm run iosprep` → run).
4. In ASC: set name/subtitle, **category → Reference**, paste metadata (en+uk), **upload the new astronomy-first screenshots**, paste **reviewer-notes v4**, **re-record the demo video** (astronomy flow), App Privacy + Age (4+), subscriptions Ready-to-Submit + Sandbox test.
5. Archive 1.0.1 in Xcode → validate → **Submit**.
6. Optional future: Lock Screen widget (needs a new Xcode widget target).

## Biggest residual risk
4.3(b) again — the CODE is safe; the risk is the **assets**. If any old tarot-first screenshot, the old "Daily Sky Journal"/"Tarot & Horoscope" note, or a tarot-led demo video reaches ASC, it re-triggers 4.3(b). Screenshots + reviewer notes + demo video MUST all be astronomy-first.

## Key files
- Canonical metadata: `app-store/asc-metadata.md` · Reviewer notes: `app-store/reviewer-notes.md` · Submit checklist: `app-store/asc-submit-checklist.md`
- Astronomy engine: `src/helpers/skyCore.js` · ISS/SGP4: `src/services/issPasses.js`
- Nav/structure truth: `docs/flow-map.md` · Premium truth: `docs/premium-matrix.md`
- The sole divination surface: `src/components/main/MenuComponent.vue`
