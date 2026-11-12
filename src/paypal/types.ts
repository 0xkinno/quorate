import { createHash } from "node:crypto";

/** Display only. Every amount inside Quorate is integer cents. */
export const toAmount = (c: number) => (c / 100).toFixed(2);

/** Parse a PayPal amount string ("61.38") into integer cents without floats. */
export function toCents(value: string): number {
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!m) throw new Error(`BAD_AMOUNT ${value}`);
  return Number(m[1]) * 100 + Number((m[2] ?? "0").padEnd(2, "0"));
}

export const requestId = (...parts: (string | number)[]) =>
  createHash("sha256").update(parts.join(":")).digest("hex").slice(0, 36);

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export class PayPalError extends Error {
  constructor(public op: string, public status: number, public issue: string, public debugId?: string) {
    super(`${op} ${status} ${issue}${debugId ? ` debug ${debugId}` : ""}`);
  }
}

/** Sandbox negative testing: the value of the PayPal-Mock-Response header. */
export type MockCode =
  | "INSTRUMENT_DECLINED"
  | "AUTHORIZATION_EXPIRED"
  | "AUTHORIZATION_VOIDED"
  | "PAYER_CANNOT_PAY"
  | "MAX_CAPTURE_AMOUNT_EXCEEDED"
  | "TRANSACTION_REFUSED";

export const mockHeader = (code: MockCode) => JSON.stringify({ mock_application_codes: code });

export type AuthStatus = "CREATED" | "CAPTURED" | "PARTIALLY_CAPTURED" | "VOIDED" | "EXPIRED" | "DENIED" | "PENDING";

export type AuthorizationView = {
  id: string;
  status: AuthStatus;
  amountCents: number;
  capturedCents: number;
  expiresAt: string;
};

export type CaptureResult = { captureId: string; status: string; cents: number };

export type PayoutItem = { receiver: string; cents: number; senderItemId: string; note: string };

/**
 * What the Bursar needs from PayPal. Two implementations: the live sandbox (src/paypal/live.ts)
 * and the stand-in (src/paypal/standin.ts), which is labelled as such wherever it is used.
 */
export interface PayPalPort {
  readonly kind: "sandbox" | "stand-in";
  getAuthorization(authId: string): Promise<AuthorizationView>;
  capture(a: { authId: string; cents: number; final: boolean; requestId: string; invoiceId: string; mock?: MockCode }): Promise<CaptureResult>;
  voidAuthorization(a: { authId: string; requestId: string; mock?: MockCode }): Promise<void>;
  refund(a: { captureId: string; cents: number; requestId: string }): Promise<{ refundId: string; status: string }>;
  payout(a: { senderBatchId: string; subject: string; items: PayoutItem[] }): Promise<{ batchId: string; status: string }>;
  getPayout(batchId: string): Promise<{ batchId: string; status: string }>;
}
