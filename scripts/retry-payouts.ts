/**
 * Retry vendor payouts that PayPal refused (for example INSUFFICIENT_FUNDS while new funds are held).
 * Each retry uses a new sender_batch_id (pool:<id>:close:<n>:retry:<k>), so PayPal's duplicate guard
 * still protects every batch. Usage: npx tsx --env-file=.env scripts/retry-payouts.ts
 */
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { db } from "../src/db/store";
import { LivePayPal } from "../src/paypal/live";
import type { CloseResult } from "../src/bursar/close";

const s = db();
const port = new LivePayPal();
for (const run of await s.list<{ poolId: string; port: string }>("run")) {
  if (run.port !== "sandbox") continue;
  const c = await s.get<CloseResult & { payoutRetries?: number }>("close", run.poolId);
  if (!c || c.state !== "CLOSED" || !c.payout || !(c.payout.status.startsWith("REFUSED") || c.payout.status === "DENIED")) continue;
  const k = (c.payoutRetries ?? 0) + 1;
  const senderBatchId = `${c.payout.senderBatchId}:retry:${k}`;
  try {
    const po = await port.payout({ senderBatchId, subject: "Class trip payment", items: c.payout.items });
    c.payout = { ...c.payout, batchId: po.batchId, senderBatchId, status: po.status };
    c.steps.push(`Payout retried: batch ${po.batchId}`);
  } catch (e) { c.payout.status = `REFUSED ${(e as Error).message.split(" debug")[0]}`; }
  c.payoutRetries = k;
  await s.put("close", run.poolId, run.poolId, c);
  const rec = await s.get<Record<string, unknown>>("run", run.poolId);
  await s.put("run", run.poolId, run.poolId, { ...rec, payout: c.payout });
  const f = `docs/live-runs/${run.poolId}.json`;
  if (existsSync(f)) { const j = JSON.parse(readFileSync(f, "utf8")); j.close = { ...j.close, payout: c.payout, steps: c.steps }; writeFileSync(f, JSON.stringify(j, null, 2)); }
  console.log(run.poolId, c.payout.status, c.payout.batchId);
}
