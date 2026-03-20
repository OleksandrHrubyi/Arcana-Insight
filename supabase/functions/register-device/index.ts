type ReqBody = {
  token: string;
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!SUPABASE_URL || !SERVICE_ROLE) return json({ error: "Missing env" }, 500);

    const body: ReqBody = await req.json().catch(() => ({} as ReqBody));

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

    const url = `${SUPABASE_URL}/rest/v1/push_devices?on_conflict=token`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE,
        authorization: `Bearer ${SERVICE_ROLE}`,
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify([{
        token,
        platform,
        locale,
        enabled,
        apns_env,
        notify_hour,
        notify_minute,
        tz,
        last_seen_at: new Date().toISOString(),
      }]),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return json({ error: "Upsert failed", status: res.status, body: t }, 500);
    }

    const saved = await res.json().catch(() => []);
    return json({ ok: true, saved_count: saved?.length ?? 0 });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
