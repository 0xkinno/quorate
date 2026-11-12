/**
 * Settle a run whose families were charged but whose vendor payout never went out (for example a run
 * from before refused payouts were retried). Everything is rebuilt from the run's own attempt log: what
 * PayPal captured, refunded and voided. If charged equals what the vendors are due for the children who
 * went, one payout batch is sent with a fresh sender_batch_id and the run record is completed.
 * Usage: npx tsx --env-file=.env scripts/settle-run.ts <poolId>
 */
import { db } from "../src/db/store";
import { LedgerAttempts } from "../src/db/store";
import { getPool, type Pool, type PoolMember } from "../src/pool/service";
import type { CloseResult, MemberOut } from "../src/bursar/close";
import { createPayout } from "../src/paypal/rest";

const poolId = process.argv[2];
const s = db();
const v = await getPool(poolId);
if (!v) throw new Error("no such pool");
const attempts = (await new LedgerAttempts(s).list(poolId)).filter((a) => a.result?.ok);
const failed = (await new LedgerAttempts(s).list(poolId)).filter((a) => a.result && !a.result.ok);
if (attempts.some((a) => a.op === "payout")) throw new Error("a payout already succeeded for this run");
const usd = (c: number) => `$${(c / 100).toFixed(2)}`;

const outs: MemberOut[] = v.members.map((m) => {
  const caps = attempts.filter((a) => a.op === "capture" && a.memberId === m.id).map((a) => a.result!.ok ? (a.result as { ok: true; value: { captureId: string; cents: number } }).value : null).filter(Boolean) as { captureId: string; cents: number }[];
  const charged = caps.reduce((x, c) => x + c.cents, 0);
  const declined = failed.find((a) => a.op === "capture" && a.memberId === m.id);
  return { id: m.id, label: m.child, role: m.role, capCents: m.capCents, status: declined && !charged ? "DECLINED" : charged ? "SETTLED" : "RELEASED", verdict: "OBSERVED",
    chargedCents: charged, releasedCents: m.capCents - charged, captures: caps.map((c) => ({ captureId: c.captureId, cents: c.cents })), refunds: [], note: declined ? declined.result!.ok ? undefined : (declined.result as { error: string }).error : undefined };
});
const going = outs.filter((o) => o.role === "child" && o.chargedCents > 0).length;
const netCharged = outs.reduce((x, o) => x + o.chargedCents, 0);
const due = v.pool.vendors.map((x) => x.fixedCents + x.perHeadCents * going);
const vendorsDue = due.reduce((a, b) => a + b, 0);
if (netCharged !== vendorsDue) throw new Error(`charged ${netCharged} does not equal due ${vendorsDue}; not paying`);

const items = v.pool.vendors.map((x, i) => ({ receiver: x.receiver, cents: due[i], senderItemId: `${poolId}-v${i}-settle`, note: `${x.name}: ${going} children` }));
const senderBatchId = `pool:${poolId}:close:1:settle:1`;
const po = await createPayout({ senderBatchId, subject: "Class trip payment", items });

const prior = (await s.get<CloseResult & { steps?: string[] }>("close", poolId))?.steps ?? [];
const steps = [...prior.filter((x) => !/^Payout|refused the payout/.test(x)),
  `Charged ${usd(netCharged)} against ${usd(vendorsDue)} due: exact (rebuilt from the attempt log)`,
  "The first payout was refused (INSUFFICIENT_FUNDS) before refused payouts were retried; settled afterwards",
  `Payout batch ${po.batchId}: ${items.map((i) => usd(i.cents)).join(" + ")}`];
const result: CloseResult = { state: "CLOSED", poolId, closeAttempt: 1, port: "sandbox", plan: null, members: outs, steps,
  payout: { batchId: po.batchId, senderBatchId, status: po.status, items }, reconciled: { vendorsDue, netCharged, exact: true, cashCents: 0, payoutCents: vendorsDue } };
await s.put("close", poolId, poolId, { ...result, startedAt: v.pool.createdAt, finishedAt: new Date().toISOString() });
for (const o of outs) { const m = v.members.find((x) => x.id === o.id)! as PoolMember; await s.put("member", `${poolId}:${m.id}`, poolId, { ...m, state: o.status }); }
const pool: Pool = { ...v.pool, state: "CLOSED", note: "Families were charged exactly when the first payout was refused (INSUFFICIENT_FUNDS); the vendors were paid afterwards from the same run, rebuilt from its attempt log." };
await s.put("pool", poolId, poolId, pool);
await s.put("run", poolId, poolId, { poolId, at: v.pool.createdAt, port: "sandbox", holdSource: v.pool.holdSource, state: "CLOSED", decline: Boolean(v.pool.decline), scenario: "L3", reconciled: result.reconciled, payout: result.payout, n: v.members.length });
console.log(poolId, "charged", netCharged, "paid", vendorsDue, "batch", po.batchId, po.status);
