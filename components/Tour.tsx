"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Guided tour: six steps across the product. Space or Right for next, Left for back, Esc to close. */
const STEPS = [
  { path: "/", sel: "h1", title: "The moment", body: "A teacher usually fronts the coach on her own card. Quorate lets each family's PayPal hold their child's share instead." },
  { path: "/", sel: "#how", title: "The price falls as children join", body: "Every family approves the worst case, $88.00. Each child who joins lowers what everyone actually pays." },
  { path: "/judge", sel: "main ol", title: "Run it live", body: "One button holds $88.00 for 20 families on the PayPal sandbox and closes the trip, with PayPal declining family 7." },
  { path: "/register", sel: ".ag-root-wrapper", title: "The Register", body: "Each row is a real PayPal authorization: guaranteed until, the share if the trip ran now, charged, released, and every PayPal id." },
  { path: "/register", sel: "aside", title: "Exact to the cent", body: "The close re-shares after a decline, tops up from the same holds, releases the rest and pays the vendors exactly." },
  { path: "/help", sel: "main section", title: "The help desk", body: "Gemini answers parents using read-only PayPal Agent Toolkit tools. It cannot charge, refund or pay." },
];

export function Tour() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const raw = params.get("tour");
  const step = raw === null ? -1 : Math.max(0, Math.min(STEPS.length - 1, Number(raw) - 1 || 0));
  const [rect, setRect] = useState<DOMRect | null>(null);
  const render = params.get("render") === "1";

  const go = (i: number) => {
    if (i < 0 || i >= STEPS.length) { router.push(path); return; }
    router.push(`${STEPS[i].path}?tour=${i + 1}${render ? "&render=1" : ""}`);
  };

  useEffect(() => {
    if (step < 0) return;
    const find = () => { const el = document.querySelector(STEPS[step].sel); if (el) { el.scrollIntoView({ block: "center", behavior: render ? "instant" : "smooth" }); setRect(el.getBoundingClientRect()); } };
    find();
    const t = setInterval(find, 600);
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") go(-1);
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); go(step + 1); }
      if (e.key === "ArrowLeft") go(step - 1);
    };
    window.addEventListener("keydown", key);
    return () => { clearInterval(t); window.removeEventListener("keydown", key); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, path]);

  if (step < 0) return (
    <button onClick={() => go(0)} className="rounded-md px-2.5 py-1.5 text-sm hover:bg-white/70" aria-label="Start the guided tour">Tour</button>
  );
  const s = STEPS[step];
  return (
    <>
      <button onClick={() => go(-1)} className="rounded-md px-2.5 py-1.5 text-sm hover:bg-white/70">End tour</button>
      {rect && <div aria-hidden className="pointer-events-none fixed z-[60] rounded-xl transition-all duration-300" style={{ left: rect.left - 8, top: rect.top - 8, width: rect.width + 16, height: rect.height + 16, boxShadow: "0 0 0 9999px rgba(22,24,29,.38), 0 0 0 2px #3355ff, 0 0 28px rgba(51,85,255,.5)" }} />}
      <div role="dialog" aria-label={`Tour step ${step + 1} of ${STEPS.length}`} className="fixed bottom-4 left-1/2 z-[70] w-[min(92vw,460px)] -translate-x-1/2 rounded-2xl border rule bg-[#fbfaf7] p-5 shadow-2xl">
        <p className="caps">Step {step + 1} of {STEPS.length}</p>
        <h2 className="display mt-1 text-2xl">{s.title}</h2>
        <p className="mt-2 text-[var(--ink-2)]">{s.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <button className="btn btn-ghost !py-2 text-sm" onClick={() => go(step - 1)} disabled={step === 0}>Back</button>
          <span className="text-xs text-[var(--ink-2)]">Space or arrows, Esc to close</span>
          <button className="btn btn-primary !py-2 text-sm" onClick={() => go(step + 1)}>{step === STEPS.length - 1 ? "Finish" : "Next"}</button>
        </div>
      </div>
    </>
  );
}
