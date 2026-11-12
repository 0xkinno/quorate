import { call } from "./rest";
import { toAmount, toCents } from "./types";

/**
 * Sandbox-only hold creation for scripted live closes: an AUTHORIZE order paid with one of
 * PayPal's published sandbox test cards, so twenty holds can be created without twenty logins.
 * Labelled "card hold (sandbox test card)" in every run record. The family slip uses PayPal login
 * approval instead (src/paypal/live.ts createAuthorizeOrder + authorizeOrder).
 */
export const SANDBOX_TEST_CARD = { number: "4111111111111111", expiry: "2030-12", security_code: "123", name: "Demo Family" };

type OrderResp = {
  id: string; status: string;
  purchase_units: { payments?: { authorizations?: { id: string; status: string; expiration_time: string; amount: { value: string } }[] } }[];
};

export async function createCardHold(a: { memberId: string; poolId: string; capCents: number; termsHash: string; requestId: string; card?: typeof SANDBOX_TEST_CARD }) {
  const r = await call<OrderResp>("createCardHold", "POST", "/v2/checkout/orders", {
    intent: "AUTHORIZE",
    purchase_units: [{
      reference_id: a.memberId, custom_id: a.termsHash.slice(0, 64), invoice_id: `${a.poolId}-${a.memberId}-${a.requestId.slice(0, 8)}`,
      description: "Class trip share (held, not charged)", amount: { currency_code: "USD", value: toAmount(a.capCents) },
    }],
    payment_source: { card: a.card ?? SANDBOX_TEST_CARD },
  }, { "PayPal-Request-Id": a.requestId, Prefer: "return=representation" });
  const auth = r.json.purchase_units?.[0]?.payments?.authorizations?.[0];
  if (!auth) throw new Error(`NO_AUTHORIZATION order=${r.json.id} status=${r.json.status}`);
  return { orderId: r.json.id, authId: auth.id, status: auth.status, expiresAt: auth.expiration_time, amountCents: toCents(auth.amount.value), debugId: r.debugId };
}
