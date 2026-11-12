import { askClerk } from "@/src/crew/clerk";

const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`, "g");

export const dynamic = "force-dynamic";
const hits = new Map<string, { n: number; day: string }>();
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

/** Public help desk, rate-limited per visitor per day. Model output is filtered to the house style. */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const day = new Date().toISOString().slice(0, 10);
  const h = hits.get(ip);
  const n = h && h.day === day ? h.n + 1 : 1;
  hits.set(ip, { n, day });
  if (n > 40) return Response.json({ error: "Daily question limit reached" }, { status: 429 });
  const { question, token, poolId } = (await req.json()) as { question: string; token?: string; poolId?: string };
  if (!question || question.length > 500) return Response.json({ error: "Ask a question under 500 characters" }, { status: 400 });
  try {
    const r = await askClerk(question, { token, poolId });
    return Response.json({ ...r, answer: r.answer.replace(EMOJI, "").replace(DASHES, ",") });
  } catch (e) {
    return Response.json({ error: (e as Error).message.slice(0, 200) }, { status: 502 });
  }
}
