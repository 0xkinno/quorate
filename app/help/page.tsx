import { listPools } from "@/src/pool/service";
import { HelpDesk } from "./HelpDesk";
import { DEMO_QUOTE } from "@/src/crew/reader";

export const dynamic = "force-dynamic";

export default async function Help() {
  const runs = await listPools("live-run");
  const latest = runs.find((p) => p.state === "CLOSED") ?? runs[0];
  return (
    <main className="mx-auto max-w-3xl px-4 pt-12">
      <p className="caps">Help desk · Gemini with read-only PayPal tools</p>
      <h1 className="display mt-3 text-4xl">Ask about a trip.</h1>
      <p className="mt-3 text-[var(--ink-2)]">
        The help desk reads the trip and PayPal orders, invoices and transactions through the PayPal Agent Toolkit. It holds no
        tool that charges, refunds or pays: the teacher decides those in The Register.
      </p>
      <HelpDesk poolId={latest?.id} demoQuote={DEMO_QUOTE} />
    </main>
  );
}
