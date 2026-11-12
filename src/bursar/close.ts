import { allocate, worstCaseShare, type Member, type Plan } from "./allocate";
import { assertTermsUnchanged, assertWithinCap, termsHash, type Terms } from "./guards";
import { attempt, type AttemptStore } from "./attempts";
import { PayPalError, requestId, toAmount, type MockCode, type PayPalPort, type PayoutItem } from "../paypal/types";

/**
 * The close. Plain code. Every PayPal call runs under the attempt log with a request id derived
 * from pool, member, operation and close attempt, so a restart never captures twice.
 *
 * 1 freeze and read back every hold   2 allocate   3 capture each share (final_capture false)
 * 4 a declined capture drops that family and re-shares; families already captured are topped up
 *   from the same hold, never above their approved amount
 * 5 release: void each remainder (refund first if a share fell)   6 one Payouts batch to the vendors
 */
export type Vendor = { name: string; receiver: string; fixedCents: number; perHeadCents: number };
export type PoolTerms = { id: string; minN: number; deadline: string; vendors: Vendor[] };
export type CloseMember = Member & { label: string; authId: string; approvedHash: string };

export type Verdict = "OBSERVED" | "REVIEW" | "NOT OBSERVED";
export type MemberOut = {
  id: string; label: string; role: Member["role"]; capCents: number;
  status: "SETTLED" | "RELEASED" | "DECLINED" | "EXPIRED" | "REVIEW" | "CAPTURED_PART";
  verdict: Verdict; chargedCents: number; releasedCents: number;
  captures: { captureId: string; cents: number }[]; refunds: { refundId: string; cents: number }[]; note?: string;
};
export type Option = { code: "SPONSOR_GAP" | "WAIT_FOR_FAMILIES" | "CANCEL"; text: string; cents?: number; families?: number };
export type CloseResult = {
  state: "CLOSED" | "NEEDS_TEACHER";
  poolId: string; closeAttempt: number; port: PayPalPort["kind"];
  plan: Plan | null; members: MemberOut[]; steps: string[];
  payout?: { batchId: string; senderBatchId: string; status: string; items: PayoutItem[] };
  options?: Option[]; reconciled?: { vendorsDue: number; netCharged: number; exact: boolean };
};

export const poolFixed = (p: PoolTerms) => p.vendors.reduce((s, v) => s + v.fixedCents, 0);
export const poolPerHead = (p: PoolTerms) => p.vendors.reduce((s, v) => s + v.perHeadCents, 0);
export function memberTerms(p: PoolTerms, capCents: number): Terms {
  return { poolId: p.id, capCents, fixedCents: poolFixed(p), perHeadCents: poolPerHead(p), minN: p.minN, deadline: p.deadline,
    vendors: p.vendors.map((v) => ({ name: v.name, receiver: v.receiver })) };
}
export const hashFor = (p: PoolTerms, capCents: number) => termsHash(memberTerms(p, capCents));

type Ctx = {
  pool: PoolTerms; members: CloseMember[]; port: PayPalPort; store: AttemptStore; closeAttempt: number;
  /** Sandbox negative testing: make PayPal decline this member's capture. */
  faults?: Record<string, MockCode>;
};

const usd = (c: number) => `$${toAmount(c)}`;

