import { notifyError } from "../_shared/notify.ts";

type ReqBody = {
  action?: "upsert" | "resolve_account_preference";
  token?: string;
  platform?: string; // ios
  locale?: string;   // uk/en
  enabled?: boolean;
  apns_env?: "sandbox" | "production";
  notify_hour?: number | null;
  notify_minute?: number | null;
  tz?: string | null; // e.g. "Europe/Berlin"
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
    },
  });
}

function isApnsToken(token: string) {
  return /^[a-f0-9]{32,200}$/i.test(token);
}

function clampInt(v: unknown, min: number, max: number): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  return Math.max(min, Math.min(max, i));
}

const extractBearerToken = (authHeader: string | null): string => {
  const raw = String(authHeader || "").trim();
  if (!raw) return "";
  if (!raw.toLowerCase().startsWith("bearer ")) return "";
  return raw.slice(7).trim();
};

const resolveAuthUserId = async ({
  supabaseUrl,
  anonKey,
  authHeader,
}: {
  supabaseUrl: string;
  anonKey: string;
  authHeader: string | null;
}): Promise<string> => {
  const token = extractBearerToken(authHeader);
  if (!token) return "";

  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const client = createClient(supabaseUrl, anonKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });

  const { data, error } = await client.auth.getUser();
  if (error) return "";
  return String(data?.user?.id || "").trim();
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("ANON_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
    if (!SUPABASE_URL || !SERVICE_ROLE) return json({ error: "Missing env" }, 500);

    const body: ReqBody = await req.json().catch(() => ({} as ReqBody));
    const action = body.action || "upsert";

    const authUserId = ANON_KEY
      ? await resolveAuthUserId({
        supabaseUrl: SUPABASE_URL,
        anonKey: ANON_KEY,
        authHeader: req.headers.get("Authorization"),
      })
      : "";

    if (action === "resolve_account_preference") {
      if (!authUserId) return json({ ok: true, preference: null, reason: "no_auth_user" });

      const query = new URLSearchParams();
      query.set("select", "enabled,notify_hour,notify_minute,last_seen_at");
      query.set("user_id", `eq.${authUserId}`);
      query.set("order", "last_seen_at.desc.nullslast");
      query.set("limit", "1");

      const url = `${SUPABASE_URL}/rest/v1/push_devices?${query.toString()}`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          apikey: SERVICE_ROLE,
          authorization: `Bearer ${SERVICE_ROLE}`,
          "content-type": "application/json",
        },
      });

      if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        const lower = bodyText.toLowerCase();
        if (res.status === 400 && lower.includes("user_id")) {
          return json({ ok: true, preference: null, reason: "user_id_column_missing" });
        }
        console.error("[register-device] Resolve preference failed:", res.status, bodyText);
        return json({ error: "device_registration_failed" }, 500);
      }

      const rows = await res.json().catch(() => []);
      const pref = Array.isArray(rows) ? rows[0] || null : null;
      return json({ ok: true, preference: pref || null });
    }

    const token = (body.token || "").trim();
    const platform = (body.platform || "ios").toLowerCase();
    const locale = (body.locale || "uk").toLowerCase();
    const enabled = body.enabled ?? true;
    const apns_env = body.apns_env ?? "sandbox";

    // час може бути null (тоді дефолт 08:00 UTC)
    const notify_hour = clampInt(body.notify_hour, 0, 23);
    const notify_minute = clampInt(body.notify_minute, 0, 59);
    const tz = (body.tz ?? "UTC")?.toString();

    if (!token || !isApnsToken(token)) return json({ error: "Invalid token" }, 400);
    if (platform !== "ios") return json({ error: "Only ios supported" }, 400);
    if (apns_env !== "sandbox" && apns_env !== "production") return json({ error: "Invalid apns_env" }, 400);

    // Compute the next send time NOW (single source of truth = the DB function the
    // push-worker also uses) so a fresh registration or a changed time/timezone
    // schedules correctly. Without this, next_send_at stayed NULL until the first
    // send, so push-worker fired at whatever time its cron ran (not the chosen hour),
    // and changing the time never rescheduled. On RPC failure we omit it (push_mark_sent
    // self-heals after the first send).
    let nextSendAt: string | null = null;
    if (enabled) {
      try {
        const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/compute_next_send_at`, {
          method: "POST",
          headers: {
            apikey: SERVICE_ROLE,
            authorization: `Bearer ${SERVICE_ROLE}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            p_hour: notify_hour ?? 8,
            p_minute: notify_minute ?? 0,
            p_tz: tz || "UTC",
          }),
        });
        if (rpcRes.ok) {
          const v = await rpcRes.json();
          nextSendAt = typeof v === "string" ? v : (Array.isArray(v) ? (v[0] ?? null) : null);
        } else {
          console.error("[register-device] compute_next_send_at failed:", rpcRes.status);
        }
      } catch (e) {
        console.error("[register-device] compute_next_send_at threw:", e);
      }
    }

    const url = `${SUPABASE_URL}/rest/v1/push_devices?on_conflict=token`;
    const payloadBase: Record<string, unknown> = {
      token,
      platform,
      locale,
      enabled,
      apns_env,
      notify_hour,
      notify_minute,
      tz,
      last_seen_at: new Date().toISOString(),
    };
    // Only set next_send_at when we computed it, so a transient RPC failure never
    // wipes a previously-correct schedule on re-registration.
    if (nextSendAt) payloadBase.next_send_at = nextSendAt;

    const withUserPayload = authUserId ? [{ ...payloadBase, user_id: authUserId }] : null;
    const plainPayload = [payloadBase];

    const callUpsert = async (payload: unknown) =>
      await fetch(url, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE,
        authorization: `Bearer ${SERVICE_ROLE}`,
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(payload),
    });

    let res = withUserPayload ? await callUpsert(withUserPayload) : await callUpsert(plainPayload);
    if (!res.ok && withUserPayload) {
      const bodyText = await res.text().catch(() => "");
      const lower = bodyText.toLowerCase();
      if (res.status === 400 && lower.includes("user_id")) {
        res = await callUpsert(plainPayload);
      } else {
        console.error("[register-device] Upsert failed (with user_id):", res.status, bodyText);
        return json({ error: "device_registration_failed" }, 500);
      }
    }

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("[register-device] Upsert failed:", res.status, t);
      return json({ error: "device_registration_failed" }, 500);
    }

    const saved = await res.json().catch(() => []);
    if (authUserId) {
      const patchUrl = `${SUPABASE_URL}/rest/v1/push_devices?user_id=eq.${authUserId}`;
      await fetch(patchUrl, {
        method: "PATCH",
        headers: {
          apikey: SERVICE_ROLE,
          authorization: `Bearer ${SERVICE_ROLE}`,
          "content-type": "application/json",
          prefer: "return=minimal",
        },
        body: JSON.stringify({
          enabled,
          notify_hour,
          notify_minute,
          locale,
          last_seen_at: new Date().toISOString(),
        }),
      }).catch(() => null);
    }

    return json({ ok: true, saved_count: saved?.length ?? 0, linked_user: !!authUserId });
  } catch (e) {
    console.error('[register-device] failed', e?.message ?? e);
    notifyError('register-device: failed', String(e?.message ?? e).slice(0, 400));
    return json({ error: 'internal_error' }, 500);
  }
});
