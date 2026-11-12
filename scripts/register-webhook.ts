/** Register the PayPal webhook for the deployed URL (idempotent: reuses one already pointing there). */
import { call } from "../src/paypal/rest";
const url = `${(process.argv[2] ?? process.env.PUBLIC_BASE_URL)!.replace(/\/$/, "")}/api/paypal/webhook`;
const events = ["CHECKOUT.ORDER.APPROVED", "PAYMENT.AUTHORIZATION.CREATED", "PAYMENT.AUTHORIZATION.VOIDED", "PAYMENT.CAPTURE.COMPLETED", "PAYMENT.CAPTURE.DENIED", "PAYMENT.CAPTURE.DECLINED", "PAYMENT.CAPTURE.REFUNDED", "PAYMENT.PAYOUTSBATCH.SUCCESS", "PAYMENT.PAYOUTS-ITEM.SUCCEEDED"];
const list = await call<{ webhooks: { id: string; url: string }[] }>("listWebhooks", "GET", "/v1/notifications/webhooks");
const found = list.json.webhooks.find((w) => w.url === url);
if (found) { console.log(JSON.stringify({ webhookId: found.id, url, reused: true })); process.exit(0); }
const r = await call<{ id: string }>("createWebhook", "POST", "/v1/notifications/webhooks", { url, event_types: events.map((name) => ({ name })) });
console.log(JSON.stringify({ webhookId: r.json.id, url, reused: false }));
