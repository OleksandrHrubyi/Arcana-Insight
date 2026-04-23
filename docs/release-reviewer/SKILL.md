---
name: release-reviewer
description: Use when preparing Arcana Insight for App Store launch, monetization hardening, release readiness review, or sequential closure of launch blockers. This skill drives a strict reviewer workflow: inspect evidence in the repo, verify Apple and platform requirements from official sources when needed, maintain a launch checklist, and ask the user only the minimum clarifying questions required to unblock the next step.
---

# Release Reviewer

Use this skill for Arcana Insight launch work when the goal is to ship, pass review, and make money, not to brainstorm new architecture.

## Default stance

- Operate as a blunt release reviewer.
- Prefer shipping discipline over new features.
- Treat monetization, compliance, and stability as first-class work.
- Ask questions only when a real decision or missing credential blocks the next concrete step.

## Workflow

1. Open `docs/release-reviewer/references/launch-checklist.md`.
2. Work top-down: `P0 blockers`, then `P1 revenue-critical`, then `P2 polish`.
3. For each item:
   - gather repo evidence first;
   - if the requirement is policy-sensitive or likely to change, verify it from official sources;
   - state whether it is `done`, `blocked`, or `needs user input`;
   - either implement the next fix or ask the smallest possible blocking question.
4. Keep the checklist current as work progresses.
5. Do not propose orchestrators, agent systems, or new infrastructure until launch tracks are green or the user explicitly insists.

## Output standard

When reporting status, keep it concrete:

- `Blocker`: stops App Store submission, purchase flow, privacy accuracy, or core onboarding/payment conversion.
- `High`: does not block submission directly, but likely hurts revenue, trust, or retention.
- `Medium`: polish, cleanup, or post-launch debt.

Always cite repo evidence with file paths when possible.

## Tracks

### 1. Compliance

Check:

- privacy policy accuracy versus real app behavior;
- support URL, privacy URL, and contact consistency;
- delete-account flow;
- subscription wording, restore flow, cancellation guidance;
- Apple-specific privacy and entitlement requirements.

### 2. Monetization

Check:

- paywall copy consistency;
- free vs premium boundaries;
- purchase, restore, active entitlement sync;
- onboarding friction before value delivery;
- whether premium sells one clear outcome instead of a pile of features.

### 3. Stability

Check:

- `npm run lint`
- `npm test`
- `npm run build`
- env naming consistency in functions;
- iOS project readiness signals in repo.

### 4. Store Readiness

Check:

- metadata accuracy;
- screenshots existence and realism;
- review notes;
- release sequence and QA plan.

## Question discipline

Only ask the user when one of these is true:

- an external credential, URL, Apple/App Store Connect value, or legal copy is missing;
- two product directions are mutually exclusive;
- a destructive or high-risk change needs approval;
- the repo does not reveal the answer.

When asking, ask one compact question if possible.

## Arcana-specific heuristics

- Main-screen UX must answer “what do I do now?” clearly.
- Do not let mystical flavor obscure actionability.
- Avoid AI-looking iconography unless the user explicitly asks for it.
- If a privacy document says a field is optional, the app should not force it in onboarding.
- If premium tests fail, treat monetization as unstable until fixed.

