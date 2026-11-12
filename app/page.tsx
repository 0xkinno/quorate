import Link from "next/link";
import facts from "@/docs/FACTS.json";
import { HeroArt } from "@/components/HeroArt";
import { GlowCard } from "@/components/GlowCard";
import { Mark } from "@/components/Mark";
import { CountUp, Float, Headline, Reveal } from "@/components/motion/Reveal";
import { CloseReel } from "@/components/motion/CloseReel";
import { PriceBars } from "@/components/motion/PriceBars";
import { allocate, worstCaseShare } from "@/src/bursar/allocate";

const steps = [
  ["01", "The slip goes home", "Each family gets a slip in their own language: the trip, the date, and the most it can ever cost."],
  ["02", "PayPal holds the worst case", "The family approves a hold of $88.00 on PayPal. Nothing is charged. The hold is renewed so its guarantee covers the close."],
  ["03", "The price falls as children join", "At 18 children the share is $88.00. At 20 it is $80.00. At 26 it is $63.38. Everyone watches it fall."],
  ["04", "The close", "Each family is charged the real share, the rest of every hold is released, and the coach and museum are paid in one PayPal payout."],
];
const PRIMITIVES = ["Orders v2 intent: AUTHORIZE", "final_capture: false", "void the remainder", "reauthorize after the honor period", "PayPal-Mock-Response", "Payouts, one batch", "Vault v3 saved wallet", "Invoicing record-payment", "verify-webhook-signature", "Agent Toolkit, read-only", "PayPal Server SDK"];

