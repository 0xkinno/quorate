/**
 * Counterfactual: a model of outcomes, not a measurement. The same 1,000 generated trips under three
 * ways of paying: the teacher fronts the money, a pot collects the worst-case share up front, and
 * Quorate. Amounts come from the Bursar's own allocate(). Seeded, so the numbers are reproducible.
 * Output: docs/counterfactual.json
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { allocate, totalDue, worstCaseShare } from "../src/bursar/allocate";

let seed = 20261112;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));

type Totals = { teacherFronted: number; teacherUnrecovered: number; refundsIssued: number; refundCents: number; familiesAboveFinalShare: number; familiesChargedForCancelledTrip: number };
const zero = (): Totals => ({ teacherFronted: 0, teacherUnrecovered: 0, refundsIssued: 0, refundCents: 0, familiesAboveFinalShare: 0, familiesChargedForCancelledTrip: 0 });
const out = { teacherFronts: zero(), potUpFront: zero(), quorate: zero() };
let ran = 0, cancelled = 0, invariantFailures = 0;

for (let t = 0; t < 1000; t++) {
  const classSize = int(20, 32), minN = int(14, 20);
  const fixed = int(60_000, 200_000), perHead = int(0, 1_500);
  const joining = int(Math.floor(classSize * 0.4), classSize);
  const cap = worstCaseShare(fixed, perHead, minN);
  const decline = Array.from({ length: joining }, () => rnd() < 0.05);   // card or wallet fails at charge time
  const neverPays = Array.from({ length: joining }, () => rnd() < 0.08); // family that never sends money
  const going = joining - decline.filter(Boolean).length;
  const runs = going >= minN;
  runs ? ran++ : cancelled++;
  const due = totalDue(fixed, perHead, going);

  // 1. Teacher fronts the coach and chases families for the share afterwards.
  out.teacherFronts.teacherFronted += fixed;
  if (runs) {
    const share = Math.ceil(due / going);
    const paid = Array.from({ length: going }, (_, i) => (neverPays[i] ? 0 : share)).reduce((a, b) => a + b, 0);
    out.teacherFronts.teacherUnrecovered += Math.max(0, due - paid);
  } else out.teacherFronts.teacherUnrecovered += fixed; // deposit lost when the trip cancels late

  // 2. A pot collects the worst-case share up front, then refunds the difference.
  const potPaid = going; // the pot collects from families whose payment works
  const potShare = runs ? Math.ceil(due / going) : 0;
  out.potUpFront.familiesChargedForCancelledTrip += runs ? 0 : potPaid;
  out.potUpFront.refundsIssued += runs ? (cap > potShare ? potPaid : 0) : potPaid;
  out.potUpFront.refundCents += runs ? Math.max(0, cap - potShare) * potPaid : cap * potPaid;
  out.potUpFront.familiesAboveFinalShare += runs && cap > potShare ? potPaid : 0;

  // 3. Quorate: holds at the worst-case share, charged only the real share at the close.
  if (runs) {
    const p = allocate(fixed, perHead, Array.from({ length: going }, (_, i) => ({ id: `k${i}`, role: "child" as const, seq: i, capCents: cap })));
    if (!p.ok) { invariantFailures++; continue; }
    const charges = Object.values(p.charges);
    if (charges.reduce((a, b) => a + b, 0) !== due || charges.some((c) => c > cap)) invariantFailures++;
    out.quorate.familiesAboveFinalShare += charges.filter((c) => c > p.level + 1).length;
  }
}

mkdirSync("docs", { recursive: true });
const result = { label: "Model of outcomes over 1,000 generated trips (seeded), not a measurement", seed: 20261112, trips: 1000, ran, cancelled, invariantFailures, ...out };
writeFileSync("docs/counterfactual.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
