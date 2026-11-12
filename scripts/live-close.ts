/**
 * Record a live close on the PayPal sandbox. Usage: npx tsx --env-file=.env scripts/live-close.ts [decline] [n]
 * Writes the full record to docs/live-runs/<poolId>.json.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { getPool, startLiveRun } from "../src/pool/service";

const decline = process.argv[2] === "decline";
const n = Number(process.argv[3] ?? 20);
const t = Date.now();
const pool = await startLiveRun({ decline, n, wait: true });
const v = await getPool(pool.id);
mkdirSync("docs/live-runs", { recursive: true });
const record = { ...v, members: v!.members.map(({ token: _t, ...m }) => m), seconds: Math.round((Date.now() - t) / 1000) };
writeFileSync(`docs/live-runs/${pool.id}.json`, JSON.stringify(record, null, 2));
console.log(pool.id, v!.pool.state, v!.pool.port, v!.pool.note ?? "", JSON.stringify(v!.close?.reconciled), `${record.seconds}s`);
console.log((v!.close?.steps ?? []).slice(-6).join("\n"));
