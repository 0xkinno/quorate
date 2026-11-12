import Link from "next/link";
import { notFound } from "next/navigation";
import { getPool } from "@/src/pool/service";
import { db } from "@/src/db/store";

export const dynamic = "force-dynamic";
const usd = (c: number) => `$${(c / 100).toFixed(2)}`;

export default async function Proof({ params }: { params: Promise<{ poolId: string }> }) {
  const { poolId } = await params;
  const v = await getPool(poolId);
  if (!v) notFound();
  const events = await db().list<{ id: string; type: string; resourceId?: string; at: string }>("event", poolId);
  const r = v.close?.reconciled;
  return (
    <main className="mx-auto max-w-5xl px-4 pt-12">
      <p className="caps">Proof · {v.pool.port === "sandbox" ? "PayPal sandbox" : "PayPal stand-in"} · {v.pool.createdAt.slice(0, 16).replace("T", " ")} UTC</p>
      <h1 className="display mt-2 text-3xl sm:text-4xl">{v.pool.title}</h1>
      {v.pool.note && <p className="mt-2 text-[var(--review)]">{v.pool.note}</p>}
      {r && (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="card p-4"><div className="caps">Families charged</div><div className="mono text-2xl font-semibold">{usd(r.netCharged)}</div></div>
          <div className="card p-4"><div className="caps">Vendors paid</div><div className="mono text-2xl font-semibold">{usd(r.vendorsDue)}</div></div>
          <div className="card p-4"><div className="caps">Difference</div><div className="mono text-2xl font-semibold text-[var(--settled)]">{usd(Math.abs(r.vendorsDue - r.netCharged))}</div></div>
        </div>
      )}
      {v.close?.payout && <p className="mt-4">Payout batch <span className="mono">{v.close.payout.batchId}</span> ({v.close.payout.senderBatchId}): {v.close.payout.items.map((i) => `${i.note} ${usd(i.cents)}`).join("; ")}</p>}

      <h2 className="caps mt-10">Every hold</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead><tr className="border-b rule"><th className="py-2">Child</th><th>Approved</th><th>Charged</th><th>Released</th><th>Verdict</th><th>Authorization</th><th>Captures and refunds</th></tr></thead>
          <tbody>
            {v.members.map((m) => {
              const o = v.close?.members?.find((x) => x.id === m.id);
              return (
                <tr key={m.id} className="border-b rule align-top">
                  <td className="py-2">{m.child}</td><td className="mono">{usd(m.capCents)}</td><td className="mono">{o ? usd(o.chargedCents) : ""}</td>
                  <td className="mono">{o ? usd(o.releasedCents) : ""}</td><td>{o?.verdict ?? (m.authId ? "OBSERVED" : "NOT OBSERVED")}{o?.note ? <div className="text-xs text-[var(--ink-2)]">{o.note}</div> : null}</td>
                  <td className="mono text-xs">{m.authId}</td>
                  <td className="mono text-xs">{o?.captures.map((c) => <div key={c.captureId}>{c.captureId} {usd(c.cents)}</div>)}{o?.refunds.map((x) => <div key={x.refundId}>refund {x.refundId} {usd(x.cents)}</div>)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="caps mt-10">Attempt log ({v.attempts.length}), written before each PayPal call</h2>
      <ol className="mono mt-3 max-h-96 space-y-1 overflow-auto text-xs">
        {v.attempts.sort((a, b) => a.startedAt.localeCompare(b.startedAt)).map((a) => (
          <li key={a.requestId}>{a.startedAt.slice(11, 23)} {a.op} {a.memberId ?? "vendors"} id={a.requestId.slice(0, 12)} {a.result ? (a.result.ok ? "ok" : `failed: ${a.result.error.slice(0, 80)}`) : "no result yet"}</li>
        ))}
      </ol>

      <h2 className="caps mt-10">Verified webhooks ({events.length})</h2>
      <ul className="mono mt-3 text-xs">{events.map((e) => <li key={e.id}>{e.at.slice(11, 19)} {e.type} {e.resourceId}</li>)}</ul>
      <Link href={`/register?pool=${v.pool.id}`} className="btn btn-ghost mt-8">Back to the register</Link>
    </main>
  );
}
