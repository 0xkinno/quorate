import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { db, type Store } from "../db/store";

/**
 * On each boot, import any recorded live sandbox run from docs/live-runs that the database lacks, so a
 * judge opening the deployed site sees real runs with their PayPal ids and attempt logs straight away.
 * Imported runs keep their original timestamps and are labelled "recorded live run" in the UI.
 */
let done: Promise<void> | null = null;

export function ensureSeeded(s: Store = db()) {
  if (!done) done = seed(s).catch(() => { done = null; });
  return done;
}

async function seed(s: Store) {
  const dir = join(process.cwd(), "docs", "live-runs");
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    const r = JSON.parse(readFileSync(join(dir, f), "utf8"));
    if (!r.pool || r.pool.port !== "sandbox") continue;
    const existing = await s.get<{ recorded?: boolean }>("pool", r.pool.id);
    if (existing && !existing.recorded) continue; // a run made on this deployment: never overwritten
    // Recorded runs are refreshed from their files, so a later payout status reaches the site.
    const pool = { ...r.pool, recorded: true };
    await s.put("pool", pool.id, pool.id, pool);
    for (const m of r.members) await s.put("member", `${pool.id}:${m.id}`, pool.id, { ...m, token: `recorded-${pool.id}-${m.id}` });
    if (r.close) await s.put("close", pool.id, pool.id, r.close);
    for (const a of r.attempts ?? []) await s.put("attempt", a.requestId, pool.id, a);
    await s.put("run", pool.id, pool.id, { poolId: pool.id, at: pool.createdAt, port: "sandbox", holdSource: pool.holdSource, state: r.close?.state ?? pool.state,
      decline: Boolean(pool.decline), scenario: r.scenario, reconciled: r.close?.reconciled, payout: r.close?.payout, n: r.members.length, recorded: true });
  }
  await s.put("meta", "seeded", null, { at: new Date().toISOString() });
}
