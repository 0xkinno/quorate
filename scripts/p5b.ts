/** P5 follow-up: which mock codes authorization capture honours, saved raw. Usage: npx tsx --env-file=.env scripts/p5b.ts */
import { writeFileSync } from "node:fs";
import { createCardHold } from "../src/paypal/cardhold";
import { token } from "../src/paypal/rest";
const t = await token();
const out: Record<string, unknown> = { at: new Date().toISOString() };
for (const code of ["PAYER_CANNOT_PAY", "TRANSACTION_REFUSED", "AUTHORIZATION_EXPIRED", "INSTRUMENT_DECLINED"]) {
  const h = await createCardHold({ memberId: "p5b", poolId: "probe", capCents: 7200, termsHash: "p5b".padEnd(64, "0"), requestId: crypto.randomUUID() });
  const r = await fetch(`https://api-m.sandbox.paypal.com/v2/payments/authorizations/${h.authId}/capture`, { method: "POST", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json", "PayPal-Request-Id": crypto.randomUUID(), "PayPal-Mock-Response": JSON.stringify({ mock_application_codes: code }) }, body: JSON.stringify({ amount: { currency_code: "USD", value: "10.00" }, final_capture: false }) });
  const text = await r.text();
  out[code] = { authId: h.authId, status: r.status, debugId: r.headers.get("paypal-debug-id"), body: text ? JSON.parse(text) : null };
  console.log(code, r.status, r.headers.get("paypal-debug-id"));
}
writeFileSync(`docs/probe/${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}-p5b.json`, JSON.stringify(out, null, 2));
