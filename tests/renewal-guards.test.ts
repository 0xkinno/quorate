import { describe, expect, it } from "vitest";
import { DAY, planRenewal } from "../src/bursar/renewal";
import { assertTermsUnchanged, assertWithinCap, termsHash, type Terms } from "../src/bursar/guards";

const t0 = Date.UTC(2026, 10, 12, 14, 10);

describe("renewal scheduler", () => {
  it("no renewal when the close falls inside the 3-day honor period", () => {
    expect(planRenewal(t0, t0 + 2 * DAY).kind).toBe("NONE");
  });
  it("renews so the new honor window covers the close", () => {
    const p = planRenewal(t0, t0 + 10 * DAY);
    expect(p.kind).toBe("SCHEDULED");
    if (p.kind !== "SCHEDULED") return;
    expect(p.renewAt).toBe(t0 + 7 * DAY);
    expect(p.renewAt + 3 * DAY).toBeGreaterThanOrEqual(t0 + 10 * DAY);
  });
  it("never renews before the honor period ends", () => {
    const p = planRenewal(t0, t0 + 4 * DAY);
    expect(p.kind === "SCHEDULED" && p.renewAt).toBe(t0 + 3 * DAY);
  });
  it("flags a close beyond the 29-day validity", () => {
    expect(planRenewal(t0, t0 + 30 * DAY).kind).toBe("CANNOT_REACH_CLOSE");
  });
});

describe("guards", () => {
  it("refuses a capture above the approved amount even though PayPal allows up to 115%", () => {
    expect(() => assertWithinCap(7_200, 0, 8_000)).toThrow(/REFUSED_OVER_CAP/);
    expect(() => assertWithinCap(7_200, 6_000, 1_201)).toThrow(/REFUSED_OVER_CAP/);
    expect(() => assertWithinCap(7_200, 6_000, 1_200)).not.toThrow();
    expect(() => assertWithinCap(7_200, 0, 0)).toThrow();
  });
  it("refuses a close when the terms a family approved have changed", () => {
    const t: Terms = { poolId: "p1", capCents: 8_800, fixedCents: 144_000, perHeadCents: 800, minN: 18, deadline: "2026-11-13T12:00:00Z", vendors: [{ name: "Coach", receiver: "c@x" }] };
    const h = termsHash(t);
    expect(h).toHaveLength(64);
    expect(() => assertTermsUnchanged(h, t)).not.toThrow();
    expect(() => assertTermsUnchanged(h, { ...t, fixedCents: 150_000 })).toThrow(/REFUSED_TERMS_CHANGED/);
  });
});

import { holdOrVault } from "../src/bursar/renewal";
describe("hold or vault", () => {
  it("uses a hold up to 26 days out and the Vault path beyond", () => {
    expect(holdOrVault(t0, t0 + 26 * DAY)).toBe("HOLD");
    expect(holdOrVault(t0, t0 + 26 * DAY + 1)).toBe("VAULT");
    expect(holdOrVault(t0, t0 + 40 * DAY)).toBe("VAULT");
  });
});
