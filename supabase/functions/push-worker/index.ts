type DueRow = {
  token: string;
  apns_env: "sandbox" | "production";
  locale: string | null;
};

function json(res: unknown, status = 200) {
  return new Response(JSON.stringify(res, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function b64url(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  const b64 = btoa(s);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function utf8(str: string) {
  return new TextEncoder().encode(str);
}

function pemToDerPkcs8(pem: string): ArrayBuffer {
  const normalized = pem.replace(/\\n/g, "\n");
  const base64 = normalized
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}

async function importApnsPrivateKey(p8Pem: string): Promise<CryptoKey> {
  const der = pemToDerPkcs8(p8Pem);
  return await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

async function makeApnsJwt(params: { teamId: string; keyId: string; p8: string }) {
  const key = await importApnsPrivateKey(params.p8);
  const header = { alg: "ES256", kid: params.keyId };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: params.teamId, iat: now };

  const encHeader = b64url(utf8(JSON.stringify(header)));
  const encPayload = b64url(utf8(JSON.stringify(payload)));
  const data = utf8(`${encHeader}.${encPayload}`);

  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    data,
  );

  return `${encHeader}.${encPayload}.${b64url(new Uint8Array(sig))}`;
}

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function hostForEnv(env: "sandbox" | "production") {
  return env === "production"
    ? "https://api.push.apple.com"
    : "https://api.sandbox.push.apple.com";
}

function parseApnsReason(bodyText: string): string | null {
  try {
    const j = JSON.parse(bodyText);
    return typeof j?.reason === "string" ? j.reason : null;
  } catch {
    return null;
  }
}

function isInvalidTokenFailure(status: number, reason: string | null) {
  if (status === 410) return true;
  if (status === 400 && reason === "BadDeviceToken") return true;
  if (status === 400 && reason === "Unregistered") return true;
  return false;
}

async function disableTokensInDb(params: {
  supabaseUrl: string;
  serviceRole: string;
  tokens: string[];
}) {
  const { supabaseUrl, serviceRole, tokens } = params;
  if (!tokens.length) return 0;

  const chunkSize = 50;
  let disabled = 0;

  for (let i = 0; i < tokens.length; i += chunkSize) {
    const batch = tokens.slice(i, i + chunkSize);
    const inFilter = `in.(${batch.join(",")})`;
    const url = `${supabaseUrl}/rest/v1/push_devices?token=${inFilter}`;

    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        apikey: serviceRole,
        authorization: `Bearer ${serviceRole}`,
        "content-type": "application/json",
        prefer: "return=minimal",
      },
      body: JSON.stringify({
        enabled: false,
        last_seen_at: new Date().toISOString(),
      }),
    });

    if (res.ok) disabled += batch.length;
  }

  return disabled;
}

async function rpcPushMarkSent(params: {
  supabaseUrl: string;
  serviceRole: string;
  tokens: string[];
}) {
  if (!params.tokens.length) return 0;

  const url = `${params.supabaseUrl}/rest/v1/rpc/push_mark_sent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: params.serviceRole,
      authorization: `Bearer ${params.serviceRole}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ p_tokens: params.tokens }),
  });

  if (!res.ok) return 0;

  const n = await res.json().catch(() => 0);
  return Number(n) || 0;
}

async function fetchDue(params: {
  supabaseUrl: string;
  serviceRole: string;
  limit: number;
}) {
  const qs = new URLSearchParams();
  qs.set("select", "token,apns_env,locale");
  qs.set("enabled", "eq.true");
  qs.set("platform", "eq.ios");
  qs.set("next_send_at", `lte.${new Date().toISOString()}`);
  qs.set("order", "next_send_at.asc");
  qs.set("limit", String(params.limit));

  const url = `${params.supabaseUrl}/rest/v1/push_devices?${qs.toString()}`;
  const res = await fetch(url, {
    headers: {
      apikey: params.serviceRole,
      authorization: `Bearer ${params.serviceRole}`,
    },
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`fetchDue failed: ${res.status} ${t}`);
  }

  return (await res.json()) as DueRow[];
}

