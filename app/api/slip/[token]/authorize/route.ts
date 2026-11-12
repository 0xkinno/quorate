import { memberByToken, recordHold } from "@/src/pool/service";
import { authorizeOrder } from "@/src/paypal/live";
import { requestId } from "@/src/paypal/types";
import { db } from "@/src/db/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { orderId } = (await req.json()) as { orderId: string };
  const f = await memberByToken(token);
  if (!f) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  try {
    const a = await authorizeOrder(orderId, requestId(f.pool.id, f.member.id, "authorize", orderId));
    if (a!.amountCents !== f.member.capCents) return Response.json({ error: "AMOUNT_MISMATCH" }, { status: 409 });
    const m = await recordHold(db(), f.pool, f.member, { orderId, authId: a!.authId, authorizedAt: new Date().toISOString(), source: "paypal-login" });
    return Response.json({ state: m.state, authId: m.authId, honorUntil: m.honorUntil, validUntil: m.validUntil, renewAt: m.renewAt, expiresAt: a!.expiresAt });
  } catch (e) { return Response.json({ error: (e as Error).message }, { status: 502 }); }
}
