import { call } from "./rest";
import { toAmount, toCents } from "./types";

/**
 * Scripted holds for live runs. A sandbox buyer approved saving their PayPal wallet once
 * (scripts/vault-setup.ts, Vault v3 merchant usage); each hold is then an AUTHORIZE order paid from
 * that saved wallet (payment_source.paypal.vault_id), so twenty holds need one approval, not twenty.
 * Labelled "saved sandbox wallet" in every run record. Falls back to a sandbox test card when no
 * vault id is set. The family slip uses PayPal login approval (src/paypal/live.ts).
 */
export const SANDBOX_TEST_CARD = { number: "4111111111111111", expiry: "2030-12", security_code: "123", name: "Demo Family" };
export const holdMethod = () => (process.env.PAYPAL_VAULT_ID ? "saved-wallet" : "sandbox-card");

type OrderResp = {
  id: string; status: string;
  purchase_units: { payments?: { authorizations?: { id: string; status: string; expiration_time: string; amount: { value: string } }[] } }[];
};

export async function createCardHold(a: { memberId: string; poolId: string; capCents: number; termsHash: string; requestId: string }) {
  const vault = process.env.PAYPAL_VAULT_ID;
  const r = await call<OrderResp>("createHold", "POST", "/v2/checkout/orders", {
    intent: "AUTHORIZE",
    purchase_units: [{
      reference_id: a.memberId, custom_id: a.termsHash.slice(0, 64), invoice_id: `${a.poolId}-${a.memberId}-${a.requestId.slice(0, 8)}`,
      description: "Class trip share (held, not charged)", amount: { currency_code: "USD", value: toAmount(a.capCents) },
    }],
    payment_source: vault ? { paypal: { vault_id: vault } } : { card: SANDBOX_TEST_CARD },
  }, { "PayPal-Request-Id": a.requestId, Prefer: "return=representation" });
  let auth = r.json.purchase_units?.[0]?.payments?.authorizations?.[0];
  if (!auth && r.json.status === "APPROVED") {
    const a2 = await call<OrderResp>("authorizeOrder", "POST", `/v2/checkout/orders/${r.json.id}/authorize`, undefined, { "PayPal-Request-Id": `${a.requestId}-auth`, Prefer: "return=representation" });
    auth = a2.json.purchase_units?.[0]?.payments?.authorizations?.[0];
  }
  if (!auth) throw new Error(`NO_AUTHORIZATION order=${r.json.id} status=${r.json.status}`);
  return { orderId: r.json.id, authId: auth.id, status: auth.status, expiresAt: auth.expiration_time, amountCents: toCents(auth.amount.value), debugId: r.debugId };
}
