import { verifyWebhook } from "@/src/paypal/rest";
import { db } from "@/src/db/store";

export const dynamic = "force-dynamic";

/** Accepted only after PayPal's verify-webhook-signature returns SUCCESS; duplicates are ignored. */
export async function POST(req: Request) {
  const raw = await req.text();
  let ok = false;
  try { ok = await verifyWebhook(req.headers, raw); } catch { ok = false; }
  if (!ok) return Response.json({ verified: false }, { status: 400 });
  const ev = JSON.parse(raw) as { id: string; event_type: string; resource?: { id?: string; custom_id?: string; invoice_id?: string } };
  const tid = req.headers.get("paypal-transmission-id") ?? ev.id;
  const fresh = await db().recordWebhook(tid, { eventId: ev.id, type: ev.event_type, resourceId: ev.resource?.id, invoiceId: ev.resource?.invoice_id, receivedAt: new Date().toISOString() });
  if (fresh) await db().put("event", ev.id, ev.resource?.invoice_id?.split("-").slice(0, 3).join("-") ?? null, { id: ev.id, type: ev.event_type, resourceId: ev.resource?.id, invoiceId: ev.resource?.invoice_id, at: new Date().toISOString() });
  return Response.json({ verified: true, duplicate: !fresh });
}
