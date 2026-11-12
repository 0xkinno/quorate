import { describe, expect, it } from "vitest";
import { StandInPayPal } from "../src/paypal/standin";
import { MemoryAttempts, attempt } from "../src/bursar/attempts";
import { cancelClose, hashFor, runClose, type CloseMember, type PoolTerms } from "../src/bursar/close";
import { totalDue } from "../src/bursar/allocate";

const pool: PoolTerms = {
  id: "trip-test", minN: 18, deadline: "2026-11-13T12:00:00Z",
  vendors: [
    { name: "Coach", receiver: "coach@example.test", fixedCents: 144_000, perHeadCents: 0 },
    { name: "Museum", receiver: "museum@example.test", fixedCents: 0, perHeadCents: 800 },
  ],
};

function setup(n: number, caps: Record<number, number> = {}, sponsors: number[] = []) {
  const port = new StandInPayPal();
  const store = new MemoryAttempts();
  const members: CloseMember[] = [];
  for (let i = 0; i < n; i++) {
    const cap = caps[i] ?? 8_800;
    members.push({ id: `k${i}`, label: `Child ${i + 1}`, role: "child", seq: i, capCents: cap, authId: port.authorize(cap), approvedHash: hashFor(pool, cap) });
  }
  sponsors.forEach((cap, j) => members.push({ id: `s${j}`, label: `Sponsor ${j + 1}`, role: "sponsor", seq: 500 + j, capCents: cap, authId: port.authorize(cap), approvedHash: hashFor(pool, cap) }));
  return { port, store, members };
}

function checkMoney(port: StandInPayPal, members: CloseMember[], r: Awaited<ReturnType<typeof runClose>>) {
  for (const m of members) {
    const net = port.netCaptured(m.authId);
    expect(net).toBeLessThanOrEqual(m.capCents);
    expect(net).toBe(r.members.find((o) => o.id === m.id)!.chargedCents);
  }
}

describe("the close", () => {
  it("L1 happy close: 20 holds at $88.00, each charged the real share, vendors paid exactly", async () => {
    const { port, store, members } = setup(20);
    const r = await runClose({ pool, members, port, store, closeAttempt: 1 });
    expect(r.state).toBe("CLOSED");
    expect(r.reconciled).toMatchObject({ vendorsDue: totalDue(144_000, 800, 20), netCharged: totalDue(144_000, 800, 20), exact: true, cashCents: 0 });
    expect(r.members.every((m) => m.status === "SETTLED" && m.chargedCents <= 8_800)).toBe(true);
    expect(r.plan && r.plan.ok && r.plan.level).toBe(8_000);
    expect(r.payout!.items.map((i) => i.cents)).toEqual([144_000, 16_000]);
    checkMoney(port, members, r);
  });

  it("L3 PayPal declines member 7 mid-close: re-share, top-ups, still exact, nobody above cap", async () => {
    const { port, store, members } = setup(20);
    const r = await runClose({ pool, members, port, store, closeAttempt: 1, faults: { k6: "INSTRUMENT_DECLINED" } });
    expect(r.state).toBe("CLOSED");
    expect(r.members.find((m) => m.id === "k6")!.status).toBe("DECLINED");
    expect(r.reconciled!.netCharged).toBe(totalDue(144_000, 800, 19));
    expect(r.reconciled!.exact).toBe(true);
    const topped = r.members.filter((m) => m.captures.length > 1);
    expect(topped.length).toBe(6); // the six captured before the decline get a top-up
    expect(port.netCaptured(members[6].authId)).toBe(0);
    checkMoney(port, members, r);
  });

  it("L4 sponsor pays only the gap", async () => {
    const { port, store, members } = setup(18, { 3: 4_000, 9: 4_000 }, [20_000]);
    const r = await runClose({ pool, members, port, store, closeAttempt: 1 });
    expect(r.state).toBe("CLOSED");
    expect(r.members.find((m) => m.id === "s0")!.chargedCents).toBe(9_600);
    checkMoney(port, members, r);
  });

  it("L2 below the minimum: the teacher decides, nobody is charged", async () => {
    const { port, store, members } = setup(15);
    const r = await runClose({ pool, members, port, store, closeAttempt: 1 });
    expect(r.state).toBe("NEEDS_TEACHER");
    expect(r.options!.find((o) => o.code === "WAIT_FOR_FAMILIES")!.families).toBe(3);
    expect(port.calls.filter((c) => c.op === "capture")).toHaveLength(0);
  });

  it("L5 cancel after partial captures: every capture refunded exactly, every hold released", async () => {
    const { port, store, members } = setup(18);
    const ctx = { pool, members, port, store, closeAttempt: 1, faults: { k10: "INSTRUMENT_DECLINED" as const } };
    const r = await runClose(ctx);
    expect(r.state).toBe("NEEDS_TEACHER");
    expect(r.members.filter((m) => m.captures.length > 0)).toHaveLength(10);
    const c = await cancelClose(ctx, r);
    for (const m of members) expect(port.netCaptured(m.authId)).toBe(0);
    expect(c.members.every((m) => m.status === "RELEASED")).toBe(true);
  });

  it("L6 crash after the 9th capture: restart reconciles, no double capture", async () => {
    const { port, store, members } = setup(20);
    let captures = 0;
    port.crashAfter = (op) => op === "capture" && ++captures === 9;
    await expect(runClose({ pool, members, port, store, closeAttempt: 1 })).rejects.toThrow(/CRASH/);
    port.crashAfter = undefined;
    const r = await runClose({ pool, members, port, store, closeAttempt: 1 });
    expect(r.state).toBe("CLOSED");
    expect(port.caps.size).toBe(20); // one capture per family, the 9th was not repeated
    checkMoney(port, members, r);
  });

  it("holds a family whose approved terms changed for the teacher", async () => {
    const { port, store, members } = setup(20);
    members[2] = { ...members[2], approvedHash: "0".repeat(64) };
    const r = await runClose({ pool, members, port, store, closeAttempt: 1 });
    expect(r.members.find((m) => m.id === "k2")!.verdict).toBe("REVIEW");
    expect(port.netCaptured(members[2].authId)).toBe(0);
    expect(r.reconciled!.exact).toBe(true);
  });

  it("refuses a payload that differs from the logged attempt", async () => {
    const store = new MemoryAttempts();
    const meta = { poolId: "p", memberId: "k0", op: "capture", requestId: "r1" };
    await store.start({ ...meta, id: "r1", payloadHash: "logged", startedAt: "" });
    await expect(attempt(store, { ...meta, payload: { cents: 6_000 } }, async () => 1)).rejects.toThrow(/HELD_FOR_TEACHER/);
  });
});

