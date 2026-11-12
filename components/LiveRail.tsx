import Link from "next/link";

/** Step rail for a live run: says in plain words which PayPal step is happening, from the run's own record. */
type Props = {
  poolId: string; state: string; decline: boolean; total: number; held: number; minN: number;
  steps: string[]; charged?: number; vendors?: number; exact?: boolean; note?: string;
};
const usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function LiveRail(p: Props) {
  const has = (s: string) => p.steps.some((x) => x.includes(s));
  const captured = p.steps.filter((x) => /: captured/.test(x)).length;
  const declined = has("PayPal declined the capture");
  const closed = p.state === "CLOSED";
  const holdsDone = p.state !== "OPEN" && p.state !== "HOLDING";
  const stages = [
    { t: "Families approve holds", done: holdsDone },
    { t: "Read back every hold", done: closed || has("Read back") },
    { t: "Work out the share", done: closed || has("Share per child") },
    { t: "Capture each share", done: has("Charged ") || closed },
    { t: declined ? "PayPal declined family 7: re-shared" : p.decline ? "PayPal declines family 7" : "No decline this run", done: declined || (!p.decline && (closed || has("Charged "))), bad: declined, skip: !p.decline },
    { t: "Release the rest", done: closed || has("Charged ") },
    { t: "Pay the vendors", done: has("Payout batch") || closed },
  ];
  const final = ["CLOSED", "NEEDS_TEACHER", "FAILED", "LAPSED"].includes(p.state);
  const now = final ? -1 : stages.findIndex((s) => !s.done && !s.skip);

  let headline: string;
  if (closed) headline = p.charged !== undefined && p.vendors !== undefined ? `Closed. Families charged ${usd(p.charged)}, vendors paid ${usd(p.vendors)}${p.exact ? ": exact to the cent." : "."}` : "Closed.";
  else if (p.state === "FAILED") headline = `This run stopped: ${p.note ?? "see the steps on the right"}.`;
  else if (p.state === "LAPSED") headline = `Only ${p.held} of the ${p.minN} children needed: every hold was released and nobody was charged.`;
  else if (p.state === "NEEDS_TEACHER") headline = "The close needs the teacher: the families' holds cannot cover it, so nobody was charged.";
  else if (!holdsDone) headline = `Placing holds on PayPal: ${p.held} of ${p.total} families hold their worst case. Nobody is charged yet.`;
  else if (!has("Read back")) headline = `${p.held} children are going, the minimum is ${p.minN}. The close starts: Quorate reads every hold back from PayPal.`;
  else if (declined && !has("Charged ")) headline = "PayPal declined family 7. Quorate re-shares among the rest and tops up from the same holds.";
  else if (!has("Charged ")) headline = `Capturing each family's real share on PayPal: ${captured} so far. The rest of each hold stays untouched.`;
  else if (!has("Payout batch")) headline = "Every remainder is released. Paying the coach and museum in one PayPal payout.";
  else headline = "Payout sent. Finishing the record.";

  const watch = closed
    ? "Look at Charged and Released on each row, and the box on the right."
    : !holdsDone ? "Watch the Status column turn HELD, one family at a time." : "Watch Charged fill in and the steps on the right.";

  return (
    <section aria-label="What is happening in this run" className="card mt-6 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="caps flex w-full items-center gap-2 !text-[var(--held)] sm:w-auto">{final ? null : <span className="pulse-dot" />}{final ? "Live run, finished" : "Live on the PayPal sandbox"}</span>
        <p className="min-w-[14rem] flex-1 text-[0.98rem] font-medium leading-snug" aria-live="polite">{headline}</p>
        {closed && <Link href={`/proof/${p.poolId}`} className="btn btn-primary !py-2 text-sm">See every PayPal id</Link>}
      </div>
      <ol className="rail mt-4">
        {stages.map((s, i) => (
          <li key={s.t} className={`rail-step ${s.bad ? "bad" : s.done ? "done" : i === now ? "now" : ""} ${s.skip ? "skip" : ""}`}>
            <span className="n">{String(i + 1).padStart(2, "0")}{s.done && !s.bad ? " · done" : i === now ? " · now" : ""}</span>
            <span className="t">{s.t}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-sm text-[var(--ink-2)]">{watch}</p>
    </section>
  );
}
