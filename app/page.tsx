import Link from "next/link";
import { HeroArt } from "@/components/HeroArt";
import { GlowCard } from "@/components/GlowCard";
import { stats } from "@/src/pool/stats";
import { allocate, worstCaseShare } from "@/src/bursar/allocate";
import { toAmount } from "@/src/paypal/types";

export const dynamic = "force-dynamic";

const steps = [
  ["01", "The slip goes home", "Each family gets a slip in their own language: the trip, the date, and the most it can ever cost."],
  ["02", "PayPal holds the worst case", "The family approves a hold of $88.00 on PayPal. Nothing is charged. The hold is guaranteed and renewed so it covers the close."],
  ["03", "The price falls as children join", "At 18 children the share is $88.00. At 20 it is $80.00. At 26 it is $63.38. Everyone sees it fall."],
  ["04", "The close", "Each family is charged the real share, the rest of every hold is released, and the coach and the museum are paid in one PayPal payout."],
];

export default async function Home() {
  const s = await stats().catch(() => null);
  const curve = [18, 20, 22, 24, 26].map((n) => {
    const p = allocate(144_000, 800, Array.from({ length: n }, (_, i) => ({ id: `k${i}`, role: "child" as const, seq: i, capCents: worstCaseShare(144_000, 800, 18) })));
    return { n, share: p.ok ? p.level : 0 };
  });
  return (
    <main className="mx-auto max-w-6xl px-4">
      <section className="grid items-center gap-12 pt-14 pb-20 md:grid-cols-[1.05fr_1fr] md:pt-24">
        <div className="rise">
          <p className="caps">Class trips, paid together</p>
          <h1 className="display mt-4 text-5xl leading-[1.02] sm:text-6xl md:text-7xl">Nobody fronts the money.</h1>
          <p className="mt-6 max-w-xl text-lg text-[var(--ink-2)]">
            A teacher usually pays for the bus on her own card, then chases twenty-six families for weeks. Quorate lets each
            family&apos;s PayPal hold their child&apos;s share instead. Nobody is charged until enough children are going, and every family pays less with each child who joins.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/judge" className="btn btn-primary">Open the demo trip</Link>
            <a href="#how" className="btn btn-ghost">How the hold works</a>
          </div>
        </div>
        <HeroArt />
      </section>

      <section className="border-t rule py-16" aria-labelledby="moment">
        <p className="caps">01 · The moment</p>
        <h2 id="moment" className="display mt-3 text-3xl sm:text-4xl">Thursday, 3:10pm.</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <p className="text-lg">Ms. Rivera (demo), 4th grade, holds a coach quote: <span className="mono">$1,440</span>, confirm and pay by Friday noon or lose the date.</p>
          <p className="text-lg">The museum is <span className="mono">$8</span> per child. The trip runs with at least 18 children. 11 of 26 slips are back.</p>
          <p className="text-lg">Teachers in the US already spend an average of <span className="mono">$895</span> a year of their own money on their classrooms.{" "}
            <a className="text-sm underline" href="https://www.adoptaclassroom.org/?p=117782">AdoptAClassroom.org, 2025</a></p>
        </div>
      </section>

      <section id="how" className="border-t rule py-16" aria-labelledby="how-h">
        <p className="caps">02 · How it works</p>
        <h2 id="how-h" className="display mt-3 text-3xl sm:text-4xl">Group payments without a group payer.</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([n, t, d]) => (
            <GlowCard key={n} className="p-6">
              <div className="mono text-sm text-[var(--held)]">{n}</div>
              <h3 className="display mt-3 text-xl">{t}</h3>
              <p className="mt-2 text-[var(--ink-2)]">{d}</p>
            </GlowCard>
          ))}
        </div>
        <div className="card mt-6 p-6">
          <p className="caps">Price per child as children join (coach $1,440 + museum $8 each)</p>
          <div className="mt-4 grid grid-cols-5 items-end gap-2" role="list">
            {curve.map((c) => (
              <div key={c.n} role="listitem" className="text-center">
                <div className="mx-auto w-full max-w-16 rounded-t-md bg-[var(--held)]" style={{ height: `${Math.round((c.share / 8800) * 120)}px`, opacity: 0.35 + (c.n - 18) / 16 }} />
                <div className="mono mt-2 text-sm font-semibold">${toAmount(c.share)}</div>
                <div className="text-xs text-[var(--ink-2)]">{c.n} children</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t rule py-16" aria-labelledby="close-h">
        <p className="caps">03 · The close, live</p>
        <h2 id="close-h" className="display mt-3 text-3xl sm:text-4xl">PayPal declines a capture. The total is still exact.</h2>
        <p className="mt-4 max-w-2xl text-lg text-[var(--ink-2)]">
          On the judge page, one button holds $88.00 for each of 20 families on the PayPal sandbox and closes the trip. PayPal is told to
          decline family 7&apos;s capture. Quorate re-shares among 19, tops up the families already captured from their own holds, releases
          the rest, and pays the vendors exactly.
        </p>
        <Link href="/judge" className="btn btn-primary mt-6">Run it on the judge page</Link>
      </section>

      <section className="border-t rule py-16" aria-labelledby="wont-h">
        <p className="caps">04 · What it will not do</p>
        <h2 id="wont-h" className="display mt-3 text-3xl sm:text-4xl">Three refusals, written in code.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Charge above what you approved", "Every capture passes a cap check first, even though PayPal would accept up to 115%."],
            ["Charge anyone if the trip does not run", "Below 18 children, nothing is captured. The teacher chooses: wait, a sponsor covers the gap, or cancel."],
            ["Let the help agent move money", "The help desk can read orders and transactions. It holds no tool that captures, refunds or pays."],
          ].map(([t, d]) => (
            <div key={t} className="card p-6"><span className="stamp stamp-review">Refused</span><h3 className="display mt-3 text-xl">{t}</h3><p className="mt-2 text-[var(--ink-2)]">{d}</p></div>
          ))}
        </div>
      </section>

      <section className="border-t rule py-16" aria-labelledby="proof-h">
        <p className="caps">05 · Measured</p>
        <h2 id="proof-h" className="display mt-3 text-3xl sm:text-4xl">Counted from recorded runs.</h2>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            ["Sandbox closes", s?.sandbox.closes ?? 0],
            ["PayPal declines survived", s?.sandbox.declinesSurvived ?? 0],
            ["Holds placed on the sandbox", s?.sandbox.holds ?? 0],
            ["Cents off across all closes", (s?.sandbox.centsOff ?? 0) + (s?.standin.centsOff ?? 0)],
          ].map(([k, v]) => (
            <div key={k as string} className="card p-5"><div className="mono text-4xl font-semibold">{v as number}</div><div className="mt-1 text-sm text-[var(--ink-2)]">{k}</div></div>
          ))}
        </div>
        {s && s.standin.closes > 0 && <p className="mt-3 text-sm text-[var(--ink-2)]">Plus {s.standin.closes} closes on the PayPal stand-in, counted separately.</p>}
      </section>
    </main>
  );
}
