import {
  CheckoutPaymentIntent, Client, Environment, OrdersController, PaymentsController, ApiError,
} from "@paypal/paypal-server-sdk";
import { PayPalError, toAmount, toCents, type AuthorizationView, type MockCode, type PayPalPort, type PayoutItem, mockHeader } from "./types";

/**
 * Live PayPal sandbox. Orders and Payments go through the PayPal Server SDK (one client per call,
 * 30 s timeout, SDK retries off: the attempt log owns retries). Payouts and webhook verification
 * are not in the SDK and go through REST (src/paypal/rest.ts).
 */
export const env = () => {
  const base = process.env.PAYPAL_API_BASE ?? "https://api-m.sandbox.paypal.com";
  // Quorate runs on the PayPal sandbox only; a production base URL is refused, not silently used.
  if (!/^https:\/\/api-m\.sandbox\.paypal\.com\/?$/.test(base)) throw new Error(`SANDBOX_ONLY refused PAYPAL_API_BASE=${base}`);
  return { id: process.env.PAYPAL_CLIENT_ID ?? "", secret: process.env.PAYPAL_CLIENT_SECRET ?? "", base };
};
export const hasPayPalKeys = () => Boolean(env().id && env().secret);

function sdk() {
  const e = env();
  const client = new Client({
    clientCredentialsAuthCredentials: { oAuthClientId: e.id, oAuthClientSecret: e.secret },
    timeout: 30_000,
    environment: Environment.Sandbox,
    httpClientOptions: { retryConfig: { maxNumberOfRetries: 0 } },
  });
  return { orders: new OrdersController(client), payments: new PaymentsController(client) };
}

function wrap(op: string, e: unknown): never {
  if (e instanceof ApiError) {
    let issue = "UNKNOWN", debugId: string | undefined;
    try {
      const b = JSON.parse(e.body as string);
      issue = b?.details?.[0]?.issue ?? b?.name ?? issue; debugId = b?.debug_id;
    } catch { /* body not JSON */ }
    throw new PayPalError(op, e.statusCode, issue, debugId);
  }
  throw e;
}

const mock = (m?: MockCode) => (m ? mockHeader(m) : undefined);

export async function createAuthorizeOrder(a: { memberId: string; poolId: string; seq: number; capCents: number; termsHash: string; requestId: string; returnUrl?: string; cancelUrl?: string }) {
  try {
    const r = await sdk().orders.createOrder({
      paypalRequestId: a.requestId,
      prefer: "return=representation",
      body: {
        intent: CheckoutPaymentIntent.Authorize,
        purchaseUnits: [{
          referenceId: a.memberId, customId: a.termsHash.slice(0, 64), invoiceId: `${a.poolId}-${a.memberId}-${a.seq}`,
          description: "Class trip share (held, not charged)",
          amount: { currencyCode: "USD", value: toAmount(a.capCents) },
        }],
        paymentSource: { paypal: { experienceContext: { shippingPreference: "NO_SHIPPING" as never, brandName: "Quorate", userAction: "CONTINUE" as never, returnUrl: a.returnUrl, cancelUrl: a.cancelUrl } } },
      },
    });
    const approve = r.result.links?.find((l) => l.rel === "payer-action" || l.rel === "approve")?.href;
    return { orderId: r.result.id!, status: r.result.status!, approveUrl: approve };
  } catch (e) { wrap("createOrder", e); }
}

export async function authorizeOrder(orderId: string, requestId: string) {
  try {
    const r = await sdk().orders.authorizeOrder({ id: orderId, paypalRequestId: requestId, prefer: "return=representation" });
    const auth = r.result.purchaseUnits?.[0]?.payments?.authorizations?.[0];
    if (!auth?.id) throw new PayPalError("authorizeOrder", 500, "NO_AUTHORIZATION");
    return { authId: auth.id, status: auth.status as string, expiresAt: auth.expirationTime ?? "", amountCents: toCents(auth.amount?.value ?? "0"), referenceId: r.result.purchaseUnits?.[0]?.referenceId ?? "" };
  } catch (e) { if (e instanceof PayPalError) throw e; wrap("authorizeOrder", e); }
}

export async function reauthorize(authId: string, cents: number, requestId: string) {
  try {
    const r = await sdk().payments.reauthorizePayment({ authorizationId: authId, paypalRequestId: requestId, prefer: "return=representation", body: { amount: { currencyCode: "USD", value: toAmount(cents) } } });
    return { authId: r.result.id!, status: r.result.status as string, expiresAt: r.result.expirationTime ?? "" };
  } catch (e) { wrap("reauthorize", e); }
}

export class LivePayPal implements PayPalPort {
  readonly kind = "sandbox" as const;

  async getAuthorization(authId: string): Promise<AuthorizationView> {
    try {
      const r = await sdk().payments.getAuthorizedPayment({ authorizationId: authId });
      const a = r.result;
      return { id: a.id!, status: a.status as AuthorizationView["status"], amountCents: toCents(a.amount?.value ?? "0"), capturedCents: 0, expiresAt: a.expirationTime ?? "" };
    } catch (e) { wrap("getAuthorization", e); }
  }

  async capture(x: { authId: string; cents: number; final: boolean; requestId: string; invoiceId: string; mock?: MockCode }) {
    try {
      const r = await sdk().payments.captureAuthorizedPayment({
        authorizationId: x.authId, paypalRequestId: x.requestId, paypalMockResponse: mock(x.mock), prefer: "return=representation",
        body: { amount: { currencyCode: "USD", value: toAmount(x.cents) }, finalCapture: x.final, invoiceId: x.invoiceId },
      });
      if (r.result.status === "DECLINED" || r.result.status === "FAILED") throw new PayPalError("capture", 422, `CAPTURE_${r.result.status}`);
      return { captureId: r.result.id!, status: r.result.status as string, cents: toCents(r.result.amount?.value ?? toAmount(x.cents)) };
    } catch (e) { if (e instanceof PayPalError) throw e; wrap("capture", e); }
  }

  async voidAuthorization(x: { authId: string; requestId: string; mock?: MockCode }) {
    try { await sdk().payments.voidPayment({ authorizationId: x.authId, paypalRequestId: x.requestId, paypalMockResponse: mock(x.mock) }); }
    catch (e) { wrap("void", e); }
  }

  async refund(x: { captureId: string; cents: number; requestId: string }) {
    try {
      const r = await sdk().payments.refundCapturedPayment({ captureId: x.captureId, paypalRequestId: x.requestId, prefer: "return=representation", body: { amount: { currencyCode: "USD", value: toAmount(x.cents) } } });
      return { refundId: r.result.id!, status: r.result.status as string };
    } catch (e) { wrap("refund", e); }
  }

  async payout(x: { senderBatchId: string; subject: string; items: PayoutItem[] }) {
    const { createPayout } = await import("./rest");
    return createPayout(x);
  }

  async getPayout(batchId: string) {
    const { getPayout } = await import("./rest");
    return getPayout(batchId);
  }
}
