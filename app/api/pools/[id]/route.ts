import { getPool } from "@/src/pool/service";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await getPool(id);
  if (!v) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  const members = v.members.map(({ token: _t, ...m }) => m);
  return Response.json({ ...v, members }, { headers: { "Cache-Control": "no-store" } });
}
