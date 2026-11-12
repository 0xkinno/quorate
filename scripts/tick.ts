/**
 * Render cron, every minute. Idempotent: every PayPal call carries a request id derived from the
 * pool, member, operation and attempt, so running twice never acts twice.
 *  1 renew holds whose renew_at has passed (reauthorize restarts the 3-day honor period)
 *  2 at close time: close a pool that has enough children; void every hold of one that does not (LAPSED)
 *  3 poll payout batches that are not final
 */
import { db, LedgerAttempts } from "../src/db/store";
import { listPools, getPool, type Pool, type PoolMember } from "../src/pool/service";
import { cancelClose, runClose, type CloseResult } from "../src/bursar/close";
import { planRenewal } from "../src/bursar/renewal";
import { LivePayPal, reauthorize, hasPayPalKeys } from "../src/paypal/live";
import { requestId } from "../src/paypal/types";

const s = db();
const now = Date.now();
const log: Record<string, unknown>[] = [];

if (!hasPayPalKeys()) { console.log(JSON.stringify({ tick: new Date(now).toISOString(), skipped: "no PayPal keys" })); process.exit(0); }
const port = new LivePayPal();

for (const pool of await listPools("class", s)) {
  if (pool.state !== "OPEN") continue;
  const v = await getPool(pool.id, s);
  if (!v) continue;
  // 1. Renewals.
  for (const m of v.members) {
    if (m.state !== "HELD" || !m.authId || !m.renewAt || Date.parse(m.renewAt) > now) continue;
    try {
      const r = await reauthorize(m.authId, m.capCents, requestId(pool.id, m.id, "reauthorize", m.authId));
      const plan = planRenewal(now, Date.parse(pool.closeAt));
      const next: PoolMember = { ...m, authId: r!.authId, honorUntil: new Date(plan.honorUntil).toISOString(), renewAt: null };
      await s.put("member", `${pool.id}:${m.id}`, pool.id, next);
      log.push({ pool: pool.id, member: m.id, renewed: r!.authId });
    } catch (e) { log.push({ pool: pool.id, member: m.id, renewFailed: (e as Error).message }); }
  }
  // 2. Close time.
  if (now < Date.parse(pool.closeAt)) continue;
  const fresh = await s.get<Pool>("pool", pool.id);
  if (fresh?.state !== "OPEN") continue; // another tick claimed it
  await s.put("pool", pool.id, pool.id, { ...fresh, state: "CLOSING" });
  const held = (await getPool(pool.id, s))!.members.filter((m) => m.state === "HELD" && m.authId);
  const children = held.filter((m) => m.role === "child").length;
  const ctx = { pool, port, store: new LedgerAttempts(s), closeAttempt: 1,
    members: held.map((m) => ({ id: m.id, label: m.child, role: m.role, seq: m.seq, capCents: m.capCents, authId: m.authId!, approvedHash: m.approvedHash! })) };
  let result: CloseResult = await runClose(ctx);
  let state: Pool["state"] = result.state === "CLOSED" ? "CLOSED" : "NEEDS_TEACHER";
  // At close time there is no later moment to wait for: a close that cannot finish is cancelled, every capture
  // refunded and every hold voided, so no family stays charged for a trip that is not happening.
  if (result.state === "NEEDS_TEACHER") { result = await cancelClose(ctx, result); state = "LAPSED"; log.push({ pool: pool.id, children, cancelled: true }); }
  await s.put("close", pool.id, pool.id, { ...result, startedAt: new Date(now).toISOString(), finishedAt: new Date().toISOString() });
  for (const o of result.members) { const m = held.find((x) => x.id === o.id)!; await s.put("member", `${pool.id}:${m.id}`, pool.id, { ...m, state: o.status === "EXPIRED" ? "RELEASED" : o.status }); }
  await s.put("pool", pool.id, pool.id, { ...pool, state });
  log.push({ pool: pool.id, closed: state, reconciled: result.reconciled });
}

// 3. Payouts not final.
for (const run of await s.list<{ poolId: string; port: string }>("run")) {
  if (run.port !== "sandbox") continue;
  const c = await s.get<CloseResult>("close", run.poolId);
  if (!c?.payout?.batchId || ["SUCCESS", "DENIED", "CANCELED"].includes(c.payout.status) || c.payout.status.startsWith("REFUSED")) continue;
  try {
    const p = await port.getPayout(c.payout.batchId);
    if (p.status !== c.payout.status) {
      c.payout.status = p.status; await s.put("close", run.poolId, run.poolId, c);
      await s.put("run", run.poolId, run.poolId, { ...run, payout: c.payout });
      log.push({ pool: run.poolId, payout: p.status });
    }
  } catch (e) { log.push({ pool: run.poolId, payoutPollFailed: (e as Error).message }); }
}

console.log(JSON.stringify({ tick: new Date(now).toISOString(), actions: log }));
process.exit(0);
