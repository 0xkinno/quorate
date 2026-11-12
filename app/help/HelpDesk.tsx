"use client";
import { useState } from "react";

const SUGGESTED = [
  "Why is my hold $88.00 if the trip costs less?",
  "How much was each family charged, and were the vendors paid exactly?",
  "¿Cuándo se libera el resto de mi retención?",
  "Can you refund me $20 now?",
];

type Read = { quote: { vendors: { name: string; fixedCents: number; perHeadCents: number; quote: string }[] }; check: { verdict: string; issues: string[] }; model: string };

export function HelpDesk({ poolId, demoQuote }: { poolId?: string; demoQuote: string }) {
  const [q, setQ] = useState("");
  const [log, setLog] = useState<{ q: string; a: string; tools: string[]; model: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState(demoQuote);
  const [read, setRead] = useState<Read | null>(null);

  async function ask(text: string) {
    setBusy(true);
    const r = await fetch("/api/help", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: text, poolId }) });
    const j = await r.json();
    setLog((l) => [...l, { q: text, a: j.answer ?? j.error, tools: j.tools ?? [], model: j.model ?? "" }]);
    setBusy(false);
    setQ("");
  }
  async function readIt() {
    setBusy(true);
    const r = await fetch("/api/read-quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: quote }) });
    const j = await r.json();
    setRead(j.quote ? j : null);
    setBusy(false);
  }

  return (
    <div className="mt-8 space-y-8">
      <section className="card p-5" aria-label="Ask the help desk">
        <div className="flex flex-wrap gap-2">
          {SUGGESTED.map((s) => (
            <button key={s} className="rounded-lg border rule bg-white/70 px-3 py-1.5 text-left text-sm" onClick={() => ask(s)} disabled={busy}>{s}</button>
          ))}
        </div>
        <ol className="mt-5 space-y-4" aria-live="polite">
          {log.map((m, i) => (
            <li key={i}>
              <p className="font-medium">{m.q}</p>
              <p className="mt-1 whitespace-pre-wrap text-[var(--ink-2)]">{m.a}</p>
              <p className="mono mt-1 text-[11px] text-[var(--ink-2)]">{m.model}{m.tools.length ? ` · tools: ${m.tools.join(", ")}` : ""}</p>
            </li>
          ))}
        </ol>
        <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (q.trim()) ask(q.trim()); }}>
          <label htmlFor="q" className="sr-only">Your question</label>
          <input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask in English, Spanish or Vietnamese" className="min-w-0 flex-1 rounded-lg border rule bg-white px-3 py-2" />
          <button className="btn btn-primary" disabled={busy}>{busy ? "Thinking" : "Ask"}</button>
        </form>
      </section>

      <section className="card p-5" aria-label="Read a vendor quote">
        <h2 className="display text-2xl">The Reader: a vendor quote into numbers</h2>
        <p className="mt-1 text-sm text-[var(--ink-2)]">
          The model returns each amount with the exact words it came from. Code keeps an amount only if those words are in the quote and
          contain that number; anything else goes to the teacher.
        </p>
        <label htmlFor="quote" className="sr-only">Vendor quote</label>
        <textarea id="quote" className="mono mt-3 h-36 w-full rounded-lg border rule bg-white p-3 text-xs" value={quote} onChange={(e) => setQuote(e.target.value)} />
        <button className="btn btn-ghost mt-2" onClick={readIt} disabled={busy}>Read the quote</button>
        {read && (
          <div className="mt-3 text-sm">
            <p>
              <span className={`stamp ${read.check.verdict === "OK" ? "stamp-settled" : "stamp-review"}`}>{read.check.verdict === "OK" ? "CHECKED" : "REVIEW"}</span>{" "}
              <span className="mono text-xs">{read.model}</span>
            </p>
            <ul className="mt-2 space-y-1">
              {read.quote.vendors.map((v) => (
                <li key={v.name}><strong>{v.name}</strong>: <span className="mono">${((v.fixedCents || v.perHeadCents) / 100).toFixed(2)}{v.perHeadCents ? " per child" : ""}</span> from &ldquo;{v.quote}&rdquo;</li>
              ))}
            </ul>
            {read.check.issues.map((i) => <p key={i} className="text-[var(--review)]">{i}</p>)}
          </div>
        )}
      </section>
    </div>
  );
}
