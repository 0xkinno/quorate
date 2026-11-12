import Link from "next/link";
import { notFound } from "next/navigation";
import { getPool } from "@/src/pool/service";
import { db } from "@/src/db/store";
import { CopyChip } from "@/components/CopyChip";
import { Mark } from "@/components/Mark";

export const dynamic = "force-dynamic";

const usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const TONE: Record<string, string> = { SETTLED: "settled", CLOSED: "settled", HELD: "held", CLOSING: "held", HOLDING: "held", DECLINED: "declined", FAILED: "declined", REVIEW: "review", NEEDS_TEACHER: "review", CAPTURED_PART: "review", RELEASED: "released", LAPSED: "released", INVITED: "released", OPEN: "held" };
const stamp = (s: string) => <span className={`stamp stamp-${TONE[s] ?? "released"}`}>{s.replace("_", " ")}</span>;

function stepTone(s: string) {
  if (/declined|refused|died/i.test(s)) return "bg-[#b42318]";
  if (/top-up|re-shar|New share|refunded|cash back/i.test(s)) return "bg-[var(--review)]";
  if (/exact|Payout batch|Payout retried/i.test(s)) return "bg-[var(--settled)]";
  return "bg-[var(--held)]";
}

export default async function Proof({ params }: { params: Promise<{ poolId: string }> }) {
  const { poolId } = await params;
  const v = await getPool(poolId);
  if (!v) notFound();
  const events = await db().list<{ id: string; type: string; resourceId?: string; at: string }>("event", poolId);
  const r = v.close?.reconciled;
  const out = new Map((v.close?.members ?? []).map((m) => [m.id, m]));
  const held = v.members.filter((m) => m.authId).reduce((s, m) => s + m.capCents, 0);
  const charged = r?.netCharged ?? 0;
  const released = held - charged;
  const attempts = [...v.attempts].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const failedCalls = attempts.filter((a) => a.result && !a.result.ok).length;
  const declined = (v.close?.members ?? []).filter((m) => m.status === "DECLINED").length;
  const created = new Date(v.pool.createdAt);
  const recorded = (v.pool as { recorded?: boolean }).recorded;

  return (
    <main className="mx-auto max-w-6xl px-4 pt-10">
      <nav aria-label="Breadcrumb" className="text-sm text-[var(--ink-2)]">
        <Link href="/judge" className="hover:underline">Judge door</Link> <span aria-hidden>/</span>{" "}
        <Link href={`/register?pool=${v.pool.id}`} className="hover:underline">The Register</Link> <span aria-hidden>/</span> <span>Proof</span>
      </nav>

      <header className="card mt-4 overflow-hidden p-0">
        <div className="relative px-6 py-7 sm:px-8">
          <div aria-hidden className="pointer-events-none absolute -bottom-24 right-40 hidden opacity-[0.05] md:block"><Mark size={240} /></div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="caps">Proof of a {v.pool.port === "sandbox" ? "PayPal sandbox" : "stand-in"} run</span>
            {recorded && <span className="pill">recorded live run</span>}
            <span className="pill">{created.toISOString().slice(0, 10)} {created.toISOString().slice(11, 16)} UTC</span>
          </div>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="display text-[2rem] leading-[1.05] tracking-[-0.028em] sm:text-[2.8rem]">{v.pool.title}</h1>
              <p className="mt-2 text-[var(--ink-2)]">{v.pool.school} · {v.pool.teacher} · minimum {v.pool.minN} children</p>
            </div>
            <div className="scale-125 origin-bottom-right">{stamp(v.pool.state)}</div>
          </div>
          {v.pool.note && <p className="mt-4 rounded-lg border border-[color:var(--review)]/30 bg-[#fffaf0] px-4 py-3 text-sm">{v.pool.note}</p>}
        </div>
        <div className="grid border-t rule sm:grid-cols-3">
          <p className="px-6 py-3 text-sm sm:px-8"><span className="caps block">Holds placed by</span>{v.pool.holdSource === "saved-wallet" ? "a sandbox buyer's saved PayPal wallet, approved once" : v.pool.holdSource === "paypal-login" ? "each family on PayPal" : v.pool.holdSource}</p>
          <p className="border-t rule px-6 py-3 text-sm sm:border-l sm:border-t-0"><span className="caps block">Decline</span>{v.pool.decline ? `PayPal told to refuse ${v.pool.decline === "m07" ? "family 7" : v.pool.decline} (sandbox negative testing)` : "none requested"}</p>
          <p className="border-t rule px-6 py-3 text-sm sm:border-l sm:border-t-0"><span className="caps block">Raw record</span><a className="text-[var(--held)] underline" href={`/api/pools/${v.pool.id}`}>JSON of this run</a></p>
        </div>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav aria-label="On this page" className="sticky top-24 space-y-1 text-sm">
            <p className="caps mb-2">On this page</p>
            {[["money", "The money"], ["payout", "Payout"], ["timeline", "The close"], ["holds", "Every hold"], ["attempts", "Attempt log"], ["webhooks", "Webhooks"]].map(([id, t]) => (
              <a key={id} href={`#${id}`} className="block rounded-md px-2 py-1.5 text-[var(--ink-2)] hover:bg-white/70 hover:text-[var(--ink)]">{t}</a>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 space-y-10">
          <section id="money" aria-labelledby="money-h" className="scroll-mt-24">
            <h2 id="money-h" className="section-h">The money</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ["Families charged", r ? usd(r.netCharged) : "nothing", "captures minus refunds"],
                ["Vendors due", r ? usd(r.vendorsDue) : "nothing", "coach and museum"],
                ["Difference", r ? usd(Math.abs(r.vendorsDue - r.netCharged)) : "n/a", r?.exact ? "exact to the cent" : "no close"],
                ["PayPal calls", String(attempts.length), `${failedCalls} refused by PayPal, ${declined} family declined`],
              ].map(([k, val, sub], i) => (
                <div key={k} className={`card p-5 ${i === 2 && r?.exact ? "ring-1 ring-[color:var(--settled)]/40" : ""}`}>
                  <p className="caps">{k}</p>
                  <p className={`kpi-fine mt-2 ${i === 2 && r?.exact ? "text-[var(--settled)]" : ""}`}>{val}</p>
                  <p className="mt-1 text-xs text-[var(--ink-2)]">{sub}</p>
                </div>
              ))}
            </div>
            {held > 0 && (
              <div className="card mt-3 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="caps">Held on PayPal, then settled</p>
                  <p className="mono text-sm text-[var(--ink-2)]">{usd(held)} held</p>
                </div>
                <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-black/5" role="img" aria-label={`${usd(charged)} charged and ${usd(released)} released of ${usd(held)} held`}>
                  <span className="h-full bg-[var(--settled)]" style={{ width: `${(charged / held) * 100}%` }} />
                  <span className="h-full bg-[var(--released)]/50" style={{ width: `${(released / held) * 100}%` }} />
                </div>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[var(--settled)]" />Charged <span className="mono">{usd(charged)}</span></span>
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[var(--released)]/60" />Released to families <span className="mono">{usd(released)}</span></span>
                </div>
              </div>
            )}
          </section>

          <section id="payout" aria-labelledby="payout-h" className="scroll-mt-24">
            <h2 id="payout-h" className="section-h">Payout</h2>
            {v.close?.payout ? (
              <div className="card mt-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {v.close.payout.batchId ? <CopyChip value={v.close.payout.batchId} label="payout batch" short={20} /> : <span className="pill">no batch</span>}
                    <span className="mono text-xs text-[var(--ink-2)]">{v.close.payout.senderBatchId}</span>
                  </div>
                  {stamp(v.close.payout.status.startsWith("REFUSED") ? "REVIEW" : v.close.payout.status === "SUCCESS" ? "SETTLED" : v.close.payout.status === "DENIED" ? "DECLINED" : "HELD")}
                </div>
                <p className="mt-1 text-xs text-[var(--ink-2)]">PayPal status: {v.close.payout.status}</p>
                <ul className="mt-4 divide-y rule border-t rule">
                  {v.close.payout.items.map((i) => (
                    <li key={i.senderItemId} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <span><span className="font-medium">{i.note.split(":")[0]}</span><span className="block text-xs text-[var(--ink-2)]">{i.receiver}</span></span>
                      <span className="mono text-lg font-semibold">{usd(i.cents)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : <p className="empty mt-4">No payout: this run did not reach the vendors{v.pool.state === "LAPSED" ? " because the trip did not reach its minimum, so nobody was charged." : "."}</p>}
          </section>

          <section id="timeline" aria-labelledby="timeline-h" className="scroll-mt-24">
            <h2 id="timeline-h" className="section-h">The close, step by step</h2>
            {(v.close?.steps ?? []).length ? (
              <ol className="card mt-4 max-h-[30rem] overflow-auto p-5" tabIndex={0} aria-label="Steps of the close">
                {v.close!.steps.map((s, i) => (
                  <li key={i} className="relative flex gap-3 pb-3 pl-1 last:pb-0">
                    <span aria-hidden className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${stepTone(s)}`} />
                    <span className={`text-sm leading-relaxed ${/declined|refused/i.test(s) ? "text-[#b42318]" : ""}`}>{s}</span>
                  </li>
                ))}
              </ol>
            ) : <p className="empty mt-4">The close has not run yet.</p>}
          </section>

          <section id="holds" aria-labelledby="holds-h" className="scroll-mt-24">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="holds-h" className="section-h">Every hold</h2>
              <p className="text-sm text-[var(--ink-2)]">{v.members.filter((m) => m.authId).length} holds · verdicts read back from PayPal</p>
            </div>
            <div className="card mt-4 overflow-x-auto p-0" tabIndex={0} role="region" aria-label="Every hold">
              <table className="ledger w-full min-w-[760px]">
                <thead><tr><th>Family</th><th className="text-right">Approved</th><th className="text-right">Charged</th><th className="text-right">Released</th><th>Status</th><th>PayPal ids</th></tr></thead>
                <tbody>
                  {v.members.map((m) => {
                    const o = out.get(m.id);
                    return (
                      <tr key={m.id}>
                        <td className="whitespace-nowrap"><span className="font-medium">{m.child}</span><span className="block text-xs text-[var(--ink-2)]">{m.family}</span><span className="mt-0.5 block text-[10px] tracking-[0.12em] text-[var(--ink-2)]">{o?.verdict ?? (m.authId ? "OBSERVED" : "NOT OBSERVED")}</span></td>
                        <td className="mono text-right">{usd(m.capCents)}</td>
                        <td className="mono text-right">{o ? usd(o.chargedCents) : ""}</td>
                        <td className="mono text-right text-[var(--ink-2)]">{o ? usd(o.releasedCents) : ""}</td>
                        <td>{stamp(o?.status ?? m.state)}{o?.note ? <span className="mt-1 block max-w-[14rem] text-xs text-[var(--ink-2)]">{o.note.slice(0, 80)}</span> : null}</td>
                        <td><div className="flex flex-col items-start gap-1">
                          {m.authId && <span className="flex items-center gap-2"><span className="w-14 text-[10px] uppercase tracking-[0.12em] text-[var(--ink-2)]">hold</span><CopyChip value={m.authId} label="authorization" short={12} /></span>}
                          {o?.captures.map((c) => <span key={c.captureId} className="flex items-center gap-2"><span className="w-14 text-[10px] uppercase tracking-[0.12em] text-[var(--ink-2)]">capture</span><CopyChip value={c.captureId} label="capture" short={12} /><span className="mono text-xs">{usd(c.cents)}</span></span>)}
                          {o?.refunds.map((x) => <span key={x.refundId} className="flex items-center gap-2"><span className="w-14 text-[10px] uppercase tracking-[0.12em] text-[var(--review)]">refund</span><CopyChip value={x.refundId} label="refund" short={12} /><span className="mono text-xs text-[var(--review)]">{usd(x.cents)}</span></span>)}
                        </div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section id="attempts" aria-labelledby="attempts-h" className="scroll-mt-24">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="attempts-h" className="section-h">Attempt log</h2>
              <p className="text-sm text-[var(--ink-2)]">a row is written before every PayPal call; PayPal-Request-Id = sha256(pool:member:op:attempt)</p>
            </div>
            {attempts.length ? (
              <div className="card mt-4 max-h-[28rem] overflow-auto p-0" tabIndex={0} role="region" aria-label="Attempt log">
                <table className="ledger w-full min-w-[720px]">
                  <thead><tr><th>Time (UTC)</th><th>Call</th><th>For</th><th>Request id</th><th>Result</th></tr></thead>
                  <tbody>
                    {attempts.map((a) => (
                      <tr key={a.requestId}>
                        <td className="mono text-xs">{a.startedAt.slice(11, 23)}</td>
                        <td><span className="pill">{a.op}</span></td>
                        <td className="text-sm">{a.memberId ? (v.members.find((m) => m.id === a.memberId)?.child ?? a.memberId) : "vendors"}</td>
                        <td className="mono text-xs text-[var(--ink-2)]">{a.requestId.slice(0, 16)}</td>
                        <td>{a.result ? (a.result.ok ? <span className="text-sm text-[var(--settled)]">ok</span> : <span className="text-sm text-[#b42318]">{a.result.error.split(" debug")[0].slice(0, 60)}</span>) : <span className="text-sm text-[var(--review)]">no result</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="empty mt-4">No PayPal calls were needed for this run.</p>}
          </section>

          <section id="webhooks" aria-labelledby="webhooks-h" className="scroll-mt-24">
            <h2 id="webhooks-h" className="section-h">Verified webhooks</h2>
            {events.length ? (
              <ul className="card mt-4 divide-y rule p-0">{events.map((e) => <li key={e.id} className="flex flex-wrap justify-between gap-2 px-5 py-3 text-sm"><span className="pill">{e.type}</span><span className="mono text-xs">{e.resourceId} · {e.at.slice(11, 19)}</span></li>)}</ul>
            ) : <p className="empty mt-4">No webhook recorded for this run. Webhooks are accepted only after PayPal&apos;s verify-webhook-signature returns SUCCESS, and only on the deployed URL they were registered for.</p>}
          </section>

          <div className="flex flex-wrap gap-3 pb-4">
            <Link href={`/register?pool=${v.pool.id}`} className="btn btn-ghost">Open in The Register</Link>
            <Link href="/judge" className="btn btn-primary">Back to the judge door</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
