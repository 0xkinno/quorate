import { startLiveRun } from "@/src/pool/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { decline?: boolean };
  try {
    const pool = await startLiveRun({ decline: body.decline !== false });
    return Response.json({ poolId: pool.id, port: pool.port });
  } catch (e) {
    const msg = (e as Error).message;
    return Response.json({ error: msg }, { status: msg.startsWith("DAILY_LIMIT") || msg === "LIVE_OFF" ? 429 : 500 });
  }
}
