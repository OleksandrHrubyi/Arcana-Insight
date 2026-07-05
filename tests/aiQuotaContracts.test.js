import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { isDailyLimitError } from '../src/helpers/functionErrors.js'

const readSource = (relativePath) => {
  const absolutePath = path.resolve(process.cwd(), relativePath)
  return fs.readFileSync(absolutePath, 'utf8')
}

// B1 (launch audit): every AI endpoint carries a per-user daily ceiling so one
// account can never drive unbounded OpenAI spend — including while
// RC_ENFORCE_PREMIUM is off or the RevenueCat check is failing open.

test('isDailyLimitError recognizes 429 / daily_limit_reached and nothing else', () => {
  assert.equal(isDailyLimitError({ status: 429 }), true)
  assert.equal(isDailyLimitError({ code: 'daily_limit_reached' }), true)
  assert.equal(isDailyLimitError({ code: 'DAILY_LIMIT_REACHED' }), true)
  assert.equal(isDailyLimitError({ status: 403, code: 'premium_required' }), false)
  assert.equal(isDailyLimitError({ status: 503 }), false)
  assert.equal(isDailyLimitError(null), false)
  assert.equal(isDailyLimitError(new Error('network')), false)
})

test('ai_usage_daily migration is atomic, RLS-locked and service-role-only', () => {
  const sql = readSource('supabase/migrations/202607060900_ai_usage_daily.sql')

  assert.match(sql, /create table if not exists public\.ai_usage_daily/)
  assert.match(sql, /primary key \(user_id, day, endpoint\)/)
  assert.match(sql, /alter table public\.ai_usage_daily enable row level security/)
  // The limit must be enforced inside the same statement that increments —
  // two concurrent requests must not both slip under the ceiling.
  assert.match(sql, /do update set calls = ai_usage_daily\.calls \+ 1[\s\S]*?where ai_usage_daily\.calls < p_limit/)
  assert.match(sql, /revoke execute on function public\.increment_ai_usage[\s\S]*?from public, anon, authenticated/)
  assert.match(sql, /grant execute on function public\.increment_ai_usage[\s\S]*?to service_role/)
  assert.match(sql, /create or replace function public\.refund_ai_usage/)
})

test('aiQuota shared helper fails open on infra errors and reads env limits', () => {
  const source = readSource('supabase/functions/_shared/aiQuota.ts')

  assert.match(source, /increment_ai_usage/)
  assert.match(source, /refund_ai_usage/)
  // Infra failure must never block users — quota is defense-in-depth, not the paywall.
  assert.match(source, /allowed: true, limit, failedOpen: true/)
  assert.match(source, /AI_DAILY_LIMIT_TAROT/)
  assert.match(source, /AI_DAILY_LIMIT_PERSONAL_HOROSCOPE/)
  assert.match(source, /AI_DAILY_LIMIT_COMPATIBILITY/)
})

test('all three AI edge functions consume the daily quota and answer 429', () => {
  for (const fn of ['tarot-reading', 'personal-horoscope', 'compatibility']) {
    const source = readSource(`supabase/functions/${fn}/index.ts`)
    assert.match(source, /consumeAiQuota/, `${fn} must import/use consumeAiQuota`)
    assert.match(source, /daily_limit_reached/, `${fn} must return the daily_limit_reached code`)
    assert.match(source, /429/, `${fn} must answer HTTP 429 on limit`)
    assert.match(source, /refundAiQuota/, `${fn} must refund the unit when providers fail`)
  }
})

test('tarot-reading checks quota before providers and independent of the premium flag', () => {
  const source = readSource('supabase/functions/tarot-reading/index.ts')

  // Admin client is created unconditionally (quota must work with enforcement off);
  // premium gating stays keyed on the flag.
  assert.match(source, /const enforce = premiumEnforcementEnabled\(\)/)
  assert.match(source, /const isPremium = enforce \? await isUserPremium\(admin, user\.id\) : true/)
  // Quota consumed before the free-grant/provider flow; a premium_required exit
  // after a consumed unit refunds it.
  const quotaIdx = source.indexOf("consumeAiQuota(admin, user.id, 'tarot')")
  const providerIdx = source.indexOf('requestOpenAiReading({ body')
  assert.ok(quotaIdx > 0 && providerIdx > 0 && quotaIdx < providerIdx, 'quota must be consumed before providers run')
})

test('daily-limit copy exists in BOTH locales', () => {
  const source = readSource('src/i18n/messages.bundle.js')
  const dailyReached = source.match(/dailyReached:/g) || []
  const tarotNotify = source.match(/aiDailyLimitNotify:/g) || []
  assert.equal(dailyReached.length, 2, 'aiLimits.dailyReached must exist in en AND uk')
  // 2 locale entries + 1 empty default shape in TarotOraclePage is separate; bundle has 2.
  assert.equal(tarotNotify.length, 2, 'tarotOracle ui.aiDailyLimitNotify must exist in en AND uk')
})
