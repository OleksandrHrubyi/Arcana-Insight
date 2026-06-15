---
name: arcana-edge-functions
description: Use when changing, debugging, or adding Supabase Deno Edge Functions in Arcana Insight (AI horoscope/tarot generation, RevenueCat/billing, push notifications, ritual streak/rewards, auth, account deletion). Enforces the project's provider-fallback, strict-JSON, server-side content-safety, auth, and secrets conventions.
---

# Arcana Edge Functions

Use this skill for any backend work in `supabase/functions/`. This is the AI + data layer of the product; the frontend skills do not cover it.

## Architecture Facts

- Runtime: **Deno** (`Deno.serve`), deployed as Supabase Edge Functions.
- One folder per function: `supabase/functions/<name>/index.ts` (+ its own `deno.json`).
- Shared helpers live in `supabase/functions/_shared/ritual.ts` (used by all `ritual-*` functions): `json()`, `readJsonSafe()`, `extractBearerToken()`, `resolveAuthUserId()`, `restRequest()`, `rpcRequest()`, streak math (`ACTIVITY_POINTS`, `computeNextStreak`).
- Every file starts with `// @ts-nocheck`.
- Import style is per-function: some use `npm:@supabase/supabase-js@2`, `_shared` uses `https://esm.sh/@supabase/supabase-js@2`. Match the neighbour file; don't introduce a third style.

## Function Map

| Function | Role | AI |
|----------|------|-----|
| `tarot-reading` | AI tarot interpretation, OpenAI → OpenRouter fallback | ✅ |
| `personal-horoscope` | Per-user horoscope (sign + moon sign), cached | ✅ |
| `generate-horoscopes` | Batch 12-sign horoscopes → `zodiac_texts` (cron) | ✅ |
| `build-astro-context` | Real planetary data → `astro_context` (cron) | ❌ |
| `horoscope` / `tarot-draw` | Serve cached horoscope / draw cards (seed) | ❌ |
| `register-device` / `push-worker` / `send-broadcast` | APNs push | ❌ |
| `ritual-*` | Streak, points, rewards, inventory | ❌ |
| `delete-account` / `telegram-auth` | Account deletion / Telegram auth | ❌ |

## HTTP Conventions (every function)

1. Define `CORS` (`Access-Control-Allow-Origin: '*'`, methods, headers) and return it on `OPTIONS`.
2. Guard the method (`POST`/`GET`) → `405` if wrong.
3. Validate the body early → `400` with a clear `error` on missing payload.
4. Return JSON through a `json(data, status)` helper that spreads `CORS` + `content-type`.
5. Log failures with a tagged prefix: `console.error('[<function-name>] ...', reason, error)`.

## AI Function Rules

These are non-negotiable for `tarot-reading`, `personal-horoscope`, `generate-horoscopes`.

1. **Provider fallback, never single-provider.** Try OpenAI first (`/v1/responses` with `text.format.json_schema`), then OpenRouter (`/chat/completions` with `response_format: json_object`). Collect `providerErrors`; if all fail return `503` with `code: 'AI_UNAVAILABLE'` and a `reason`.
2. **Model + provider config comes from env**, with a default fallback: `OPENAI_MODEL`, `OPENROUTER_MODEL`, `OPENROUTER_URL`, `OPENROUTER_HTTP_REFERER`, `OPENROUTER_X_TITLE`. Do not hardcode a model id as the only value.
3. **Strict JSON out.** Use `json_schema` (OpenAI) / `json_object` (OpenRouter). Parse defensively (`parseJsonStrict`: try `JSON.parse`, then brace-extract `{...}`). Then **validate the shape** before returning.
4. **Server-side content safety is enforced in code, not just the prompt.** `tarot-reading` runs `containsDisallowed()` — regex banning future/prediction (`will`, `soon`, `destined`, `буде`, `станеться`, `скоро`…), advice/directives (`should`, `must`, `треба`, `маєш`…), and medical/legal/financial terms, in **both en and uk**. If you change the prompt or add an AI function, keep an equivalent guard. This mirrors `.claude/skills/arcana-content-guardrails/SKILL.md` but at the server boundary.
5. **System-prompt tone** stays: meaning-focused, calm, modern, non-predictive, non-prescriptive, no markdown/disclaimers. Reuse the existing `buildSystemPrompt` wording rather than inventing a new voice.
6. Attach `meta: { provider, model }` to successful AI responses.

## Auth & Data Rules

- User-scoped functions verify identity with an **anon client carrying the caller's JWT** (`Authorization: Bearer <jwt>` → `supabase.auth.getUser()`), then do privileged DB work with a **separate service-role client** (`SUPABASE_SERVICE_ROLE_KEY`, `persistSession: false`).
- For `ritual-*`, reuse `resolveAuthUserId` / `extractBearerToken` from `_shared/ritual.ts` — do not re-implement token parsing.
- DB access pattern: `.from(table).select().eq().maybeSingle()` and `.upsert()`. Cache AI output (e.g. `personal-horoscope` reads `app_users` + `astro_context`, caches the result).
- **Never** return the service-role key, raw provider keys, or full provider error bodies to the client.

## Secrets

- All keys via `Deno.env.get(...)`: `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, APNs/Telegram creds.
- Never hardcode or commit secrets. Set them with `supabase secrets set`. If a key is missing, fail gracefully with a structured reason (`missing_openai_api_key`), not a crash.

## Source-Of-Truth Files

- Shared backend helpers: `supabase/functions/_shared/ritual.ts`
- AI + fallback reference: `supabase/functions/tarot-reading/index.ts`
- Auth + cache reference: `supabase/functions/personal-horoscope/index.ts`
- Client-side billing/state contract (when touching premium): `src/constants/premiumModel.js`, `src/services/premiumBilling.js`

## Never Do This

- do not ship an AI function with a single provider and no fallback
- do not return unvalidated AI JSON straight to the client
- do not drop the server-side content-safety guard when editing AI copy/prompts
- do not expose the service-role key or provider keys to the frontend
- do not hardcode model ids, secrets, or URLs that already have an env override
- do not invent a new response/error shape — match `json()` / `AI_UNAVAILABLE` conventions

## Completion Check

- OPTIONS/method/body guards present; errors return `CORS` + clear JSON
- AI path: fallback works, output is schema-validated, content-safety guard intact
- auth path: identity via JWT, privileged work via service role, no key leaks
- secrets read from env only; missing-key path is graceful
- tagged `console.error` logging so runtime failures are debuggable
