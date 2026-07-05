// @ts-nocheck
// B1/B2 (launch audit): the daily AI ceiling must consume atomically via the RPC,
// deny on -1, and fail OPEN (never block users) when the counter itself breaks.
//
// Run: deno test --allow-env --allow-net supabase/functions/tests/
import { assertEquals } from 'jsr:@std/assert'
import { aiDailyLimit, consumeAiQuota, refundAiQuota } from '../_shared/aiQuota.ts'

const fakeRpc = (impl) => {
  const calls = []
  return {
    calls,
    client: {
      rpc: async (fn, args) => {
        calls.push({ fn, args })
        return impl(fn, args)
      },
    },
  }
}

Deno.test('limits: sane defaults with env overrides (invalid values ignored)', () => {
  Deno.env.delete('AI_DAILY_LIMIT_TAROT')
  assertEquals(aiDailyLimit('tarot'), 30)
  assertEquals(aiDailyLimit('personal_horoscope'), 10)
  assertEquals(aiDailyLimit('compatibility'), 20)

  Deno.env.set('AI_DAILY_LIMIT_TAROT', '5')
  assertEquals(aiDailyLimit('tarot'), 5)
  Deno.env.set('AI_DAILY_LIMIT_TAROT', '0')
  assertEquals(aiDailyLimit('tarot'), 30, 'zero/negative env must fall back to default')
  Deno.env.set('AI_DAILY_LIMIT_TAROT', 'lots')
  assertEquals(aiDailyLimit('tarot'), 30, 'non-numeric env must fall back to default')
  Deno.env.delete('AI_DAILY_LIMIT_TAROT')
})

Deno.test('consume: under the limit → allowed with the RPC call count', async () => {
  const { client, calls } = fakeRpc(() => ({ data: 3, error: null }))
  const res = await consumeAiQuota(client, 'user-1', 'tarot')
  assertEquals(res.allowed, true)
  assertEquals(res.calls, 3)
  assertEquals(calls.length, 1)
  assertEquals(calls[0].fn, 'increment_ai_usage')
  assertEquals(calls[0].args.p_user_id, 'user-1')
  assertEquals(calls[0].args.p_endpoint, 'tarot')
  assertEquals(calls[0].args.p_limit, 30)
})

Deno.test('consume: limit reached (-1) → denied', async () => {
  const { client } = fakeRpc(() => ({ data: -1, error: null }))
  const res = await consumeAiQuota(client, 'user-1', 'compatibility')
  assertEquals(res.allowed, false)
})

Deno.test('consume: counter infra failure fails OPEN, loudly flagged', async () => {
  const { client } = fakeRpc(() => ({ data: null, error: { message: 'db down' } }))
  const res = await consumeAiQuota(client, 'user-1', 'tarot')
  assertEquals(res.allowed, true)
  assertEquals(res.failedOpen, true)

  const throwing = { rpc: async () => { throw new Error('boom') } }
  const res2 = await consumeAiQuota(throwing, 'user-1', 'tarot')
  assertEquals(res2.allowed, true)
  assertEquals(res2.failedOpen, true)
})

Deno.test('refund: calls the RPC and swallows failures (best-effort)', async () => {
  const { client, calls } = fakeRpc(() => ({ data: null, error: null }))
  await refundAiQuota(client, 'user-1', 'tarot')
  assertEquals(calls[0].fn, 'refund_ai_usage')

  const throwing = { rpc: async () => { throw new Error('boom') } }
  await refundAiQuota(throwing, 'user-1', 'tarot') // must not throw
})
