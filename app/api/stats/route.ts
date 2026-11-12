import facts from "@/docs/FACTS.json";
import { stats } from "@/src/pool/stats";

export const dynamic = "force-dynamic";

/** Recorded headline numbers (docs/FACTS.json) next to runs made on this deployment, recomputed now. */
export async function GET() {
  return Response.json({ recorded: facts, thisDeployment: await stats(), note: "recorded = docs/FACTS.json, generated from the committed run files. thisDeployment = every run in this deployment's database, including runs judges started here; holds count members of runs that were not FAILED (the Vault-path run places none)." }, { headers: { "Cache-Control": "no-store" } });
}
