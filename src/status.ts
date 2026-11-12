import { hasPayPalKeys } from "./paypal/live";

/** Measured status: every value comes from a probe made in this process, with its time. */
export type Probe = { ok: boolean; detail: string; at: string; ms: number };

async function timed(fn: () => Promise<string>): Promise<Probe> {
  const t = Date.now();
  try { const detail = await fn(); return { ok: true, detail, at: new Date().toISOString(), ms: Date.now() - t }; }
  catch (e) { return { ok: false, detail: (e as Error).message.slice(0, 200), at: new Date().toISOString(), ms: Date.now() - t }; }
}

let modelCache: { probe: Probe; until: number } | null = null;
async function modelProbe(): Promise<Probe> {
  if (modelCache && modelCache.until > Date.now()) return modelCache.probe;
  const probe = await timed(async () => {
    const [{ generateText }, { model, MODEL_ID }] = await Promise.all([import("ai"), import("./crew/model")]);
    const r = await generateText({ model: model(), prompt: "Reply with the single word OK.", maxRetries: 0 });
    return `${MODEL_ID} answered "${r.text.trim().slice(0, 12)}"`;
  });
  modelCache = { probe, until: Date.now() + 10 * 60_000 };
  return probe;
}

export async function measure() {
  const paypal = hasPayPalKeys()
    ? await timed(async () => { const { token } = await import("./paypal/rest"); await token(); return "sandbox token issued"; })
    : { ok: false, detail: "no sandbox keys: PayPal stand-in in use", at: new Date().toISOString(), ms: 0 };
  const db = process.env.DATABASE_URL
    ? await timed(async () => { const { default: postgres } = await import("postgres"); const sql = postgres(process.env.DATABASE_URL!, { max: 1, connect_timeout: 5 }); try { const r = await sql`select now() as now`; return `postgres ${String(r[0].now)}`; } finally { await sql.end(); } })
    : { ok: false, detail: "no DATABASE_URL", at: new Date().toISOString(), ms: 0 };
  const backend = process.env.LLM_BACKEND ?? "replay";
  // A real one-word model call, cached for ten minutes so status checks do not spend the quota.
  const model: Probe = backend === "replay" || !process.env.GEMINI_API_KEY
    ? { ok: true, detail: "replay: recorded model answers", at: new Date().toISOString(), ms: 0 }
    : await modelProbe();
  return { service: "quorate", payments: hasPayPalKeys() ? "sandbox" : "stand-in", live: process.env.QUORATE_LIVE !== "off", probes: { paypal, db, model } };
}