export async function runClose(ctx: Ctx): Promise<CloseResult> {
  const { pool, port, store, closeAttempt } = ctx;
  const fixed = poolFixed(pool), perHead = poolPerHead(pool);
  const steps: string[] = [];
  const out = new Map<string, MemberOut>();
  const counter = new Map<string, number>();
  const rid = (m: string, op: string) => {
    const n = (counter.get(`${m}:${op}`) ?? 0) + 1; counter.set(`${m}:${op}`, n);
    return requestId(pool.id, m, op, closeAttempt, n);
  };

  // 1. Freeze and read back.
  const active: (CloseMember & { capEff: number; captured: number })[] = [];
  for (const m of [...ctx.members].sort((a, b) => a.seq - b.seq)) {
    const o: MemberOut = { id: m.id, label: m.label, role: m.role, capCents: m.capCents, status: "REVIEW", verdict: "NOT OBSERVED", chargedCents: 0, releasedCents: 0, captures: [], refunds: [] };
    out.set(m.id, o);
    try { assertTermsUnchanged(m.approvedHash, memberTerms(pool, m.capCents)); }
    catch (e) { o.status = "REVIEW"; o.verdict = "REVIEW"; o.note = (e as Error).message; steps.push(`${m.label}: terms changed since approval, held for the teacher`); continue; }
    try {
      const a = await port.getAuthorization(m.authId);
      o.verdict = "OBSERVED";
      if (a.status !== "CREATED" && a.status !== "PARTIALLY_CAPTURED") { o.status = a.status === "EXPIRED" ? "EXPIRED" : "RELEASED"; o.note = `hold ${a.status}`; steps.push(`${m.label}: hold ${a.status}, drops out`); continue; }
      if (a.amountCents < m.capCents) { o.status = "REVIEW"; o.verdict = "REVIEW"; o.note = "hold smaller than approved amount"; continue; }
    } catch { o.verdict = "NOT OBSERVED"; o.note = "PayPal returned nothing for this hold yet"; continue; }
    active.push({ ...m, capEff: m.capCents, captured: 0 });
  }
  steps.push(`Read back ${active.length} holds`);

  const kidsActive = () => active.filter((m) => m.role === "child").length;
  const plan = () => allocate(fixed, perHead, active.map((m) => ({ id: m.id, role: m.role, seq: m.seq, capCents: m.capEff })));
  const teacher = (p: Plan | null, why: string): CloseResult => {
    steps.push(`Needs the teacher: ${why}`);
    for (const m of active) { const o = out.get(m.id)!; o.chargedCents = m.captured; if (m.captured > 0) o.status = "CAPTURED_PART"; }
    return { state: "NEEDS_TEACHER", poolId: pool.id, closeAttempt, port: port.kind, plan: p, members: [...out.values()], steps, options: options(pool, active, p) };
  };

  if (kidsActive() < pool.minN) return teacher(null, `${kidsActive()} children held, ${pool.minN} needed`);
  let p = plan();
  if (!p.ok) return teacher(p, `short by ${usd(p.shortfallCents)}`);
  steps.push(`Share per child ${usd(p.level)} for ${kidsActive()} children, total ${usd(p.total)}`);

  // 2 to 4. Capture until every share is taken or the plan cannot be met.
  for (let pass = 0; pass < 20; pass++) {
    let changed = false;
    for (const m of [...active]) {
      if (!p.ok) break;
      const target = p.charges[m.id] ?? 0;
      const delta = target - m.captured;
      if (delta <= 0) continue;
      assertWithinCap(m.capCents, m.captured, delta);
      const o = out.get(m.id)!;
      const reqId = rid(m.id, "capture");
      try {
        const c = await attempt(store, { poolId: pool.id, memberId: m.id, op: "capture", requestId: reqId, payload: { authId: m.authId, cents: delta, final: false } },
          () => port.capture({ authId: m.authId, cents: delta, final: false, requestId: reqId, invoiceId: `${pool.id}-${m.id}-${closeAttempt}-${o.captures.length + 1}`, mock: ctx.faults?.[m.id] }));
        m.captured += c.cents; o.captures.push({ captureId: c.captureId, cents: c.cents });
        steps.push(`${m.label}: captured ${usd(c.cents)}${o.captures.length > 1 ? " (top-up)" : ""}`);
      } catch (e) {
        if (!(e instanceof PayPalError) && !String((e as Error).message).match(/^(capture|INSTRUMENT|AUTHORIZATION|PAYER|MAX)/)) throw e;
        const msg = (e as Error).message;
        if (m.captured === 0) {
          active.splice(active.indexOf(m), 1);
          o.status = "DECLINED"; o.note = msg;
          steps.push(`${m.label}: PayPal declined the capture (${msg.split(" ").slice(0, 3).join(" ")}); re-sharing among ${kidsActive()} children`);
        } else {
          m.capEff = m.captured; o.note = msg;
          steps.push(`${m.label}: top-up declined; keeps ${usd(m.captured)}, others re-share`);
        }
        changed = true;
        if (kidsActive() < pool.minN) return teacher(null, `${kidsActive()} children after a decline, ${pool.minN} needed`);
        p = plan();
        if (!p.ok) return teacher(p, `short by ${usd(p.shortfallCents)} after a decline`);
        steps.push(`New share per child ${usd(p.level)}, total ${usd(p.total)}`);
      }
    }
    if (!changed) break;
  }
  if (!p.ok) return teacher(p, "plan not met");

  // 5. Release: refund if a share fell below what was taken, then void every remainder.
  for (const m of active) {
    const o = out.get(m.id)!;
    const target = p.charges[m.id] ?? 0;
    let over = m.captured - target;
    for (let i = o.captures.length - 1; i >= 0 && over > 0; i--) {
      const take = Math.min(over, o.captures[i].cents);
      const reqId = rid(m.id, "refund");
      const r = await attempt(store, { poolId: pool.id, memberId: m.id, op: "refund", requestId: reqId, payload: { captureId: o.captures[i].captureId, cents: take } },
        () => port.refund({ captureId: o.captures[i].captureId, cents: take, requestId: reqId }));
      o.refunds.push({ refundId: r.refundId, cents: take }); m.captured -= take; over -= take;
      steps.push(`${m.label}: refunded ${usd(take)} (share fell)`);
    }
    if (m.captured < m.capCents) {
      const reqId = rid(m.id, "void");
      try {
        await attempt(store, { poolId: pool.id, memberId: m.id, op: "void", requestId: reqId, payload: { authId: m.authId } },
          () => port.voidAuthorization({ authId: m.authId, requestId: reqId }));
      } catch (e) { o.verdict = "REVIEW"; o.note = `void not confirmed: ${(e as Error).message}`; }
    }
    o.chargedCents = m.captured; o.releasedCents = m.capCents - m.captured;
    o.status = m.captured > 0 ? "SETTLED" : "RELEASED";
  }
  for (const o of out.values()) {
    if (o.status !== "DECLINED") continue;
    const m = ctx.members.find((x) => x.id === o.id)!;
    const reqId = rid(m.id, "void");
    try { await attempt(store, { poolId: pool.id, memberId: m.id, op: "void", requestId: reqId, payload: { authId: m.authId } }, () => port.voidAuthorization({ authId: m.authId, requestId: reqId })); } catch { /* the declined hold may already be closed */ }
    o.releasedCents = o.capCents;
  }
  const netCharged = active.reduce((s, m) => s + m.captured, 0);
  const exact = netCharged === p.total;
  steps.push(`Charged ${usd(netCharged)} against ${usd(p.total)} due: ${exact ? "exact" : "MISMATCH"}`);
  if (!exact) throw new Error(`RECONCILE_MISMATCH charged=${netCharged} due=${p.total}`);

  // 6. Pay the vendors in one batch.
  const n = kidsActive();
  const items: PayoutItem[] = pool.vendors.map((v, i) => ({ receiver: v.receiver, cents: v.fixedCents + v.perHeadCents * n, senderItemId: `${pool.id}-v${i}-${closeAttempt}`, note: `${v.name}: ${n} children` }));
  const senderBatchId = `pool:${pool.id}:close:${closeAttempt}`;
  const po = await attempt(store, { poolId: pool.id, memberId: null, op: "payout", requestId: senderBatchId, payload: items },
    () => port.payout({ senderBatchId, subject: "Class trip payment", items }));
  steps.push(`Payout batch ${po.batchId}: ${items.map((i) => `${usd(i.cents)}`).join(" + ")}`);

  return { state: "CLOSED", poolId: pool.id, closeAttempt, port: port.kind, plan: p, members: [...out.values()], steps,
    payout: { batchId: po.batchId, senderBatchId, status: po.status, items }, reconciled: { vendorsDue: items.reduce((s, i) => s + i.cents, 0), netCharged, exact } };
}