describe("cash families", () => {
  it("L7 a family who paid cash is counted, and the cash due back is recorded, not captured", async () => {
    const { port, store, members } = setup(20);
    members[19] = { ...members[19], cash: { invoiceId: "INV2-TEST" } };
    const refunds: number[] = [];
    const r = await runClose({ pool, members, port, store, closeAttempt: 1, cashRefund: async (_id, cents) => { refunds.push(cents); return "REF-CASH"; } });
    expect(r.state).toBe("CLOSED");
    expect(refunds).toEqual([800]);
    expect(r.members.find((m) => m.id === "k19")!.chargedCents).toBe(8_000);
    expect(r.reconciled!.exact).toBe(true);
  });
});

describe("red-team fixes", () => {
  it("refuses a hold PayPal shows as already part-captured when our log has no capture for it", async () => {
    const { port, store, members } = setup(20);
    await port.capture({ authId: members[4].authId, cents: 8_000, final: false, requestId: "outside", invoiceId: "x" }); // captured outside Quorate
    const r = await runClose({ pool, members, port, store, closeAttempt: 1 });
    const o = r.members.find((m) => m.id === "k4")!;
    expect(o.verdict).toBe("REVIEW");
    expect(port.netCaptured(members[4].authId)).toBe(8_000); // not captured a second time
    expect(r.reconciled!.exact).toBe(true);
  });

  it("treats only a 422 refusal as a decline; a 503 stops the close for a retry with no family dropped", async () => {
    const { port, store, members } = setup(20);
    const orig = port.capture.bind(port);
    let n = 0;
    port.capture = async (x) => { if (++n === 3) { const { PayPalError } = await import("../src/paypal/types"); throw new PayPalError("capture", 503, "SERVICE_UNAVAILABLE"); } return orig(x); };
    await expect(runClose({ pool, members, port, store, closeAttempt: 1 })).rejects.toThrow(/503/);
    port.capture = orig;
    const r = await runClose({ pool, members, port, store, closeAttempt: 1 });
    expect(r.state).toBe("CLOSED");
    expect(r.members.filter((m) => m.status === "DECLINED")).toHaveLength(0);
    expect(port.caps.size).toBe(20);
  });

  it("pays vendors only what PayPal collected; the office hands over the cash", async () => {
    const { port, store, members } = setup(20);
    members[19] = { ...members[19], cash: { invoiceId: "INV2-TEST" } };
    const r = await runClose({ pool, members, port, store, closeAttempt: 1, cashRefund: async () => "REF", cashVerify: async () => true });
    expect(r.reconciled!.cashCents).toBe(8_000);
    expect(r.reconciled!.payoutCents).toBe(totalDue(144_000, 800, 20) - 8_000);
    expect(r.reconciled!.vendorsDue).toBe(totalDue(144_000, 800, 20));
  });

  it("does not count a cash family whose invoice PayPal does not show as paid", async () => {
    const { port, store, members } = setup(20);
    members[19] = { ...members[19], cash: { invoiceId: "INV2-UNPAID" } };
    const r = await runClose({ pool, members, port, store, closeAttempt: 1, cashVerify: async () => false });
    expect(r.members.find((m) => m.id === "k19")!.verdict).toBe("REVIEW");
    expect(r.reconciled!.exact).toBe(true);
  });
});
