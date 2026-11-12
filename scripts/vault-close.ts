/**
 * L8, the Vault path, live on the PayPal sandbox. A trip 40 days out is past what a hold can reach, so
 * holdOrVault() chooses VAULT: families save PayPal for the trip (here, the one sandbox buyer wallet saved
 * with scripts/vault-setup.ts stands in for each family's saved wallet, and is labelled so). The close is
 * run now for the demo; in production the tick runs it at close time. Each share is computed by the same
 * allocate(), checked by assertWithinCap, charged as a merchant-initiated payment, then one payout.
 * Usage: npx tsx --env-file=.env scripts/vault-close.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { db } from "../src/db/store";
import { makePool, savePool, getPool, type PoolMember } from "../src/pool/service";
import { allocate, worstCaseShare } from "../src/bursar/allocate";
import { holdOrVault, DAY } from "../src/bursar/renewal";
import { assertWithinCap } from "../src/bursar/guards";
import { hashFor, poolFixed, poolPerHead, type CloseResult, type MemberOut } from "../src/bursar/close";
import { chargeSavedWallet } from "../src/paypal/cardhold";
import { createPayout } from "../src/paypal/rest";
import { requestId } from "../src/paypal/types";

const s = db();
const vaultId = process.env.PAYPAL_VAULT_ID!;
const t0 = Date.now();
const { pool, members } = makePool("live-run", "Live run, 20 families, trip 40 days out (Vault path)", 20, "sandbox", "saved-wallet");
pool.closeAt = pool.deadline = new Date(t0 + 40 * DAY).toISOString();
const mode = holdOrVault(t0, Date.parse(pool.closeAt));
if (mode !== "VAULT") throw new Error("expected the Vault path");
pool.note = "Trip 40 days out: past what a hold can reach, so each family saves PayPal for the trip and is charged the real share at the close. One sandbox buyer's saved wallet stands in for each family's. The close was run at once for the demo.";
const cap = worstCaseShare(poolFixed(pool), poolPerHead(pool), pool.minN);
const saved: PoolMember[] = members.map((m) => ({ ...m, capCents: cap, state: "HELD", authId: `VAULT-${vaultId}`, orderId: "saved wallet", approvedHash: hashFor(pool, cap), source: "saved-wallet" }));
pool.state = "CLOSING";
await savePool(s, pool, saved);

const plan = allocate(poolFixed(pool), poolPerHead(pool), saved.map((m) => ({ id: m.id, role: m.role, seq: m.seq, capCents: m.capCents })));
if (!plan.ok) throw new Error("infeasible");
const steps = [`Vault path chosen: close ${pool.closeAt.slice(0, 10)} is more than 26 days away`, `Share per child $${(plan.level / 100).toFixed(2)} for 20 children, total $${(plan.total / 100).toFixed(2)}`];
const outs: MemberOut[] = [];
let charged = 0;
for (const m of saved) {
  const cents = plan.charges[m.id];
  assertWithinCap(m.capCents, 0, cents);
  const c = await chargeSavedWallet({ vaultId, memberId: m.id, poolId: pool.id, cents, termsHash: m.approvedHash!, requestId: requestId(pool.id, m.id, "vault-charge", 1) });
  charged += c.cents;
  steps.push(`${m.child}: charged $${(c.cents / 100).toFixed(2)} from the saved wallet`);
  outs.push({ id: m.id, label: m.child, role: m.role, capCents: m.capCents, status: "SETTLED", verdict: "OBSERVED", chargedCents: c.cents, releasedCents: m.capCents - c.cents, captures: [{ captureId: c.captureId, cents: c.cents }], refunds: [] });
}
const exact = charged === plan.total;
steps.push(`Charged $${(charged / 100).toFixed(2)} against $${(plan.total / 100).toFixed(2)} due: ${exact ? "exact" : "MISMATCH"}`);
const items = pool.vendors.map((v, i) => ({ receiver: v.receiver, cents: v.fixedCents + v.perHeadCents * 20, senderItemId: `${pool.id}-v${i}-1`, note: `${v.name}: 20 children` }));
const senderBatchId = `pool:${pool.id}:close:1`;
const po = await createPayout({ senderBatchId, subject: "Class trip payment", items });
steps.push(`Payout batch ${po.batchId}: ${items.map((i) => `$${(i.cents / 100).toFixed(2)}`).join(" + ")}`);
const result: CloseResult = { state: "CLOSED", poolId: pool.id, closeAttempt: 1, port: "sandbox", plan, members: outs, steps, payout: { batchId: po.batchId, senderBatchId, status: po.status, items }, reconciled: { vendorsDue: items.reduce((a, i) => a + i.cents, 0), netCharged: charged, exact } };
await s.put("close", pool.id, pool.id, { ...result, startedAt: new Date(t0).toISOString(), finishedAt: new Date().toISOString() });
for (const m of saved) await s.put("member", `${pool.id}:${m.id}`, pool.id, { ...m, state: "SETTLED" });
pool.state = "CLOSED";
await s.put("pool", pool.id, pool.id, pool);
await s.put("run", pool.id, pool.id, { poolId: pool.id, at: new Date(t0).toISOString(), port: "sandbox", holdSource: "saved-wallet", state: "CLOSED", decline: false, scenario: "L8", reconciled: result.reconciled, payout: result.payout, n: 20 });
const v = await getPool(pool.id);
mkdirSync("docs/live-runs", { recursive: true });
writeFileSync(`docs/live-runs/${pool.id}.json`, JSON.stringify({ scenario: "L8", ...v, members: v!.members.map(({ token: _t, ...m }) => m), seconds: Math.round((Date.now() - t0) / 1000) }, null, 2));
console.log(pool.id, mode, JSON.stringify(result.reconciled), po.batchId);
