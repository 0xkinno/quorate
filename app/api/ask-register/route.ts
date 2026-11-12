import { askRegister } from "@/src/crew/ask";

export const dynamic = "force-dynamic";
const hits = new Map<string, { n: number; day: string }>();

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const day = new Date().toISOString().slice(0, 10);
  const h = hits.get(ip); const n = h && h.day === day ? h.n + 1 : 1; hits.set(ip, { n, day });
  if (n > 40) return Response.json({ error: "Daily limit reached" }, { status: 429 });
  const question = ((await req.json().catch(() => null)) as { question?: string } | null)?.question ?? "";
  if (!question || question.length > 300) return Response.json({ error: "Ask a question under 300 characters" }, { status: 400 });
  return Response.json(await askRegister(question));
}
