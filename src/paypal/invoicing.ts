import { call } from "./rest";
import { toAmount } from "./types";

/**
 * PayPal Invoicing for families who pay cash at the office: the invoice is created and marked sent
 * (no email), the office records the cash it physically received (record-payment), and at the close
 * the cash due back is recorded as a refund on the same invoice (record-refund). PayPal's own ledger
 * then shows every family, cash or not.
 */
export async function createCashInvoice(a: { poolId: string; memberId: string; child: string; cents: number; payerEmail?: string }) {
  const number = `${a.poolId}-${a.memberId}`.slice(0, 25);
  const draft = await call<{ href?: string; id?: string }>("createInvoice", "POST", "/v2/invoicing/invoices", {
    detail: { currency_code: "USD", invoice_number: number, note: `Class trip share for ${a.child}, paid in cash at the school office` },
    invoicer: { business_name: "Harbor View Elementary (demo)" },
    primary_recipients: a.payerEmail ? [{ billing_info: { email_address: a.payerEmail } }] : undefined,
    items: [{ name: "Class trip share (worst case)", quantity: "1", unit_amount: { currency_code: "USD", value: toAmount(a.cents) } }],
  }, { "PayPal-Request-Id": `inv-${number}`, Prefer: "return=representation" });
  const id = draft.json.id ?? draft.json.href!.split("/").pop()!;
  await call("sendInvoice", "POST", `/v2/invoicing/invoices/${id}/send`, { send_to_invoicer: false, send_to_recipient: false }, { "PayPal-Request-Id": `send-${id}` });
  return id;
}

export async function recordCashPayment(invoiceId: string, cents: number) {
  const r = await call<{ payment_id: string }>("recordPayment", "POST", `/v2/invoicing/invoices/${invoiceId}/payments`, {
    method: "CASH", payment_date: new Date().toISOString().slice(0, 10), amount: { currency_code: "USD", value: toAmount(cents) }, note: "Cash received at the school office",
  }, { "PayPal-Request-Id": `pay-${invoiceId}` });
  return r.json.payment_id;
}

export async function recordCashRefund(invoiceId: string, cents: number, requestId: string) {
  const r = await call<{ refund_id: string }>("recordRefund", "POST", `/v2/invoicing/invoices/${invoiceId}/refunds`, {
    method: "CASH", refund_date: new Date().toISOString().slice(0, 10), amount: { currency_code: "USD", value: toAmount(cents) },
  }, { "PayPal-Request-Id": requestId });
  return r.json.refund_id;
}

export async function getInvoice(invoiceId: string) {
  return (await call<{ status: string; payments?: unknown; refunds?: unknown }>("getInvoice", "GET", `/v2/invoicing/invoices/${invoiceId}`)).json;
}