/** Teacher chose cancel after partial captures: refund each capture exactly, void every remainder. */
export async function cancelClose(ctx: Ctx, prior: CloseResult): Promise<CloseResult> {
  const steps = [...prior.steps, "Teacher cancelled the trip"];
  const members: MemberOut[] = [];
  for (const o of prior.members) {
    const m = ctx.members.find((x) => x.id === o.id)!;
    const copy: MemberOut = { ...o, refunds: [...o.refunds] };
    for (const c of o.captures) {
      const reqId = requestId(ctx.pool.id, m.id, "cancel-refund", ctx.closeAttempt, c.captureId);
      const r = await attempt(ctx.store, { poolId: ctx.pool.id, memberId: m.id, op: "refund", requestId: reqId, payload: { captureId: c.captureId, cents: c.cents } },
        () => ctx.port.refund({ captureId: c.captureId, cents: c.cents, requestId: reqId }));
      copy.refunds.push({ refundId: r.refundId, cents: c.cents });
      steps.push(`${o.label}: refunded ${usd(c.cents)}`);
    }
    if (o.status === "CAPTURED_PART" || o.status === "REVIEW" || o.captures.length === 0) {
      const reqId = requestId(ctx.pool.id, m.id, "cancel-void", ctx.closeAttempt);
      try { await attempt(ctx.store, { poolId: ctx.pool.id, memberId: m.id, op: "void", requestId: reqId, payload: { authId: m.authId } }, () => ctx.port.voidAuthorization({ authId: m.authId, requestId: reqId })); } catch { /* already closed */ }
    }
    copy.chargedCents = 0; copy.releasedCents = o.capCents; copy.status = "RELEASED";
    members.push(copy);
  }
  return { ...prior, state: "NEEDS_TEACHER", members, steps, options: [{ code: "CANCEL", text: "Cancelled. Every family refunded and released." }] };
}

function options(pool: PoolTerms, active: { role: Member["role"]; capEff: number; seq: number; id: string }[], p: Plan | null): Option[] {
  const fixed = poolFixed(pool), perHead = poolPerHead(pool);
  const share = worstCaseShare(fixed, perHead, pool.minN);
  const opts: Option[] = [];
  if (p && !p.ok) opts.push({ code: "SPONSOR_GAP", cents: p.shortfallCents, text: `A sponsor covers ${usd(p.shortfallCents)}` });
  const base = active.map((m) => ({ id: m.id, role: m.role, seq: m.seq, capCents: m.capEff }));
  for (let k = 1; k <= 30; k++) {
    const extra = Array.from({ length: k }, (_, i) => ({ id: `new${i}`, role: "child" as const, seq: 1e6 + i, capCents: share }));
    const kids = base.filter((m) => m.role === "child").length + k;
    if (kids >= pool.minN && allocate(fixed, perHead, [...base, ...extra]).ok) {
      opts.push({ code: "WAIT_FOR_FAMILIES", families: k, text: `Wait for ${k} more ${k === 1 ? "family" : "families"} at ${usd(share)}` });
      break;
    }
  }
  opts.push({ code: "CANCEL", text: "Cancel: refund every capture and release every hold" });
  return opts;
}
