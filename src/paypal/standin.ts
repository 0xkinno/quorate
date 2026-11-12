import { randomBytes } from "node:crypto";
import { PayPalError, type AuthorizationView, type CaptureResult, type MockCode, type PayPalPort, type PayoutItem } from "./types";

/**
 * PayPal stand-in. Used for offline runs and tests, and labelled "stand-in" in the UI and in
 * /api/status. It mirrors the sandbox behaviour Quorate depends on: partial captures with
 * final_capture, void of the remainder, PayPal-Request-Id idempotency, refunds, payouts with
 * sender_batch_id idempotency, the PayPal-Mock-Response fault switch, and PayPal's own
 * over-capture allowance (115% or +$75, whichever is less), which Quorate's guard refuses.
 */
type Auth = { id: string; amountCents: number; capturedCents: number; status: AuthorizationView["status"]; expiresAt: string; captures: string[]; final: boolean };
type Cap = { id: string; authId: string; cents: number; refundedCents: number };

const id = (p: string) => `${p}${randomBytes(6).toString("hex").toUpperCase()}`;

export class StandInPayPal implements PayPalPort {
  readonly kind = "stand-in" as const;
  auths = new Map<string, Auth>();
  caps = new Map<string, Cap>();
  byRequest = new Map<string, unknown>();
  payouts = new Map<string, { batchId: string; status: string; items: PayoutItem[] }>();
  calls: { op: string; requestId?: string }[] = [];
  /** Test seam: throw after PayPal has done the work, before the caller sees the result. */
  crashAfter?: (op: string, n: number) => boolean;

  authorize(amountCents: number, now = Date.now()): string {
    const a: Auth = { id: id("AUTH"), amountCents, capturedCents: 0, status: "CREATED", expiresAt: new Date(now + 29 * 86400000).toISOString(), captures: [], final: false };
    this.auths.set(a.id, a);
    return a.id;
  }

  private once<T>(op: string, rid: string | undefined, fn: () => T): T {
    this.calls.push({ op, requestId: rid });
    if (rid && this.byRequest.has(`${op}:${rid}`)) return this.byRequest.get(`${op}:${rid}`) as T;
    const out = fn();
    if (rid) this.byRequest.set(`${op}:${rid}`, out);
    if (this.crashAfter?.(op, this.calls.length)) throw new Error(`CRASH after ${op}`);
    return out;
  }

  private fault(op: string, mock?: MockCode) {
    if (mock) throw new PayPalError(op, 422, mock, id("DBG"));
  }

  async getAuthorization(authId: string): Promise<AuthorizationView> {
    const a = this.auths.get(authId);
    if (!a) throw new PayPalError("getAuthorization", 404, "RESOURCE_NOT_FOUND");
    return { id: a.id, status: a.status, amountCents: a.amountCents, capturedCents: a.capturedCents, expiresAt: a.expiresAt };
  }

  async capture(x: { authId: string; cents: number; final: boolean; requestId: string; invoiceId: string; mock?: MockCode }): Promise<CaptureResult> {
    return this.once("capture", x.requestId, () => {
      this.fault("capture", x.mock);
      const a = this.auths.get(x.authId);
      if (!a) throw new PayPalError("capture", 404, "RESOURCE_NOT_FOUND");
      if (a.status === "VOIDED" || a.status === "EXPIRED" || a.final || a.status === "CAPTURED")
        throw new PayPalError("capture", 422, "AUTHORIZATION_ALREADY_COMPLETED");
      const ceiling = Math.min(Math.floor(a.amountCents * 1.15), a.amountCents + 7500);
      if (a.capturedCents + x.cents > ceiling) throw new PayPalError("capture", 422, "MAX_CAPTURE_AMOUNT_EXCEEDED");
      const c: Cap = { id: id("CAP"), authId: a.id, cents: x.cents, refundedCents: 0 };
      this.caps.set(c.id, c);
      a.captures.push(c.id);
      a.capturedCents += x.cents;
      if (x.final) { a.final = true; a.status = "CAPTURED"; } else a.status = "PARTIALLY_CAPTURED";
      return { captureId: c.id, status: "COMPLETED", cents: x.cents };
    });
  }

  async voidAuthorization(x: { authId: string; requestId: string; mock?: MockCode }) {
    return this.once("void", x.requestId, () => {
      this.fault("void", x.mock);
      const a = this.auths.get(x.authId);
      if (!a) throw new PayPalError("void", 404, "RESOURCE_NOT_FOUND");
      if (a.status === "VOIDED" || a.final) throw new PayPalError("void", 422, "AUTHORIZATION_ALREADY_COMPLETED");
      a.status = a.capturedCents > 0 ? "CAPTURED" : "VOIDED";
      a.final = true;
    });
  }

  async refund(x: { captureId: string; cents: number; requestId: string }) {
    return this.once("refund", x.requestId, () => {
      const c = this.caps.get(x.captureId);
      if (!c) throw new PayPalError("refund", 404, "RESOURCE_NOT_FOUND");
      if (c.refundedCents + x.cents > c.cents) throw new PayPalError("refund", 422, "REFUND_AMOUNT_EXCEEDED");
      c.refundedCents += x.cents;
      return { refundId: id("REF"), status: "COMPLETED" };
    });
  }

  async payout(x: { senderBatchId: string; subject: string; items: PayoutItem[] }) {
    return this.once("payout", x.senderBatchId, () => {
      const p = { batchId: id("BATCH"), status: "SUCCESS", items: x.items };
      this.payouts.set(p.batchId, p);
      return { batchId: p.batchId, status: "PENDING" };
    });
  }

  async getPayout(batchId: string) {
    const p = this.payouts.get(batchId);
    if (!p) throw new PayPalError("getPayout", 404, "RESOURCE_NOT_FOUND");
    return { batchId, status: p.status };
  }

  /** Net money taken from one authorization (captures minus refunds). */
  netCaptured(authId: string) {
    const a = this.auths.get(authId)!;
    return a.captures.reduce((s, cid) => { const c = this.caps.get(cid)!; return s + c.cents - c.refundedCents; }, 0);
  }
}
