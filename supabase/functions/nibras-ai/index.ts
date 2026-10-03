// =====================================================================
// Nibras · Edge Function "nibras-ai"
// Keeps the Claude API key on the server. The browser sends the user's
// login token; we check it, count the user's AI messages for today, then
// forward the request to the Anthropic Messages API.
//
// Secrets to set in Supabase → Edge Functions → Secrets:
//   ANTHROPIC_API_KEY        (required)  your Claude API key
//   NIBRAS_MODEL_QUICK       (optional)  model for short JSON tasks
//   NIBRAS_MODEL_MAIN        (optional)  model for chat + reports
//   NIBRAS_DAILY_LIMIT       (optional)  AI messages per user per day (default 60)
//   NIBRAS_ALLOWED_ORIGINS   (optional)  e.g. https://name.github.io  (comma-separated; default *)
// Deploy with "Verify JWT" OFF — this function checks the user itself.
// =====================================================================

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODEL_QUICK = Deno.env.get("NIBRAS_MODEL_QUICK") ?? "claude-haiku-4-5-20251001";
const MODEL_MAIN = Deno.env.get("NIBRAS_MODEL_MAIN") ?? "claude-haiku-4-5-20251001";
const DAILY_LIMIT = Number(Deno.env.get("NIBRAS_DAILY_LIMIT") ?? "60");
const ALLOWED = (Deno.env.get("NIBRAS_ALLOWED_ORIGINS") ?? "*").split(",").map((s) => s.trim()).filter(Boolean);
const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
const MAX_INPUT_CHARS = 120_000;

function publicKey(req: Request): string {
  const fromClient = req.headers.get("apikey");
  if (fromClient) return fromClient;
  try {
    const j = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
    if (j.default) return j.default;
  } catch (_) { /* ignore */ }
  return Deno.env.get("SUPABASE_ANON_KEY") ?? "";
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allow = ALLOWED.includes("*") ? "*" : (ALLOWED.includes(origin) ? origin : ALLOWED[0] ?? "");
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function reply(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

type Turn = { role: "user" | "assistant"; content: unknown };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return reply(req, 405, { error: "method_not_allowed" });

  const origin = req.headers.get("Origin") ?? "";
  if (!ALLOWED.includes("*") && origin && !ALLOWED.includes(origin)) {
    return reply(req, 403, { error: "origin_not_allowed" });
  }
  if (!ANTHROPIC_API_KEY) return reply(req, 500, { error: "missing_key", message: "ANTHROPIC_API_KEY is not set" });

  // 1) who is calling?
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const key = publicKey(req);
  if (!token) return reply(req, 401, { error: "session_expired" });
  const who = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } });
  if (!who.ok) return reply(req, 401, { error: "session_expired" });

  // 2) daily limit per user
  const usage = await fetch(`${SUPABASE_URL}/rest/v1/rpc/bump_ai_usage`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_limit: DAILY_LIMIT }),
  });
  if (!usage.ok) {
    return reply(req, 500, { error: "usage_check_failed", message: "Run the database migration (bump_ai_usage is missing)." });
  }
  const u = await usage.json();
  if (!u.ok) return reply(req, 429, { error: "rate_limited", message: "daily limit reached" });

  // 3) validate the request
  let body: { messages?: Turn[]; tier?: string; max_tokens?: number; images?: { media_type: string; data: string }[] };
  try { body = await req.json(); } catch (_) { return reply(req, 400, { error: "bad_request", message: "invalid JSON" }); }
  const raw = Array.isArray(body.messages) ? body.messages : [];
  const turns: { role: "user" | "assistant"; content: string }[] = [];
  let total = 0;
  for (const t of raw) {
    if (!t || (t.role !== "user" && t.role !== "assistant")) continue;
    const text = String(t.content ?? "");
    if (!text.trim()) continue;
    total += text.length;
    const last = turns[turns.length - 1];
    if (last && last.role === t.role) last.content += "\n\n" + text; // merge same-role turns
    else turns.push({ role: t.role, content: text });
  }
  while (turns.length && turns[0].role !== "user") turns.shift();
  if (!turns.length || turns[turns.length - 1].role !== "user") {
    return reply(req, 400, { error: "bad_request", message: "messages must start and end with a user turn" });
  }
  if (total > MAX_INPUT_CHARS) return reply(req, 413, { error: "prompt_too_large" });

  const messages: { role: string; content: unknown }[] = turns.map((t) => ({ role: t.role, content: t.content }));
  const imgs = Array.isArray(body.images) ? body.images.slice(0, 2) : [];
  if (imgs.length) {
    const lastUser = messages[messages.length - 1];
    lastUser.content = [
      ...imgs.filter((i) => i && i.data && /^image\/(jpeg|png|webp|gif)$/.test(i.media_type))
        .map((i) => ({ type: "image", source: { type: "base64", media_type: i.media_type, data: i.data } })),
      { type: "text", text: String(lastUser.content) },
    ];
  }
  const model = body.tier === "quick" ? MODEL_QUICK : MODEL_MAIN;
  const max_tokens = Math.max(64, Math.min(1500, Number(body.max_tokens) || 1000));

  // 4) ask Claude
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({ model, max_tokens, messages }),
      signal: AbortSignal.timeout(55_000),
    });
  } catch (e) {
    return reply(req, 504, { error: "upstream_error", message: String(e) });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = String(data?.error?.message ?? "");
    if (/credit balance/i.test(msg)) return reply(req, 402, { error: "no_credit", message: msg });
    if (res.status === 401) return reply(req, 500, { error: "bad_api_key", message: "Check ANTHROPIC_API_KEY" });
    if (res.status === 429 || res.status === 529) return reply(req, 429, { error: "rate_limited", message: msg });
    return reply(req, 502, { error: "upstream_error", message: msg || `Anthropic HTTP ${res.status}` });
  }
  const text = Array.isArray(data.content)
    ? data.content.filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("\n")
    : "";
  return reply(req, 200, { text, stop_reason: data.stop_reason, model: data.model, usage: data.usage });
});