async function sendApns(params: {
  host: string;
  tokens: string[];
  jwt: string;
  bundleId: string;
  payload: unknown;
}) {
  const batches = chunk(params.tokens, 50);

  let okCount = 0;
  const invalidTokens: string[] = [];
  const failures: Array<{ token: string; status: number; reason: string | null; body: string }> = [];

  for (const batch of batches) {
    const results = await Promise.all(batch.map(async (token) => {
      const url = `${params.host}/3/device/${token}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          authorization: `bearer ${params.jwt}`,
          "apns-topic": params.bundleId,
          "apns-push-type": "alert",
          "apns-priority": "10",
          "content-type": "application/json",
        },
        body: JSON.stringify(params.payload),
      });

      if (res.ok) return { token, ok: true as const, status: res.status, body: "", reason: null as string | null };

      const text = await res.text().catch(() => "");
      const reason = parseApnsReason(text);
      return { token, ok: false as const, status: res.status, body: text, reason };
    }));

    for (const r of results) {
      if (r.ok) okCount++;
      else {
        failures.push({ token: r.token, status: r.status, reason: r.reason, body: r.body });
        if (isInvalidTokenFailure(r.status, r.reason)) invalidTokens.push(r.token);
      }
    }
  }

  return { okCount, invalidTokens, failures };
}

function messageForLocale(locale: string | null) {
  if ((locale || "").toLowerCase() === "en") {
    return { title: "Arcana", body: "Your daily horoscope is ready ✨" };
  }
  return { title: "Arcana", body: "Гороскоп дня вже готовий ✨" };
}

Deno.serve(async (req) => {
  try {
    // захистимо воркер секретом
    const adminSecret = Deno.env.get("ADMIN_PUSH_SECRET");
    if (adminSecret) {
      const got = req.headers.get("x-push-secret");
      if (got !== adminSecret) return json({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = requireEnv("SUPABASE_URL");
    const SERVICE_ROLE = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    const APNS_TEAM_ID = requireEnv("APNS_TEAM_ID");
    const APNS_KEY_ID = requireEnv("APNS_KEY_ID");
    const APNS_BUNDLE_ID = requireEnv("APNS_BUNDLE_ID");
    const APNS_P8 = requireEnv("APNS_P8");

    const jwt = await makeApnsJwt({ teamId: APNS_TEAM_ID, keyId: APNS_KEY_ID, p8: APNS_P8 });

    const due = await fetchDue({ supabaseUrl: SUPABASE_URL, serviceRole: SERVICE_ROLE, limit: 500 });

    if (!due.length) return json({ ok: true, due: 0, sent: 0 });

    // групуємо: env -> locale -> tokens
    const buckets = new Map<string, string[]>();
    for (const row of due) {
      const env = row.apns_env || "sandbox";
      const loc = (row.locale || "uk").toLowerCase();
      const key = `${env}__${loc}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(row.token);
    }

    let totalSent = 0;
    let totalDisabled = 0;
    let totalMarked = 0;
    const sampleFailures: any[] = [];

    for (const [key, tokens] of buckets.entries()) {
      const [env, loc] = key.split("__") as ["sandbox" | "production", string];
      const host = hostForEnv(env);

      const msg = messageForLocale(loc);
      const payload = {
        aps: { alert: { title: msg.title, body: msg.body }, sound: "default" },
        route: "horoscope",
        date: new Date().toISOString().slice(0, 10),
      };

      const { okCount, invalidTokens, failures } = await sendApns({
        host,
        tokens,
        jwt,
        bundleId: APNS_BUNDLE_ID,
        payload,
      });

      totalSent += okCount;

      // вимкнути мертві
      totalDisabled += await disableTokensInDb({
        supabaseUrl: SUPABASE_URL,
        serviceRole: SERVICE_ROLE,
        tokens: invalidTokens,
      });

      // якщо хоч один успішний відправився — переставляємо next_send_at
      // (для простоти: позначаємо "sent" усі токени в bucket, але якщо хочеш строго — можна передавати тільки successful)
      // зробимо строго: позначимо тільки ті, що НЕ в failures
      const failedSet = new Set(failures.map(f => f.token));
      const successTokens = tokens.filter(t => !failedSet.has(t));

      totalMarked += await rpcPushMarkSent({
        supabaseUrl: SUPABASE_URL,
        serviceRole: SERVICE_ROLE,
        tokens: successTokens,
      });

      for (const f of failures.slice(0, 3)) sampleFailures.push({ env, locale: loc, ...f });
    }

    return json({
      ok: true,
      due: due.length,
      sent: totalSent,
      disabled: totalDisabled,
      marked_next: totalMarked,
      sampleFailures,
    });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
