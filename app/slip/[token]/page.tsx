import { notFound } from "next/navigation";
import { memberByToken } from "@/src/pool/service";
import { slipText } from "@/src/crew/slip";
import { SlipActions } from "./SlipActions";

export const dynamic = "force-dynamic";

export default async function Slip({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { token } = await params;
  const sp = await searchParams;
  const f = await memberByToken(token);
  if (!f) notFound();
  const lang = (sp.lang ?? f.member.lang) as "en" | "es" | "vi";
  const t = slipText(lang, { child: f.member.child, capCents: f.member.capCents, minN: f.pool.minN, closeAt: f.pool.closeAt, school: f.pool.school });
  return (
    <main className="mx-auto max-w-md px-4 pt-10" lang={lang}>
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <p className="caps">{t.label}</p>
          <nav aria-label="Language" className="flex gap-1 text-xs">
            {(["en", "es", "vi"] as const).map((l) => <a key={l} href={`?lang=${l}`} className={`rounded px-2 py-1 ${l === lang ? "bg-[var(--ink)] text-white" : "border rule"}`}>{l.toUpperCase()}</a>)}
          </nav>
        </div>
        <h1 className="display mt-4 text-3xl">{t.title}</h1>
        <p className="mt-2 text-[var(--ink-2)]">{t.who}</p>
        <div className="mt-6 rounded-xl border rule bg-white/70 p-4">
          <div className="mono text-3xl font-semibold text-[var(--held)]">{t.amount}</div>
          <p className="mt-2 text-sm">{t.promise}</p>
        </div>
        <p className="mt-4 text-sm text-[var(--ink-2)]">{t.when}</p>
        <SlipActions token={token} state={f.member.state} clientId={process.env.PAYPAL_CLIENT_ID ?? ""} labels={{ held: t.held, guaranteed: t.guaranteed, error: t.error }} honorUntil={f.member.honorUntil ?? null} />
        <p className="mt-6 text-xs text-[var(--ink-2)]">PayPal sandbox. No real money moves. Demo family.</p>
      </div>
    </main>
  );
}
