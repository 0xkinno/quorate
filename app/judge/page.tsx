import Link from "next/link";
import { listPools, classPool, getPool } from "@/src/pool/service";
import { measure } from "@/src/status";
import { db } from "@/src/db/store";
import type { RunRecord } from "@/src/pool/stats";
import { RunButtons } from "./RunButtons";

export const dynamic = "force-dynamic";
const usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const TONE: Record<string, string> = { CLOSED: "settled", FAILED: "declined", NEEDS_TEACHER: "review", LAPSED: "released", CLOSING: "held", HOLDING: "held" };

export default async function Judge() {
  const [runs, cls, status] = await Promise.all([listPools("live-run"), classPool(), measure()]);
  const records = new Map((await db().list<RunRecord & { payout?: { batchId: string; status: string } }>("run")).map((r) => [r.poolId, r]));
  const buyer = process.env.DEMO_BUYER_EMAIL;
  const cv = await getPool(cls.id);
  const freeSlip = cv?.members.find((m) => m.state === "INVITED");
  const chips = [
    ["PayPal", status.probes.paypal.ok ? `sandbox, token ${status.probes.paypal.at.slice(11, 19)} UTC` : status.probes.paypal.detail, status.probes.paypal.ok],
    ["Ledger", status.probes.db.ok ? "Postgres connected" : status.probes.db.detail, status.probes.db.ok],
    ["Model", status.probes.model.detail, status.probes.model.ok],
  ] as const;

  return (
    <main className="mx-auto max-w-6xl px-4 pt-14">
      <p className="eyebrow"><span className="eyebrow-dot" />For judges · about 60 seconds</p>
      <h1 className="display mt-5 max-w-4xl text-[2.6rem] leading-[1.02] tracking-[-0.03em] sm:text-6xl">Close a class trip on the PayPal sandbox.</h1>
      <p className="lede mt-5 max-w-2xl">Live runs make real calls to the PayPal sandbox; the decline is PayPal&apos;s own negative-testing switch. Only step 02 uses a PayPal sandbox login, printed below. No real money moves.</p>
      <ul className="mt-7 flex flex-wrap gap-2" aria-label="Measured status">
        {chips.map(([k, v, ok]) => (
          <li key={k} className="status-chip"><span className={`h-2 w-2 rounded-full ${ok ? "bg-[var(--settled)]" : "bg-[var(--review)]"}`} /><span className="font-medium text-[var(--ink)]">{k}</span><span>{v}</span></li>
        ))}
      </ul>

      <ol className="mt-12 grid gap-4 lg:grid-cols-3">
        <li className="card flex flex-col p-7 lg:col-span-2">
          <div className="flex items-center justify-between"><span className="step-no">01</span><span className="pill">two to three minutes, live</span></div>
          <h2 className="display mt-5 text-[1.7rem] leading-tight">Run a close where PayPal declines a capture</h2>
          <p className="mt-3 leading-relaxed text-[var(--ink-2)]">Twenty demo families each hold $88.00. Quorate closes the trip, and PayPal&apos;s sandbox negative testing refuses family 7. Watch The Register re-share among 19, top up from the same holds, release the rest and pay the vendors exactly.</p>
          <ul className="mt-5 grid gap-2 text-sm sm:grid-cols-3">
            {[["20 holds", "$88.00 each, on PayPal"], ["1 decline", "PAYER_CANNOT_PAY, from PayPal"], ["0 cents off", "vendors paid exactly"]].map(([a, b]) => (
              <li key={a} className="rounded-xl border rule bg-white/60 px-4 py-3"><span className="display block text-lg leading-tight">{a}</span><span className="text-[var(--ink-2)]">{b}</span></li>
            ))}
          </ul>
          <div className="mt-auto pt-6"><RunButtons /></div>
          <p className="mt-3 text-sm text-[var(--ink-2)]">You land on The Register. A step rail at the top says which PayPal call is running, in plain words, until the close is exact.</p>
        </li>
        <li className="card flex flex-col p-7">
          <span className="step-no">02</span>
          <h2 className="display mt-5 text-[1.7rem] leading-tight">Approve a hold, as a parent</h2>
          <p className="mt-3 leading-relaxed text-[var(--ink-2)]">Open a slip, switch it to Spanish or Vietnamese, and approve with this sandbox buyer. The row turns HELD with its guarantee time.</p>
          {buyer && (
            <dl className="mono mt-4 space-y-1 rounded-xl border rule bg-white/70 p-4 text-[0.8rem]">
              <div className="flex justify-between gap-3"><dt className="text-[var(--ink-2)]">Email</dt><dd className="truncate">{buyer}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[var(--ink-2)]">Password</dt><dd>{process.env.DEMO_BUYER_PASSWORD}</dd></div>
            </dl>
          )}
          <div className="mt-auto flex flex-wrap gap-2 pt-5">
            {freeSlip && <Link href={`/slip/${freeSlip.token}`} className="btn btn-primary">Open a demo slip ({freeSlip.child})</Link>}
            <Link href={`/register?pool=${cls.id}`} className="btn btn-ghost">Class register</Link>
          </div>
        </li>
      </ol>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {[
          ["03", "Check every PayPal id", "Each run's proof page lists every authorization, capture, refund and payout id, and the attempt log written before each call."],
          ["04", "See every hold's guarantee", "The honor timeline (Bryntum Scheduler) shows each 3-day window and the renewal that covers the close."],
          ["05", "Ask the help desk", "Gemini with read-only PayPal Agent Toolkit tools. Ask it for a refund: it cannot move money."],
        ].map(([n, t, d], i) => (
          <div key={n} className="card p-6">
            <span className="step-no">{n}</span>
            <h3 className="display mt-4 text-xl leading-tight">{t}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--ink-2)]">{d}</p>
            {i === 1 && <Link className="mt-3 inline-block text-sm text-[var(--held)] underline" href="/timeline">Open the timeline</Link>}
            {i === 2 && <Link className="mt-3 inline-block text-sm text-[var(--held)] underline" href="/help">Open the help desk</Link>}
          </div>
        ))}
      </div>

      <section className="mt-16" aria-labelledby="runs-h">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="caps">Recorded on the PayPal sandbox</p>
            <h2 id="runs-h" className="section-h mt-1">Every run, with its proof</h2>
          </div>
          <p className="text-sm text-[var(--ink-2)]">{runs.length} runs · failed runs are kept, not hidden</p>
        </div>
        <div className="card mt-5 overflow-x-auto p-0" tabIndex={0} role="region" aria-label="Recorded runs">
          <table className="ledger w-full min-w-[900px]">
            <thead>
              <tr><th>Started (UTC)</th><th>Trip</th><th className="text-right">Holds</th><th className="text-right">Charged</th><th className="text-right">Vendors paid</th><th>Payout</th><th>Status</th><th className="text-right">Open</th></tr>
            </thead>
            <tbody>
              {runs.length === 0 && <tr><td colSpan={8} className="text-[var(--ink-2)]">No runs yet. Start one above.</td></tr>}
              {runs.slice(0, 25).map((p) => {
                const r = records.get(p.id);
                return (
                  <tr key={p.id}>
                    <td className="mono whitespace-nowrap text-xs">{p.createdAt.slice(5, 10)} {p.createdAt.slice(11, 16)}</td>
                    <td><span className="font-medium">{p.title.replace("Live run, ", "")}</span><span className="block text-xs text-[var(--ink-2)]">{p.template === "team-bus" ? "team bus template" : p.port === "sandbox" ? "PayPal sandbox" : "stand-in"}</span></td>
                    <td className="mono text-right">{r?.n ?? ""}</td>
                    <td className="mono text-right">{r?.reconciled ? usd(r.reconciled.netCharged) : "-"}</td>
                    <td className="mono text-right">{r?.reconciled ? usd(r.reconciled.vendorsDue) : "-"}</td>
                    <td className="text-xs">{r?.payout?.batchId ? <><span className="mono">{r.payout.batchId}</span><span className={`block ${r.payout.status === "SUCCESS" ? "text-[var(--settled)]" : r.payout.status === "DENIED" ? "text-[#b42318]" : "text-[var(--ink-2)]"}`}>{r.payout.status}</span></> : <span className="text-[var(--ink-2)]">none</span>}</td>
                    <td><span className={`stamp stamp-${TONE[p.state] ?? "released"}`}>{p.state.replace("_", " ")}</span></td>
                    <td className="whitespace-nowrap text-right text-sm">
                      <Link className="link-quiet" href={`/register?pool=${p.id}`}>Register</Link>
                      <Link className="link-quiet ml-3" href={`/proof/${p.id}`}>Proof</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
