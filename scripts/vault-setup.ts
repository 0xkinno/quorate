/**
 * One-time: the sandbox buyer approves saving their PayPal wallet (Vault v3 setup token, merchant
 * usage). Scripted live runs then place each hold from that saved wallet (AUTHORIZE order with
 * payment_source.paypal.vault_id), so twenty holds need one human approval, not twenty.
 * Usage:  npx tsx --env-file=.env scripts/vault-setup.ts start
 *         npx tsx --env-file=.env scripts/vault-setup.ts finish <setupTokenId>
 */
import { call } from "../src/paypal/rest";

const [cmd, id] = process.argv.slice(2);
if (cmd === "start") {
  const base = process.env.PUBLIC_BASE_URL || "http://localhost:3000";
  const r = await call<{ id: string; status: string; links: { rel: string; href: string }[] }>("setupToken", "POST", "/v3/vault/setup-tokens", {
    payment_source: { paypal: { description: "Quorate class trip holds", usage_pattern: "UNSCHEDULED_POSTPAID", usage_type: "MERCHANT", customer_type: "CONSUMER", permit_multiple_payment_tokens: true, experience_context: { brand_name: "Quorate", return_url: `${base}/judge`, cancel_url: `${base}/judge`, shipping_preference: "NO_SHIPPING", vault_instruction: "ON_PAYER_APPROVAL" } } },
  }, { "PayPal-Request-Id": crypto.randomUUID() });
  console.log(JSON.stringify({ setupTokenId: r.json.id, status: r.json.status, approve: r.json.links.find((l) => l.rel === "approve")?.href }));
} else if (cmd === "status") {
  const r = await call<{ status: string }>("setupToken", "GET", `/v3/vault/setup-tokens/${id}`);
  console.log(r.json.status);
} else if (cmd === "finish") {
  const r = await call<{ id: string; customer?: { id: string } }>("paymentToken", "POST", "/v3/vault/payment-tokens", { payment_source: { token: { id, type: "SETUP_TOKEN" } } }, { "PayPal-Request-Id": crypto.randomUUID() });
  console.log(JSON.stringify({ vaultId: r.json.id, customer: r.json.customer?.id }));
}
