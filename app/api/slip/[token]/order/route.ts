import { memberByToken } from "@/src/pool/service";
import { createAuthorizeOrder } from "@/src/paypal/live";
import { hashFor } from "@/src/bursar/close";
import { requestId } from "@/src/paypal/types";

export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const f = await memberByToken(token);
  if (!f) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  if (f.member.state !== "INVITED") return Response.json({ error: "ALREADY_HELD" }, { status: 409 });
  try {
    const o = await createAuthorizeOrder({ memberId: f.member.id, poolId: f.pool.id, seq: f.member.seq, capCents: f.member.capCents,
      termsHash: hashFor(f.pool, f.member.capCents), requestId: requestId(f.pool.id, f.member.id, "order", Date.now()) });
    return Response.json({ id: o!.orderId });
  } catch (e) { return Response.json({ error: (e as Error).message }, { status: 502 }); }
}
