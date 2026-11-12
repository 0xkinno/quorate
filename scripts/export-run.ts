/** Export a run from the ledger to docs/live-runs/<poolId>.json. Usage: npx tsx scripts/export-run.ts [poolId] (default: latest) */
import { writeFileSync } from "node:fs";
import { getPool, listPools } from "../src/pool/service";
const id = process.argv[2] ?? (await listPools("live-run"))[0].id;
const v = await getPool(id);
writeFileSync(`docs/live-runs/${id}.json`, JSON.stringify({ scenario: v!.pool.decline ? "L3" : "L1", ...v, members: v!.members.map(({ token: _t, ...m }) => m) }, null, 2));
console.log(id, v!.pool.title, v!.pool.state, JSON.stringify(v!.close?.reconciled), v!.close?.payout?.batchId);
