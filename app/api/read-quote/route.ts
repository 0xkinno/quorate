import { readQuote } from "@/src/crew/reader";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { text } = (await req.json()) as { text: string };
  if (!text || text.length > 4000) return Response.json({ error: "Paste a quote under 4,000 characters" }, { status: 400 });
  try { return Response.json(await readQuote(text)); }
  catch (e) { return Response.json({ error: (e as Error).message.slice(0, 200) }, { status: 502 }); }
}
