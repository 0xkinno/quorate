"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Guided tour: six steps across the product. Space or Right for next, Left for back, Esc to close.
 *  The overlay is portalled to <body> so no header stacking context or hero art can cover or clip it. */
const STEPS = [
  { path: "/", sel: "h1", title: "The moment", body: "A teacher usually fronts the coach on her own card. Quorate lets each family's PayPal hold their child's share instead." },
  { path: "/", sel: "#how .grid", title: "The price falls as children join", body: "Every family approves the worst case, $88.00. Each child who joins lowers what everyone actually pays." },
  { path: "/judge", sel: "main ol > li", title: "Run it live", body: "One button holds $88.00 for 20 families on the PayPal sandbox and closes the trip, with PayPal declining family 7." },
  { path: "/register", sel: ".ag-root-wrapper", title: "The Register", body: "Each row is a real PayPal authorization: guaranteed until, the share if the trip ran now, charged, released, and every PayPal id." },
  { path: "/register", sel: "aside", title: "Exact to the cent", body: "The close re-shares after a decline, tops up from the same holds, releases the rest and pays the vendors exactly." },
  { path: "/help", sel: "main section", title: "The help desk", body: "Gemini answers parents using read-only PayPal Agent Toolkit tools. It cannot charge, refund or pay." },
];
const PAD = 10;

export function Tour() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const raw = params.get("tour");
  const step = raw === null ? -1 : Math.max(0, Math.min(STEPS.length - 1, Number(raw) - 1 || 0));
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [vh, setVh] = useState(800);
  const [mounted, setMounted] = useState(false);
  const render = params.get("render") === "1";
  useEffect(() => setMounted(true), []);

  const go = (i: number) => {
    setRect(null);
    if (i < 0 || i >= STEPS.length) { router.push(path); return; }
    router.push(`${STEPS[i].path}?tour=${i + 1}${render ? "&render=1" : ""}`);
  };

  useEffect(() => {
    if (step < 0) return;
    setRect(null);
    let scrolled = false;
    const find = () => {
      const el = document.querySelector(STEPS[step].sel);
      setVh(window.innerHeight);
      if (!el) return;
      if (!scrolled) {
        // keep the target in the upper part of the screen so the card below never covers it
        const r = el.getBoundingClientRect();
        const top = window.scrollY + r.top - Math.max(96, (window.innerHeight - 300 - Math.min(r.height, window.innerHeight - 380)) / 2);
        window.scrollTo({ top: Math.max(0, top), behavior: render ? "instant" : "smooth" });
        scrolled = true;
      }
      setRect(el.getBoundingClientRect());
    };
    find();
    const t = setInterval(find, 250);
    const onResize = () => find();
    window.addEventListener("resize", onResize);
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") go(-1);
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); go(step + 1); }
      if (e.key === "ArrowLeft") go(step - 1);
    };
    window.addEventListener("keydown", key);
    return () => { clearInterval(t); window.removeEventListener("keydown", key); window.removeEventListener("resize", onResize); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, path]);

  if (step < 0) return (
    <button onClick={() => go(0)} className="rounded-md px-2.5 py-1.5 text-sm hover:bg-white/70" aria-label="Start the guided tour">Tour</button>
  );
  const s = STEPS[step];
  // Card goes at the bottom unless the highlighted element reaches into that area, then at the top.
  const cardAtTop = !!rect && rect.bottom + PAD > vh - 250 && rect.top - PAD > 330;
  const overlay = (
    <>
      <div aria-hidden className="tour-shade" style={rect ? { left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 } : { left: "50%", top: "40%", width: 0, height: 0 }} />
      <div role="dialog" aria-modal="false" aria-label={`Tour step ${step + 1} of ${STEPS.length}`} className={`tour-card ${cardAtTop ? "tour-card-top" : ""}`}>
        <div className="flex items-center justify-between gap-3">
          <p className="caps !text-[var(--held)]">Tour · step {step + 1} of {STEPS.length}</p>
          <button onClick={() => go(-1)} aria-label="Close the tour" className="rounded-md px-2 text-lg leading-none text-[var(--ink-2)] hover:bg-black/5">×</button>
        </div>
        <h2 className="display mt-2 text-[1.6rem] leading-tight">{s.title}</h2>
        <p className="mt-2 leading-relaxed text-[var(--ink-2)]">{s.body}</p>
        <div className="mt-5 flex items-center gap-3">
          <div className="flex gap-1.5" aria-hidden>
            {STEPS.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-[var(--held)]" : i < step ? "w-1.5 bg-[var(--held)]/50" : "w-1.5 bg-black/15"}`} />)}
          </div>
          <div className="ml-auto flex gap-2">
            <button className="btn btn-ghost !px-4 !py-2 text-sm" onClick={() => go(step - 1)} disabled={step === 0}>Back</button>
            <button className="btn btn-primary !px-5 !py-2 text-sm" onClick={() => go(step + 1)} autoFocus>{step === STEPS.length - 1 ? "Finish" : "Next"}</button>
          </div>
        </div>
        <p className="mt-3 hidden text-xs text-[var(--ink-2)] sm:block">Keyboard: Space or arrows to move, Esc to close.</p>
      </div>
    </>
  );
  return (
    <>
      <button onClick={() => go(-1)} className="whitespace-nowrap rounded-md px-2 py-1.5 text-sm hover:bg-white/70">End tour</button>
      {mounted && createPortal(overlay, document.body)}
    </>
  );
}
