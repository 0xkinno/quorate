import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { db, type Store } from "../db/store";

/**
 * First boot on a fresh database: import the recorded live sandbox runs from docs/live-runs, so a
 * judge opening the deployed site sees real runs with their PayPal ids and attempt logs straight away.
 * Imported runs keep their original timestamps and are labelled "recorded live run" in the UI.
 */
let done: Promise<void> | null = null;

export function ensureSeeded(s: Store = db()) {
  if (!done) done = seed(s).catch(() => { done = null; });
  return done;
}

async function seed(s: Store) {
  if ((await s.get("meta", "seeded")) || (await s.list("run")).length > 0) return;
  const dir = join(process.cwd(), "docs", "live-runs");
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    const r = JSON.parse(readFileSync(join(dir, f), "utf8"));
    if (!r.pool || r.pool.port !== "sandbox") continue;
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
