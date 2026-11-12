import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { allocate, totalDue, worstCaseShare, type Member } from "../src/bursar/allocate";

const RUNS = 10_000;
const kid = (i: number, cap: number): Member => ({ id: `k${i}`, capCents: cap, seq: i, role: "child" });
const spon = (i: number, cap: number): Member => ({ id: `s${i}`, capCents: cap, seq: 1000 + i, role: "sponsor" });

const tripArb = fc.record({
  fixed: fc.integer({ min: 0, max: 300_000 }),
  perHead: fc.integer({ min: 0, max: 5_000 }),
  caps: fc.array(fc.integer({ min: 0, max: 20_000 }), { minLength: 1, maxLength: 40 }),
  sponsors: fc.array(fc.integer({ min: 0, max: 100_000 }), { maxLength: 3 }),
});
const build = (caps: number[], sponsors: number[]) => [...caps.map((c, i) => kid(i, c)), ...sponsors.map((c, i) => spon(i, c))];

describe("the demo trip", () => {
  it("coach $1,440 + museum $8 per child, minimum 18: hold is $88.00 and 26 children pay $63.38 or $63.39", () => {
    expect(worstCaseShare(144_000, 800, 18)).toBe(8_800);
    const p = allocate(144_000, 800, Array.from({ length: 26 }, (_, i) => kid(i, 8_800)));
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(p.total).toBe(164_800);
    expect(new Set(Object.values(p.charges))).toEqual(new Set([6_338, 6_339]));
    expect(Object.values(p.charges).filter((c) => c === 6_339)).toHaveLength(12);
  });
});

describe("allocation properties (10,000 cases each)", () => {
  it("1. charges sum to the total due exactly", () => {
    fc.assert(fc.property(tripArb, ({ fixed, perHead, caps, sponsors }) => {
      const p = allocate(fixed, perHead, build(caps, sponsors));
      if (!p.ok) return true;
      return Object.values(p.charges).reduce((s, c) => s + c, 0) === totalDue(fixed, perHead, caps.length);
    }), { numRuns: RUNS });
  });

  it("2. no member is ever charged above their approved cap", () => {
    fc.assert(fc.property(tripArb, ({ fixed, perHead, caps, sponsors }) => {
      const ms = build(caps, sponsors);
      const p = allocate(fixed, perHead, ms);
      if (!p.ok) return true;
      return ms.every((m) => p.charges[m.id] >= 0 && p.charges[m.id] <= m.capCents);
    }), { numRuns: RUNS });
  });

  it("3. children whose cap is at least the level pay the level or the level plus one cent", () => {
    fc.assert(fc.property(tripArb, ({ fixed, perHead, caps }) => {
      const p = allocate(fixed, perHead, build(caps, []));
      if (!p.ok) return true;
      return caps.every((c, i) => c < p.level || p.charges[`k${i}`] === p.level || p.charges[`k${i}`] === p.level + 1);
    }), { numRuns: RUNS });
  });

  it("4. adding a child never raises an existing family's charge when the per-child cost is below the level", () => {
    fc.assert(fc.property(tripArb, ({ fixed, perHead, caps }) => {
      const before = allocate(fixed, perHead, build(caps, []));
      if (!before.ok || perHead >= before.level) return true;
      const newcomer = kid(caps.length, before.level + 1);
      const after = allocate(fixed, perHead, [...build(caps, []), newcomer]);
      if (!after.ok || newcomer.capCents < after.level) return true;
      return caps.every((_, i) => after.charges[`k${i}`] <= before.charges[`k${i}`]);
    }), { numRuns: RUNS });
  });

  it("5. sponsors pay nothing when the children's caps cover the total", () => {
    fc.assert(fc.property(tripArb, ({ fixed, perHead, caps, sponsors }) => {
      const capSum = caps.reduce((s, c) => s + c, 0);
      if (capSum < totalDue(fixed, perHead, caps.length)) return true;
      const p = allocate(fixed, perHead, build(caps, sponsors));
      return p.ok && p.sponsorDraw === 0 && sponsors.every((_, i) => p.charges[`s${i}`] === 0);
    }), { numRuns: RUNS });
  });

  it("6. infeasible inputs return INFEASIBLE with the exact shortfall, never a partial plan", () => {
    fc.assert(fc.property(tripArb, ({ fixed, perHead, caps, sponsors }) => {
      const T = totalDue(fixed, perHead, caps.length);
      const have = caps.reduce((s, c) => s + c, 0) + sponsors.reduce((s, c) => s + c, 0);
      const p = allocate(fixed, perHead, build(caps, sponsors));
      if (have >= T) return p.ok;
      return !p.ok && p.reason === "INFEASIBLE" && p.shortfallCents === T - have && !("charges" in p);
    }), { numRuns: RUNS });
  });

  it("refuses fractional cents", () => {
    expect(() => allocate(100.5, 0, [kid(0, 200)])).toThrow(/BAD_CENTS/);
  });
});
