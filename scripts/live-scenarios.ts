/**
 * Live sandbox scenarios beyond the plain close. Each is a real run on the PayPal sandbox, saved to
 * the ledger (so it shows in the register and on its proof page) and to docs/live-runs/<poolId>.json.
 *   L2 below the minimum: nothing captured, every hold voided
 *   L4 two families with low caps, a sponsor charged only the gap
 *   L5 PayPal refuses a capture that drops the trip below the minimum; teacher cancels; refunds exact
 *   L6 the process dies after the 9th capture; restart reconciles, no double capture
 * Usage: npx tsx --env-file=.env scripts/live-scenarios.ts L2 L4 L5 L6
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { db, LedgerAttempts } from "../src/db/store";
import { makePool, recordHold, savePool, getPool, type PoolMember } from "../src/pool/service";
import { cancelClose, hashFor, runClose, type CloseResult } from "../src/bursar/close";
import { createCardHold } from "../src/paypal/cardhold";
import { LivePayPal } from "../src/paypal/live";
import { requestId, type PayPalPort } from "../src/paypal/types";

const s = db();
mkdirSync("docs/live-runs", { recursive: true });

type Spec = { title: string; n: number; caps?: Record<number, number>; sponsors?: number[]; faults?: Record<string, "PAYER_CANNOT_PAY">; crashAfter?: number; cancel?: boolean; voidAllIfShort?: boolean };
const specs: Record<string, Spec> = {
  L2: { title: "Live run, 15 families, below the minimum of 18", n: 15, voidAllIfShort: true },
  L4: { title: "Live run, 18 families, two low caps, a sponsor covers the gap", n: 18, caps: { 3: 4_000, 9: 4_000 }, sponsors: [20_000] },
  L5: { title: "Live run, 18 families, PayPal refuses family 11, teacher cancels", n: 18, faults: { m11: "PAYER_CANNOT_PAY" }, cancel: true },
  L6: { title: "Live run, 20 families, process dies after the 9th capture", n: 20, crashAfter: 9 },
};

class Crashy implements PayPalPort {
  readonly kind = "sandbox" as const;
  captures = 0;
  constructor(private inner: LivePayPal, public crashAt?: number) {}
  getAuthorization(id: string) { return this.inner.getAuthorization(id); }
  async capture(x: Parameters<PayPalPort["capture"]>[0]) {
    const r = await this.inner.capture(x);
    if (this.crashAt && ++this.captures === this.crashAt) throw new Error("CRASH after capture (simulated process death)");
    return r;
  }
  voidAuthorization(x: Parameters<PayPalPort["voidAuthorization"]>[0]) { return this.inner.voidAuthorization(x); }
  refund(x: Parameters<PayPalPort["refund"]>[0]) { return this.inner.refund(x); }
  payout(x: Parameters<PayPalPort["payout"]>[0]) { return this.inner.payout(x); }
  getPayout(id: string) { return this.inner.getPayout(id); }
}

async function run(key: string, spec: Spec) {
  const t0 = Date.now();
  const { pool, members } = makePool("live-run", spec.title, spec.n, "sandbox", "saved-wallet");
  for (const [i, cap] of Object.entries(spec.caps ?? {})) members[Number(i)].capCents = cap;
  (spec.sponsors ?? []).forEach((cap, j) => members.push({ ...members[0], id: `s${j + 1}`, child: `Sponsor ${j + 1} (PTA, demo)`, family: "PTA fund", role: "sponsor", seq: 500 + j, capCents: cap, token: `${members[0].token}s${j}`, state: "INVITED" }));
  if (spec.faults) pool.decline = Object.keys(spec.faults)[0];
  pool.state = "HOLDING";
  await savePool(s, pool, members);
  for (let i = 0; i < members.length; i += 5) {
    await Promise.all(members.slice(i, i + 5).map(async (m, j) => {
      const h = await createCardHold({ memberId: m.id, poolId: pool.id, capCents: m.capCents, termsHash: hashFor(pool, m.capCents), requestId: requestId(pool.id, m.id, "hold") });
      members[i + j] = await recordHold(s, pool, m, { orderId: h.orderId, authId: h.authId, source: "saved-wallet", debugId: h.debugId });
    }));
  }
  pool.state = "CLOSING"; await s.put("pool", pool.id, pool.id, pool);
  const port = new Crashy(new LivePayPal(), spec.crashAfter);
  const ctx = { pool, port, store: new LedgerAttempts(s), closeAttempt: 1, faults: spec.faults,
    members: members.map((m) => ({ id: m.id, label: m.child, role: m.role, seq: m.seq, capCents: m.capCents, authId: m.authId!, approvedHash: m.approvedHash! })) };
  const startedAt = new Date().toISOString();
  let result: CloseResult;
  let crashed = false;
  try { result = await runClose(ctx); }
  catch (e) {
    if (!String((e as Error).message).startsWith("CRASH")) throw e;
    crashed = true;
    port.crashAt = undefined;
    result = await runClose(ctx); // restart: the attempt log replays finished calls and resends the unfinished one
    result.steps.unshift("Process died after the 9th capture; restarted with the same attempt log");
  }
  if (result.state === "NEEDS_TEACHER" && (spec.cancel || spec.voidAllIfShort)) {
    result = await cancelClose(ctx, result);
    if (spec.voidAllIfShort) result.steps.push("Below the minimum: every hold voided, nobody charged");
  }
  await s.put("close", pool.id, pool.id, { ...result, startedAt, finishedAt: new Date().toISOString() });
  for (const o of result.members) {
    const m = members.find((x) => x.id === o.id)! as PoolMember;
    await s.put("member", `${pool.id}:${m.id}`, pool.id, { ...m, state: o.status === "EXPIRED" ? "RELEASED" : o.status });
  }
  pool.state = result.state === "CLOSED" ? "CLOSED" : spec.voidAllIfShort ? "LAPSED" : "NEEDS_TEACHER";
  if (spec.cancel) pool.note = "Teacher cancelled after PayPal refused a capture: every capture refunded, every hold released.";
  await s.put("pool", pool.id, pool.id, pool);
  await s.put("run", pool.id, pool.id, { poolId: pool.id, at: startedAt, port: "sandbox", holdSource: "saved-wallet", state: result.state, decline: Boolean(spec.faults), scenario: key, crashed, reconciled: result.reconciled, payout: result.payout, n: members.length });
  const v = await getPool(pool.id);
  writeFileSync(`docs/live-runs/${pool.id}.json`, JSON.stringify({ scenario: key, ...v, members: v!.members.map(({ token: _t, ...m }) => m), seconds: Math.round((Date.now() - t0) / 1000) }, null, 2));
  const caps = (port as Crashy).captures;
  console.log(key, pool.id, pool.state, JSON.stringify(result.reconciled ?? null), `captures-seen=${caps}`, `${Math.round((Date.now() - t0) / 1000)}s`);
  console.log("  " + result.steps.slice(-4).join("\n  "));
}

for (const k of process.argv.slice(2)) {
  try { await run(k, specs[k]); } catch (e) { console.log(k, "FAILED", (e as Error).message); }
}
