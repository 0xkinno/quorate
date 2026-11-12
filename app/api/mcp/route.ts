import { getPool, listPools, classPool, memberByToken } from "@/src/pool/service";

export const dynamic = "force-dynamic";

/**
 * MCP door (JSON-RPC 2.0 over HTTP, read-only). A family's own assistant can check a trip and the state of
 * the family's slip; the slip link itself is never handed out here, and only the family approves a hold, on
 * PayPal. No tool here moves money. Methods: initialize, tools/list, tools/call (pool_status, slip_status).
 */
const TOOLS = [
  { name: "pool_status", description: "State of a class trip: children held, minimum, share per child now, and the close result if it ran.",
    inputSchema: { type: "object", properties: { poolId: { type: "string", description: "Pool id; omit for the open class trip" } } } },
  { name: "slip_status", description: "Whether a child's slip on the open class trip is still waiting, held or settled, and the most it can cost. The slip link itself goes only to the family.",
    inputSchema: { type: "object", properties: { child: { type: "string", description: "Child's name as on the slip, for example 'Maya R.'" } }, required: ["child"] } },
];

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;

async function call(name: string, args: Record<string, string>, origin: string) {
  if (name === "pool_status") {
    const id = args.poolId ?? (await classPool()).id;
    const v = await getPool(id);
    if (!v) return { error: "No such trip" };
    return { trip: v.pool.title, state: v.pool.state, childrenHeld: v.heldCount, minimum: v.pool.minN, holdPerFamily: usd(v.members[0]?.capCents ?? 0),
      sharePerChildNow: v.preview.ok ? usd(v.preview.level) : null, closesAt: v.pool.closeAt,
      close: v.close?.reconciled ? { familiesCharged: usd(v.close.reconciled.netCharged), vendorsPaid: usd(v.close.reconciled.vendorsDue), exact: v.close.reconciled.exact } : null,
      proof: `${origin}/proof/${v.pool.id}` };
  }
  if (name === "slip_status") {
    const cls = await classPool();
    const v = await getPool(cls.id);
    const m = v?.members.find((x) => x.child.toLowerCase() === String(args.child ?? "").toLowerCase());
    if (!m) return { error: "No child by that name on the open class trip" };
    const f = await memberByToken(m.token);
    return { child: m.child, state: m.state, holdAmount: usd(f!.member.capCents), guaranteedUntil: m.honorUntil ?? null, note: "The slip link is sent only to the family; only the family approves the hold, on PayPal." };
  }
  return { error: `Unknown tool ${name}` };
}

export async function GET() {
  return Response.json({ name: "quorate", protocol: "MCP over HTTP (JSON-RPC 2.0), read-only", tools: TOOLS.map((t) => t.name), recentRuns: (await listPools("live-run")).slice(0, 3).map((p) => p.id) });
}

export async function POST(req: Request) {
  const origin = (process.env.PUBLIC_BASE_URL || (req.headers.get("x-forwarded-host") ? `https://${req.headers.get("x-forwarded-host")}` : new URL(req.url).origin)).replace(/\/$/, "");
  const body = (await req.json().catch(() => null)) as { id?: number | string; method?: string; params?: { name?: string; arguments?: Record<string, string> } } | null;
  if (!body?.method) return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid request" } }, { status: 400 });
  const reply = (result: unknown) => Response.json({ jsonrpc: "2.0", id: body.id ?? null, result });
  if (body.method === "initialize") return reply({ protocolVersion: "2025-06-18", serverInfo: { name: "quorate", version: "1.0.0" }, capabilities: { tools: {} } });
  if (body.method === "tools/list") return reply({ tools: TOOLS });
  if (body.method === "tools/call") {
    const out = await call(body.params?.name ?? "", body.params?.arguments ?? {}, origin);
    return reply({ content: [{ type: "text", text: JSON.stringify(out) }], isError: "error" in out });
  }
  return Response.json({ jsonrpc: "2.0", id: body.id ?? null, error: { code: -32601, message: "Method not found" } });
}