export default function Home() {
  const curve = [18, 20, 22, 24, 26].map((n) => {
    const p = allocate(144_000, 800, Array.from({ length: n }, (_, i) => ({ id: `k${i}`, role: "child" as const, seq: i, capCents: worstCaseShare(144_000, 800, 18) })));
    return { n, share: p.ok ? p.level : 0 };
  });
  const L = facts.liveRuns;
  return (
    <main className="overflow-x-clip">
      <section className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 md:pt-24">
        <div aria-hidden className="hero-aura" />
        <div className="relative grid items-center gap-12 md:grid-cols-[1.05fr_1fr]">
          <div>
            <Reveal><p className="eyebrow"><span className="eyebrow-dot" />Class trips, paid together, on PayPal</p></Reveal>
            <Headline text="Nobody fronts the money." className="display mt-5 text-[3.1rem] leading-[0.98] tracking-[-0.035em] sm:text-[4.2rem] lg:text-[4.6rem]" />
            <Reveal delay={0.5}>
              <p className="lede mt-7 max-w-xl">
                A teacher usually pays for the bus on her own card, then chases twenty-six families for weeks. Quorate lets each family&apos;s PayPal
                hold their child&apos;s share instead. Nobody is charged until enough children are going, and every family pays less with each child who joins.
              </p>
            </Reveal>
            <Reveal delay={0.65}>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/judge" className="btn btn-primary btn-lg">Open the demo trip</Link>
                <a href="#reel" className="btn btn-ghost btn-lg">Watch a close</a>
              </div>
            </Reveal>
            <Reveal delay={0.8}>
              <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t rule pt-6">
                <div><dt className="caps">Live sandbox runs</dt><dd className="stat mt-1"><CountUp to={L.recorded} /></dd></div>
                <div><dt className="caps">Real holds</dt><dd className="stat mt-1"><CountUp to={L.holdsPlaced} /></dd></div>
                <div><dt className="caps">Cents off</dt><dd className="stat mt-1 text-[var(--settled)]"><CountUp to={L.centsOff} /></dd></div>
              </dl>
            </Reveal>
          </div>
          <Reveal delay={0.3} y={40}><Float amp={6}><HeroArt /></Float></Reveal>
        </div>
      </section>

      <div className="marquee border-y rule" aria-label="PayPal features Quorate uses">
        <div className="marquee-track">
          {[...PRIMITIVES, ...PRIMITIVES].map((p, i) => <span key={i} className="marquee-item"><span className="text-[var(--held)]">&#9679;</span>{p}</span>)}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4">
        <section className="py-24" aria-labelledby="moment">
          <Reveal><p className="caps">01 · The moment</p></Reveal>
          <Reveal delay={0.05}><h2 id="moment" className="h2 mt-3">Thursday, 3:10pm.</h2></Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              <>Ms. Rivera (demo), 4th grade, holds a coach quote: <span className="num">$1,440</span>, confirm and pay by Friday noon or lose the date.</>,
              <>The museum is <span className="num">$8</span> a child. The trip runs with at least 18 children. 11 of 26 slips are back.</>,
              <>US teachers already spend an average of <span className="num">$895</span> a year of their own money on their classrooms. <a className="text-sm underline" href="https://www.adoptaclassroom.org/?p=117782">AdoptAClassroom.org, 2025</a></>,
            ].map((t, i) => <Reveal key={i} delay={0.1 * i}><p className="moment-card">{t}</p></Reveal>)}
          </div>
        </section>

        <section id="how" className="border-t rule py-24" aria-labelledby="how-h">
          <Reveal><p className="caps">02 · How it works</p></Reveal>
          <Reveal delay={0.05}><h2 id="how-h" className="h2 mt-3">Group payments without a group payer.</h2></Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(([n, t, d], i) => (
              <Reveal key={n} delay={0.08 * i}>
                <GlowCard className="h-full p-6">
                  <div className="mono text-sm text-[var(--held)]">{n}</div>
                  <h3 className="display mt-4 text-[1.35rem] leading-tight">{t}</h3>
                  <p className="mt-3 text-[0.95rem] leading-relaxed text-[var(--ink-2)]">{d}</p>
                </GlowCard>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.1}><PriceBars curve={curve} /></Reveal>
        </section>

        <section id="reel" className="border-t rule py-24" aria-labelledby="close-h">
          <div className="grid items-end gap-6 md:grid-cols-[1fr_auto]">
            <div>
              <Reveal><p className="caps">03 · The close</p></Reveal>
              <Reveal delay={0.05}><h2 id="close-h" className="h2 mt-3">PayPal declines a capture. The total is still exact.</h2></Reveal>
              <Reveal delay={0.1}><p className="lede mt-4 max-w-2xl">The same sequence ran live on the PayPal sandbox {L.closesSurvivingPayPalDecline} times: PayPal refused family 7, Quorate re-shared among 19, topped up from the same holds and paid the vendors exactly.</p></Reveal>
            </div>
            <Reveal delay={0.15}><Link href="/judge" className="btn btn-primary">Run it yourself</Link></Reveal>
          </div>
          <Reveal delay={0.1} className="mt-10"><CloseReel /></Reveal>
        </section>

        <section className="border-t rule py-24" aria-labelledby="wont-h">
          <Reveal><p className="caps">04 · What it will not do</p></Reveal>
          <Reveal delay={0.05}><h2 id="wont-h" className="h2 mt-3">Three refusals, written in code.</h2></Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ["Charge above what you approved", "Every capture passes a cap check first. PayPal itself accepted $80.00 on a $72.00 hold in our probe; Quorate refuses."],
              ["Charge anyone if the trip does not run", "Below 18 children, nothing is captured. The teacher chooses: wait, a sponsor covers the gap, or cancel."],
              ["Let the help agent move money", "The help desk reads orders, invoices and transactions. It holds no tool that captures, refunds or pays."],
            ].map(([t, d], i) => (
              <Reveal key={t} delay={0.08 * i}>
                <div className="card h-full p-6"><span className="stamp stamp-review">Refused</span><h3 className="display mt-4 text-[1.35rem] leading-tight">{t}</h3><p className="mt-3 text-[0.95rem] leading-relaxed text-[var(--ink-2)]">{d}</p></div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="border-t rule py-24" aria-labelledby="proof-h">
          <Reveal><p className="caps">05 · Measured</p></Reveal>
          <Reveal delay={0.05}><h2 id="proof-h" className="h2 mt-3">Counted from recorded runs.</h2></Reveal>
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              ["Closes exact to the cent", L.closedExact, "", 0],
              ["PayPal declines survived", L.closesSurvivingPayPalDecline, "", 0],
              ["Settled on the sandbox", L.dollarsSettled, "$", 0],
              ["Families above what they approved", L.familiesAboveApprovedAmount, "", 0],
            ].map(([k, v, pre], i) => (
              <Reveal key={k as string} delay={0.08 * i}>
                <div className="card h-full p-6"><div className="stat-lg"><CountUp to={v as number} prefix={pre as string} /></div><div className="mt-2 text-sm text-[var(--ink-2)]">{k}</div></div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.1}><p className="mt-4 text-sm text-[var(--ink-2)]">From <a className="underline" href="https://github.com/0xkinno/quorate/blob/main/docs/FACTS.json">docs/FACTS.json</a>, generated from the run records. Every run has a public proof page.</p></Reveal>
        </section>
      </div>

      <section className="cta-band">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-4 py-20 md:flex-row md:items-center">
          <Reveal>
            <div className="flex items-center gap-5">
              <Mark size={64} />
              <div>
                <p className="display text-3xl leading-tight text-white sm:text-4xl">Teachers stop fronting. Families pay less, together.</p>
                <p className="mt-2 text-white/70">Twenty holds, one decline, one exact close: about two minutes on the PayPal sandbox.</p>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1}><Link href="/judge" className="btn btn-lg bg-white text-[var(--ink)] hover:bg-white/90">Open the judge door</Link></Reveal>
        </div>
      </section>
    </main>
  );
}
