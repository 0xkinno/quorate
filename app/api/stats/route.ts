import facts from "@/docs/FACTS.json";
import { stats } from "@/src/pool/stats";

export const dynamic = "force-dynamic";

/** Recorded headline numbers (docs/FACTS.json) next to runs made on this deployment, recomputed now. */
export async function GET() {
  return Response.json({ recorded: facts, thisDeployment: await stats() }, { headers: { "Cache-Control": "no-store" } });
}
