import Link from "next/link";
import { classPool, getPool, listPools } from "@/src/pool/service";
import { TimelineLoader } from "./TimelineLoader";

export const dynamic = "force-dynamic";

export default async function Timeline({ searchParams }: { searchParams: Promise<{ pool?: string }> }) {
  const sp = await searchParams;
  const cls = await classPool();
  const runs = await listPools("live-run");
  let id = sp.pool;
  if (!id) {
    for (const p of runs.filter((x) => x.state === "CLOSED")) { const c = await getPool(p.id); if (c?.members.some((m) => m.honorUntil)) { id = p.id; break; } }
  }
  id = id ?? cls.id;
  const v = await getPool(id);
  const pools = [cls, ...runs.filter((p) => p.state !== "FAILED").slice(0, 10)];
  const vault = v?.pool.title.includes("Vault");
  return (
    <main className="mx-auto max-w-6xl px-4 pt-10">
      <p className="caps">Honor windows · Bryntum Scheduler</p>
      <h1 className="display mt-2 text-3xl sm:text-4xl">Every hold, on one timeline.</h1>
      <p className="mt-3 max-w-3xl text-[var(--ink-2)]">
        A PayPal hold is honored for 3 days and valid for 29. Blue is the honor window each family approved; green is the renewed window the
        every-minute tick schedules at <span className="mono">max(t0 + 3 days, close - 3 days)</span>, so the guarantee covers the close, the red line.
        Read-only: amounts are decided by the Bursar, never by a drag.
      </p>
      <nav aria-label="Choose a trip" className="mt-5 flex flex-wrap gap-2">
        {pools.map((p) => (
          <Link key={p.id} href={`/timeline?pool=${p.id}`} className={`rounded-lg px-3 py-1.5 text-sm ${p.id === id ? "bg-[var(--ink)] text-white" : "border rule bg-white/60"}`}>
            {p.kind === "class" ? "Class trip (slips)" : p.title.replace("Live run, ", "")}
          </Link>
        ))}
      </nav>
      <div className="mt-6">
        {v && v.members.some((m) => m.honorUntil) ? (
          <TimelineLoader members={v.members.map(({ token: _t, ...m }) => m)} closeAt={v.pool.closeAt} title={v.pool.title} />
        ) : vault ? <p className="empty">This trip closes 40 days out, past what a PayPal hold can reach, so it used the Vault path: families saved PayPal for the trip and were charged the real share at the close. There are no hold windows to draw.</p>
        : <p className="empty">No family has approved a hold on this trip yet. Open a slip from the judge door and approve one; it appears here with its honor window.</p>}
      </div>
      <p className="mt-4 text-xs text-[var(--ink-2)]">Bryntum Scheduler trial build. Windows come from each hold&apos;s recorded authorization time and the renewal plan in <span className="mono">src/bursar/renewal.ts</span>.</p>
    </main>
  );
}
