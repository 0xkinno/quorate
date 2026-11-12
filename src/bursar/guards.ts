import { sha256 } from "../paypal/types";

/** Refuses any capture that would take a family above the amount they saw and approved. */
export function assertWithinCap(approvedCents: number, alreadyCaptured: number, nextCents: number) {
  if (!Number.isSafeInteger(nextCents) || nextCents <= 0 || alreadyCaptured + nextCents > approvedCents)
    throw new Error(`REFUSED_OVER_CAP approved=${approvedCents} captured=${alreadyCaptured} next=${nextCents}`);
}

export type Terms = {
  poolId: string;
  capCents: number;
  fixedCents: number;
  perHeadCents: number;
  minN: number;
  deadline: string;
  vendors: { name: string; receiver: string }[];
};

/** The slip a family approved, hashed. Stored in the order's custom_id (64 chars). */
export function termsHash(t: Terms) {
  const canon = JSON.stringify([t.poolId, t.capCents, t.fixedCents, t.perHeadCents, t.minN, t.deadline,
    t.vendors.map((v) => [v.name, v.receiver])]);
  return sha256(canon);
}

export function assertTermsUnchanged(approvedHash: string, current: Terms) {
  const now = termsHash(current);
  if (approvedHash !== now) throw new Error(`REFUSED_TERMS_CHANGED approved=${approvedHash.slice(0, 12)} now=${now.slice(0, 12)}`);
}
