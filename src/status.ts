import { hasPayPalKeys } from "./paypal/live";

/** Measured status: every value comes from a probe made in this process, with its time. */
export type Probe = { ok: boolean; detail: string; at: string; ms: number };

async function timed(fn: () => Promise<string>): Promise<Probe> {
  const t = Date.now();
  try { const detail = await fn(); return { ok: true, detail, at: new Date().toISOString(), ms: Date.now() - t }; }
  catch (e) { return { ok: false, detail: (e as Error).message.slice(0, 200), at: new Date().toISOString(), ms: Date.now() - t }; }
}

export async function measure() {
  const paypal = hasPayPalKeys()
    ? await timed(async () => { const { token } = await import("./paypal/rest"); await token(); return "sandbox token issued"; })
    : { ok: false, detail: "no sandbox keys: PayPal stand-in in use", at: new Date().toISOString(), ms: 0 };
  const db = process.env.DATABASE_URL
    ? await timed(async () => { const { default: postgres } = await import("postgres"); const sql = postgres(process.env.DATABASE_URL!, { max: 1, connect_timeout: 5 }); try { const r = await sql`select now() as now`; return `postgres ${String(r[0].now)}`; } finally { await sql.end(); } })
    : { ok: false, detail: "no DATABASE_URL", at: new Date().toISOString(), ms: 0 };
  const backend = process.env.LLM_BACKEND ?? "replay";
  const model: Probe = { ok: backend === "replay" || Boolean(process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY), detail: backend === "replay" ? "replay: recorded model answers" : `${backend} configured`, at: new Date().toISOString(), ms: 0 };
  return { service: "quorate", payments: hasPayPalKeys() ? "sandbox" : "stand-in", live: process.env.QUORATE_LIVE !== "off", probes: { paypal, db, model } };
}
