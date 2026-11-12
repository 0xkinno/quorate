/**
 * The Bursar's money rule. Plain code, integer cents, no model imports.
 *
 * Total due T(N) = fixed + perHead * N for N children going.
 * Water-filling: find one price L so that every child pays min(cap, L) (or L + 1 cent for the
 * remainder, in join order) and the charges add up to T(N) exactly. Sponsors are drawn only for
 * the gap left after every child pays their full cap.
 */
export type Role = "child" | "sponsor";
export type Member = { id: string; capCents: number; seq: number; role: Role };

export type Plan =
  | { ok: true; total: number; level: number; charges: Record<string, number>; sponsorDraw: number }
  | { ok: false; reason: "INFEASIBLE"; total: number; shortfallCents: number };

export function totalDue(fixed: number, perHead: number, n: number) {
  return fixed + perHead * n;
}

/** The hold a family approves: the share at the minimum headcount, rounded up to the cent. */
export function worstCaseShare(fixed: number, perHead: number, minN: number) {
  return Math.ceil(totalDue(fixed, perHead, minN) / minN);
}

function assertCents(n: number, what: string) {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error(`BAD_CENTS ${what}=${n}`);
}

export function allocate(fixed: number, perHead: number, members: Member[]): Plan {
  assertCents(fixed, "fixed");
  assertCents(perHead, "perHead");
  for (const m of members) assertCents(m.capCents, `cap:${m.id}`);

  const kids = members.filter((m) => m.role === "child").sort((a, b) => a.seq - b.seq);
  const sponsors = members.filter((m) => m.role === "sponsor").sort((a, b) => a.seq - b.seq);
  const T = totalDue(fixed, perHead, kids.length);
  const capSum = kids.reduce((s, k) => s + k.capCents, 0);
  const sponsorSum = sponsors.reduce((s, k) => s + k.capCents, 0);

  if (kids.length === 0 || capSum + sponsorSum < T) {
    return { ok: false, reason: "INFEASIBLE", total: T, shortfallCents: Math.max(T - capSum - sponsorSum, kids.length === 0 ? T : 0) };
  }

  const charges: Record<string, number> = {};
  for (const s of sponsors) charges[s.id] = 0;

  if (capSum >= T) {
    // Lowest caps pay their cap while they sit below the level; the rest share what remains.
    const byCap = [...kids].sort((a, b) => a.capCents - b.capCents || a.seq - b.seq);
    let remaining = T;
    let left = byCap.length;
    let i = 0;
    while (i < byCap.length && byCap[i].capCents * left < remaining) {
      charges[byCap[i].id] = byCap[i].capCents;
      remaining -= byCap[i].capCents;
      left--;
      i++;
    }
    const rest = byCap.slice(i).sort((a, b) => a.seq - b.seq);
    const level = Math.floor(remaining / left);
    let extra = remaining - level * left;
    for (const k of rest) charges[k.id] = level;
    // Remainder cents in join order, one each, never above a cap.
    for (const k of rest) {
      if (extra === 0) break;
      if (level + 1 <= k.capCents) {
        charges[k.id] = level + 1;
        extra--;
      }
    }
    if (extra !== 0) throw new Error("ALLOCATION_REMAINDER_UNPLACED");
    return { ok: true, total: T, level, charges, sponsorDraw: 0 };
  }

  // Every child pays their cap; sponsors cover only the gap, in join order.
  for (const k of kids) charges[k.id] = k.capCents;
  let gap = T - capSum;
  let sponsorDraw = 0;
  for (const s of sponsors) {
    const d = Math.min(s.capCents, gap);
    charges[s.id] = d;
    gap -= d;
    sponsorDraw += d;
  }
  return { ok: true, total: T, level: Math.max(...kids.map((k) => k.capCents)), charges, sponsorDraw };
}

/** Price per child if the trip ran with these members (for the slip and the register). */
export function priceNow(fixed: number, perHead: number, members: Member[]) {
  const p = allocate(fixed, perHead, members);
  return p.ok ? p.level : null;
}
