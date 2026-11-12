import Link from "next/link";
import { listPools, classPool } from "@/src/pool/service";
import { measure } from "@/src/status";
import { RunButtons } from "./RunButtons";

export const dynamic = "force-dynamic";

export default async function Judge() {
  const [runs, cls, status] = await Promise.all([listPools("live-run"), classPool(), measure()]);
  const buyer = process.env.DEMO_BUYER_EMAIL;
  return (
    <main className="mx-auto max-w-4xl px-4 pt-14">
      <p className="caps">For judges · 60 seconds</p>
      <h1 className="display mt-3 text-4xl sm:text-5xl">Close a class trip on the PayPal sandbox.</h1>
      <p className="mt-4 text-lg text-[var(--ink-2)]">
        Payments right now: <strong>{status.payments === "sandbox" ? "PayPal sandbox" : "PayPal stand-in"}</strong>
        {status.probes.paypal.ok ? `, token checked at ${status.probes.paypal.at.slice(11, 19)} UTC` : ` (${status.probes.paypal.detail})`}.
      </p>

      <ol className="mt-10 space-y-6">
        <li className="card p-6">
          <div className="mono text-sm text-[var(--held)]">01</div>
          <h2 className="display mt-2 text-2xl">Run a close where PayPal declines a capture</h2>
          <p className="mt-2 text-[var(--ink-2)]">Twenty families each hold $88.00. Quorate closes the trip. The PayPal-Mock-Response header makes PayPal decline family 7. Watch the register re-share, top up and release, then check the totals.</p>
          <RunButtons />
        </li>
        <li className="card p-6">
          <div className="mono text-sm text-[var(--held)]">02</div>
          <h2 className="display mt-2 text-2xl">Approve a hold yourself, as a parent</h2>
          <p className="mt-2 text-[var(--ink-2)]">Open a slip from the class register and approve it with the PayPal sandbox buyer below. The row flips to HELD with its guarantee date.</p>
          {buyer && (
            <p className="mono mt-3 rounded-lg bg-white/70 p-3 text-sm">Sandbox buyer: {buyer}<br />Password: {process.env.DEMO_BUYER_PASSWORD}</p>
          )}
          <Link href={`/register?pool=${cls.id}`} className="btn btn-ghost mt-4">Open the class register</Link>
        </li>
        <li className="card p-6">
          <div className="mono text-sm text-[var(--held)]">03</div>
          <h2 className="display mt-2 text-2xl">Check every PayPal id</h2>
          <p className="mt-2 text-[var(--ink-2)]">Each run has a public proof page: authorization, capture, refund and payout ids, and the attempt log written before every PayPal call.</p>
        </li>
      </ol>

      <section className="mt-12">
        <h2 className="caps">Recorded runs</h2>
        <ul className="mt-4 divide-y rule border-y rule">
          {runs.length === 0 && <li className="py-4 text-[var(--ink-2)]">No runs yet. Start one above.</li>}
          {runs.slice(0, 12).map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <span><span className="mono">{p.createdAt.slice(0, 16).replace("T", " ")} UTC</span> · {p.title} · <span className={p.port === "sandbox" ? "text-[var(--held)]" : ""}>{p.port === "sandbox" ? "PayPal sandbox" : "stand-in"}</span></span>
              <span className="flex gap-3">
                <span className={`stamp ${p.state === "CLOSED" ? "stamp-settled" : p.state === "FAILED" ? "stamp-declined" : "stamp-held"}`}>{p.state}</span>
                <Link className="underline" href={`/register?pool=${p.id}`}>Register</Link>
                <Link className="underline" href={`/proof/${p.id}`}>Proof</Link>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
