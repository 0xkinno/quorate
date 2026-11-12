/**
 * Renewal scheduler. A PayPal authorization is honored for 3 days and valid for 29 days.
 * Reauthorizing restarts the honor period. We renew at most once per hold, timed so the new
 * honor window covers the close.
 */
export const DAY = 24 * 60 * 60 * 1000;
export const HONOR_DAYS = 3;
export const VALID_DAYS = 29;

export type RenewalPlan =
  | { kind: "NONE"; honorUntil: number; validUntil: number }
  | { kind: "SCHEDULED"; honorUntil: number; validUntil: number; renewAt: number }
  | { kind: "CANNOT_REACH_CLOSE"; honorUntil: number; validUntil: number };

export function planRenewal(authorizedAt: number, closeAt: number): RenewalPlan {
  const honorUntil = authorizedAt + HONOR_DAYS * DAY;
  const validUntil = authorizedAt + VALID_DAYS * DAY;
  if (closeAt <= honorUntil) return { kind: "NONE", honorUntil, validUntil };
  if (closeAt > validUntil) return { kind: "CANNOT_REACH_CLOSE", honorUntil, validUntil };
  const renewAt = Math.max(honorUntil, closeAt - HONOR_DAYS * DAY);
  return { kind: "SCHEDULED", honorUntil, validUntil, renewAt };
}

/** When a hold is "guaranteed until": the end of its current honor window. */
export function guaranteedUntil(plan: RenewalPlan, renewedAt?: number) {
  if (renewedAt !== undefined) return Math.min(renewedAt + HONOR_DAYS * DAY, plan.validUntil);
  return plan.honorUntil;
}

/**
 * Hold or Vault. A hold (with one renewal) can reach a close up to 29 days out; Quorate keeps a 3-day
 * margin and switches trips more than 26 days away to the Vault path: the family saves PayPal for this
 * trip, approving the same maximum, and the real share is charged at the close as a merchant-initiated
 * payment, never above the approved amount.
 */
export const VAULT_AFTER_DAYS = 26;
export function holdOrVault(now: number, closeAt: number): "HOLD" | "VAULT" {
  return closeAt - now > VAULT_AFTER_DAYS * DAY ? "VAULT" : "HOLD";
}
