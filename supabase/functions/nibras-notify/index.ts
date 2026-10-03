// =====================================================================
// Nibras · Edge Function "nibras-notify"
// Sends a real e-mail to the parents linked to a student when the student
// finishes the diagnostic, masters a skill, or finishes a level / the path.
//
// The browser (student, logged in) sends: { kind, subject, body }.
// This function checks the login, finds the linked parents on the server
// (the student never sees a parent's e-mail), respects each parent's
// notification settings, then sends through Resend (https://resend.com).
//
// Secrets to set in Supabase → Edge Functions → Secrets:
//   RESEND_API_KEY           (required)  your Resend API key (re_...)
//   NIBRAS_MAIL_FROM         (optional)  default: Nibras <onboarding@resend.dev>
//                                        (the Resend test sender: without your own
//                                         domain it only delivers to the e-mail of
//                                         the Resend account itself)
//   NIBRAS_ALLOWED_ORIGINS   (optional)  same secret used by "nibras-ai"
// Deploy with "Verify JWT" OFF — this function checks the user itself.
// =====================================================================

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const MAIL_FROM = Deno.env.get("NIBRAS_MAIL_FROM") ?? "Nibras <onboarding@resend.dev>";
const ALLOWED = (Deno.env.get("NIBRAS_ALLOWED_ORIGINS") ?? "*").split(",").map((s) => s.trim()).filter(Boolean);
const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
const RESEND_URL = "https://api.resend.com/emails";
const KINDS = ["diag", "skill", "level"];
const MAX_SUBJECT = 150;
const MAX_BODY = 3000;
const MAX_PARENTS = 5;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;

function publicKey(req: Request): string {
  const fromClient = req.headers.get("apikey");
  if (fromClient) return fromClient;
  try {
    const j = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
    if (j.default) return j.default;
  } catch (_) { /* ignore */ }
  return Deno.env.get("SUPABASE_ANON_KEY") ?? "";
}

// server-only key: lets this function read the parents' e-mails (never sent to the browser)
function serviceKey(): string {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  try {
    const j = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
    if (j.default) return j.default;
  } catch (_) { /* ignore */ }
  return "";
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

// plain text only: drop control characters, keep new lines in the body
function clean(v: unknown, max: number, oneLine: boolean): string {
  let s = String(v ?? "").replace(/\r\n?/g, "\n");
  s = oneLine ? s.replace(/[\u0000-\u001f\u007f]+/g, " ") : s.replace(/[\u0000-\u0009\u000b-\u001f\u007f]+/g, " ");
  return s.trim().slice(0, max);
}

async function rest(path: string, key: string): Promise<unknown[] | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) {
    console.error("[nibras-notify] database read failed", res.status, path.split("?")[0]);
    return null;
  }
  const j = await res.json().catch(() => null);
  return Array.isArray(j) ? j : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return reply(req, 405, { error: "method_not_allowed" });

  const origin = req.headers.get("Origin") ?? "";
  if (!ALLOWED.includes("*") && origin && !ALLOWED.includes(origin)) {
    return reply(req, 403, { error: "origin_not_allowed" });
  }
  if (!RESEND_API_KEY) return reply(req, 500, { error: "missing_key", message: "RESEND_API_KEY is not set" });
  const service = serviceKey();
  if (!service) return reply(req, 500, { error: "missing_service_key" });

  // 1) who is calling?
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return reply(req, 401, { error: "session_expired" });
  const who = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: publicKey(req), Authorization: `Bearer ${token}` } });
  if (!who.ok) return reply(req, 401, { error: "session_expired" });
  const user = await who.json().catch(() => ({}));
  const uid = String(user?.id ?? "");
  if (!UUID.test(uid)) return reply(req, 401, { error: "session_expired" });

  // 2) validate the request
  let body: { kind?: string; subject?: string; body?: string };
  try { body = await req.json(); } catch (_) { return reply(req, 400, { error: "bad_request", message: "invalid JSON" }); }
  const kind = String(body.kind ?? "");
  if (!KINDS.includes(kind)) return reply(req, 400, { error: "bad_request", message: "unknown kind" });
  const subject = clean(body.subject, MAX_SUBJECT, true);
  const text = clean(body.body, MAX_BODY, false);
  if (!subject || !text) return reply(req, 400, { error: "bad_request", message: "subject and body are required" });

  // 3) only students notify, and only their own linked parents
  const me = await rest(`profiles?id=eq.${uid}&select=role`, service);
  if (!me) return reply(req, 500, { error: "database_error" });
  if ((me[0] as { role?: string } | undefined)?.role !== "student") return reply(req, 403, { error: "not_student" });

  const links = await rest(`links?student_id=eq.${uid}&select=parent_id`, service);
  if (!links) return reply(req, 500, { error: "database_error" });
  const ids = links.map((l) => String((l as { parent_id?: string }).parent_id ?? "")).filter((id) => UUID.test(id)).slice(0, MAX_PARENTS);
  if (!ids.length) return reply(req, 200, { sent: 0, failed: 0, skipped: 0, parents: 0 });

  const parents = await rest(`profiles?id=in.(${ids.join(",")})&role=eq.parent&select=ident,ident_kind,prefs`, service);
  if (!parents) return reply(req, 500, { error: "database_error" });

  // 4) each parent's own settings decide: channel must be e-mail and this kind switched on
  const to: string[] = [];
  let skipped = 0;
  for (const row of parents) {
    const p = row as { ident?: string; ident_kind?: string; prefs?: Record<string, unknown> };
    const prefs = p.prefs && typeof p.prefs === "object" ? p.prefs : {};
    const email = String(prefs.email || (p.ident_kind === "email" ? p.ident : "") || "").trim();
    if (prefs.channel === "sms" || prefs[kind] === false || !EMAIL.test(email)) { skipped++; continue; }
    if (!to.includes(email.toLowerCase())) to.push(email.toLowerCase());
  }

  // 5) send (one e-mail per parent, so parents never see each other's address)
  let sent = 0, failed = 0;
  for (const email of to) {
    try {
      const res = await fetch(RESEND_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: MAIL_FROM, to: [email], subject, text }),
        signal: AbortSignal.timeout(20_000),
      });
      if (res.ok) {
        sent++;
        // the id lets you find this e-mail in the Resend dashboard (Emails)
        const ok = await res.json().catch(() => ({}));
        console.log("[nibras-notify] accepted by Resend", kind, "id:", String(ok?.id ?? "?"));
      } else {
        failed++;
        // details stay in the function logs (Edge Functions → nibras-notify → Logs), not in the browser
        const detail = await res.text().catch(() => "");
        console.error("[nibras-notify] send failed", res.status, detail.slice(0, 500));
      }
    } catch (e) {
      failed++;
      console.error("[nibras-notify] send error", String(e));
    }
  }
  console.log("[nibras-notify] done", kind, JSON.stringify({ sent, failed, skipped, parents: ids.length }));
  return reply(req, 200, { sent, failed, skipped, parents: ids.length });
});
