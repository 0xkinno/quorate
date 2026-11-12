import { db } from "../db/store";
import { ensureSeeded } from "./seed";

export type RunRecord = {
  poolId: string; at: string; port: "sandbox" | "stand-in"; holdSource: string; state: string; decline: boolean; n: number;
  reconciled?: { vendorsDue: number; netCharged: number; exact: boolean }; payout?: { batchId: string; items: { cents: number }[] };
};

/** Headline numbers, recomputed from recorded runs on every request. Nothing typed by hand. */
export async function stats() {
  await ensureSeeded();
  const runs = await db().list<RunRecord>("run");
  const by = (port: string) => runs.filter((r) => r.port === port);
  const summarize = (rs: RunRecord[]) => ({
    closes: rs.filter((r) => r.state === "CLOSED").length,
    declinesSurvived: rs.filter((r) => r.state === "CLOSED" && r.decline).length,
    centsOff: rs.reduce((s, r) => s + (r.reconciled ? Math.abs(r.reconciled.vendorsDue - r.reconciled.netCharged) : 0), 0),
    holds: rs.reduce((s, r) => s + r.n, 0),
  });
  return { sandbox: summarize(by("sandbox")), standin: summarize(by("stand-in")), lastRun: runs.at(-1) ?? null, total: runs.length };
}
