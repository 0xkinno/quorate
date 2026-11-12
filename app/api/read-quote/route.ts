import { readQuote } from "@/src/crew/reader";

export const dynamic = "force-dynamic";

const hits = new Map<string, { n: number; day: string }>();

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const day = new Date().toISOString().slice(0, 10);
  const h = hits.get(ip); const n = h && h.day === day ? h.n + 1 : 1; hits.set(ip, { n, day });
  if (n > 20) return Response.json({ error: "Daily limit reached" }, { status: 429 });
  const text = ((await req.json().catch(() => null)) as { text?: string } | null)?.text ?? "";
  if (!text || text.length > 4000) return Response.json({ error: "Paste a quote under 4,000 characters" }, { status: 400 });
  try { return Response.json(await readQuote(text)); }
  catch (e) { return Response.json({ error: (e as Error).message.slice(0, 200) }, { status: 502 }); }
}
