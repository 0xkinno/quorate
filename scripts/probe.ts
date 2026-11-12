/**
 * Platform probe P1 to P9 against the PayPal sandbox. Questions were registered in FINDINGS.md
 * before this ran. Raw responses go to docs/probe/<date>-<question>.json.
 * Usage: npx tsx --env-file=.env scripts/probe.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createCardHold } from "../src/paypal/cardhold";
import { readFileSync } from "node:fs";
import { call } from "../src/paypal/rest";
import { mockHeader, type MockCode } from "../src/paypal/types";

mkdirSync("docs/probe", { recursive: true });
const day = new Date().toISOString().slice(0, 10);
const results: Record<string, unknown> = {};

async function step(name: string, fn: () => Promise<unknown>) {
  try { const v = await fn(); return { ok: true, value: v }; }
  catch (e) { const err = e as { status?: number; issue?: string; debugId?: string; message: string }; return { ok: false, status: err.status, issue: err.issue, debugId: err.debugId, message: err.message }; }
}
const hold = (cents: number) => createCardHold({ memberId: "probe", poolId: "probe", capCents: cents, termsHash: "probe".padEnd(64, "0"), requestId: randomUUID() });
const capture = (authId: string, value: string, final: boolean, headers: Record<string, string> = {}, rid = randomUUID()) =>
  call<{ id: string; status: string }>("capture", "POST", `/v2/payments/authorizations/${authId}/capture`, { amount: { currency_code: "USD", value }, final_capture: final }, { "PayPal-Request-Id": rid, ...headers }).then((r) => ({ ...r.json, debugId: r.debugId }));
const getAuth = (authId: string) => call<Record<string, unknown>>("getAuth", "GET", `/v2/payments/authorizations/${authId}`).then((r) => r.json);
const voidAuth = (authId: string, headers: Record<string, string> = {}) => call("void", "POST", `/v2/payments/authorizations/${authId}/void`, undefined, { "PayPal-Request-Id": randomUUID(), ...headers }).then((r) => ({ status: r.status, debugId: r.debugId }));
const reauth = (authId: string, headers: Record<string, string> = {}) => call("reauth", "POST", `/v2/payments/authorizations/${authId}/reauthorize`, { amount: { currency_code: "USD", value: "72.00" } }, { "PayPal-Request-Id": randomUUID(), ...headers }).then((r) => ({ ...(r.json as object), debugId: r.debugId }));

// P9 + P1
const a1 = await hold(7200);
results.P9 = { created: new Date().toISOString(), authorization: await getAuth(a1.authId) };
results.P1 = { first: await step("cap60", () => capture(a1.authId, "60.00", false)), second: await step("cap5", () => capture(a1.authId, "5.00", false)), after: await getAuth(a1.authId) };
// P2
const a2 = await hold(7200);
results.P2 = { capture: await step("cap60", () => capture(a2.authId, "60.00", false)), void: await step("void", () => voidAuth(a2.authId)), after: await getAuth(a2.authId) };
// P3
const a3 = await hold(7200);
results.P3 = { over: await step("cap80", () => capture(a3.authId, "80.00", true)), after: await getAuth(a3.authId) };
// P4
const a4 = await hold(7200);
results.P4 = { reauth: await step("reauth", () => reauth(a4.authId)) };
// P5
const codes: MockCode[] = ["INSTRUMENT_DECLINED", "AUTHORIZATION_EXPIRED", "AUTHORIZATION_VOIDED", "PAYER_CANNOT_PAY", "MAX_CAPTURE_AMOUNT_EXCEEDED"];
const p5: Record<string, unknown> = {};
for (const c of codes) {
  const a = await hold(7200);
  const h = { "PayPal-Mock-Response": mockHeader(c) };
  p5[c] = { capture: await step("cap", () => capture(a.authId, "10.00", false, h)), void: await step("void", () => voidAuth(a.authId, h)), reauth: await step("reauth", () => reauth(a.authId, h)) };
}
results.P5 = p5;
// P6
const a6 = await hold(7200);
const rid = randomUUID();
results.P6 = { first: await step("c1", () => capture(a6.authId, "20.00", false, {}, rid)), repeat: await step("c2", () => capture(a6.authId, "20.00", false, {}, rid)), after: await getAuth(a6.authId) };
// P7
const sbid = `probe-${randomUUID()}`;
const payout = () => call<{ batch_header: { payout_batch_id: string; batch_status: string } }>("payout", "POST", "/v1/payments/payouts", {
  sender_batch_header: { sender_batch_id: sbid, email_subject: "Probe payout" },
  items: [{ recipient_type: "EMAIL", amount: { value: "1.00", currency: "USD" }, receiver: process.env.VENDOR_COACH_EMAIL, sender_item_id: "probe-1", note: "probe" }],
}).then((r) => r.json);
const t7 = Date.now();
const first = await step("payout1", payout);
results.P7 = { first, repeat: await step("payout2", payout) };
// P8 (payout part): poll batch until final
if (first.ok) {
  const id = (first.value as { batch_header: { payout_batch_id: string } }).batch_header.payout_batch_id;
  let status = "PENDING";
  for (let i = 0; i < 20 && !["SUCCESS", "DENIED", "CANCELED"].includes(status); i++) {
    await new Promise((r) => setTimeout(r, 3000));
    status = (await call<{ batch_header: { batch_status: string } }>("getPayout", "GET", `/v1/payments/payouts/${id}`)).json.batch_header.batch_status;
  }
  results.P8 = { payoutBatch: id, finalStatus: status, secondsToFinal: Math.round((Date.now() - t7) / 1000), webhook: "measured once the webhook is registered on the deployed URL" };
}

writeFileSync(`docs/probe/${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}-probe.json`, JSON.stringify(results, null, 2));
const brief = (x: unknown) => JSON.stringify(x, (k, v) => (k === "links" ? undefined : v)).slice(0, 400);
for (const [k, v] of Object.entries(results)) console.log(k, brief(v));
