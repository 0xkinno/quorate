import { PayPalError, toAmount, type PayoutItem } from "./types";
import { env } from "./live";

/** REST for what the Server SDK does not cover: Payouts, webhook verification, Invoicing. */
let cached: { token: string; until: number } | null = null;

export async function token(): Promise<string> {
  if (cached && cached.until > Date.now() + 60_000) return cached.token;
  const e = env();
  const r = await fetch(`${e.base}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${e.id}:${e.secret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!r.ok) throw new PayPalError("token", r.status, "AUTH_FAILED");
  const j = (await r.json()) as { access_token: string; expires_in: number };
  cached = { token: j.access_token, until: Date.now() + j.expires_in * 1000 };
  return j.access_token;
}

export async function call<T>(op: string, method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<{ status: number; json: T; debugId?: string }> {
  // Network failures are retried with the same PayPal-Request-Id, so PayPal never acts twice.
  let r: Response | undefined;
  for (let i = 0; !r; i++) {
    try {
      r = await fetch(`${env().base}${path}`, {
        method,
        headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json", ...headers },
        body: body === undefined ? (method === "POST" ? "{}" : undefined) : JSON.stringify(body),
      });
    } catch (e) {
      if (i >= 3 || (method === "POST" && !headers["PayPal-Request-Id"] && !path.includes("payouts"))) throw e;
      await new Promise((res) => setTimeout(res, 500 * (i + 1)));
    }
  }
  const text = await r.text();
  const json = (text ? JSON.parse(text) : {}) as T & { details?: { issue: string }[]; name?: string; debug_id?: string };
  if (!r.ok) throw new PayPalError(op, r.status, json?.details?.[0]?.issue ?? json?.name ?? "UNKNOWN", json?.debug_id ?? r.headers.get("paypal-debug-id") ?? undefined);
  return { status: r.status, json, debugId: r.headers.get("paypal-debug-id") ?? undefined };
}

export async function createPayout(x: { senderBatchId: string; subject: string; items: PayoutItem[] }) {
  const r = await call<{ batch_header: { payout_batch_id: string; batch_status: string } }>("payout", "POST", "/v1/payments/payouts", {
    sender_batch_header: { sender_batch_id: x.senderBatchId.slice(0, 127), email_subject: x.subject },
    items: x.items.map((i) => ({ recipient_type: "EMAIL", amount: { value: toAmount(i.cents), currency: "USD" }, receiver: i.receiver, sender_item_id: i.senderItemId, note: i.note })),
  });
  return { batchId: r.json.batch_header.payout_batch_id, status: r.json.batch_header.batch_status };
}

export async function getPayout(batchId: string) {
  const r = await call<{ batch_header: { batch_status: string } }>("getPayout", "GET", `/v1/payments/payouts/${batchId}`);
  return { batchId, status: r.json.batch_header.batch_status };
}

export async function verifyWebhook(headers: Headers, rawBody: string): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;
  const r = await call<{ verification_status: string }>("verifyWebhook", "POST", "/v1/notifications/verify-webhook-signature", {
    auth_algo: headers.get("paypal-auth-algo"), cert_url: headers.get("paypal-cert-url"),
    transmission_id: headers.get("paypal-transmission-id"), transmission_sig: headers.get("paypal-transmission-sig"),
    transmission_time: headers.get("paypal-transmission-time"), webhook_id: webhookId, webhook_event: JSON.parse(rawBody),
  });
  return r.json.verification_status === "SUCCESS";
}
