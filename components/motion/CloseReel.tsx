"use client";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * The close as a motion reel: eight families hold $88.00, the close captures each share, PayPal refuses
 * family 7, the share is recomputed, the captured families are topped up, every remainder is released and
 * the totals meet. The numbers follow the real rule (coach $1,440 + $8 a child, here shown for 8 of 20 rows).
 */
const FAM = ["Maya R.", "Liam T.", "Ava P.", "Noah K.", "Sofia G.", "Ethan N.", "Zoe B.", "Lucas M."];
type Row = { state: "INVITED" | "HELD" | "SETTLED" | "DECLINED"; charged: string; note?: string };
const FRAMES: { caption: string; rows: Row[]; share: string; total?: string; exact?: boolean }[] = [
  { caption: "Slips go home. Nobody has paid anything.", share: "-", rows: FAM.map(() => ({ state: "INVITED", charged: "" })) },
  { caption: "Each family's PayPal holds $88.00, the most it can ever cost.", share: "$88.00", rows: FAM.map(() => ({ state: "HELD", charged: "" })) },
  { caption: "20 children going. The real share is $80.00. The close begins.", share: "$80.00", rows: FAM.map((_, i) => ({ state: i < 6 ? "SETTLED" : "HELD", charged: i < 6 ? "$80.00" : "" })) },
  { caption: "PayPal refuses family 7: PAYER_CANNOT_PAY.", share: "$80.00", rows: FAM.map((_, i) => ({ state: i < 6 ? "SETTLED" : i === 6 ? "DECLINED" : "HELD", charged: i < 6 ? "$80.00" : i === 6 ? "$0.00" : "" })) },
  { caption: "19 going: $83.78 or $83.79 each. Six families topped up $3.79 from their own holds.", share: "$83.79", rows: FAM.map((_, i) => ({ state: i === 6 ? "DECLINED" : "SETTLED", charged: i === 6 ? "$0.00" : "$83.79", note: i < 6 ? "+$3.79" : undefined })) },
  { caption: "Remainders released. Coach and museum paid in one PayPal payout.", share: "$83.79", total: "$1,592.00", exact: true, rows: FAM.map((_, i) => ({ state: i === 6 ? "DECLINED" : "SETTLED", charged: i === 6 ? "$0.00" : "$83.79" })) },
];

const TONE: Record<Row["state"], string> = { INVITED: "stamp-released", HELD: "stamp-held", SETTLED: "stamp-settled", DECLINED: "stamp-declined" };

export function CloseReel() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-80px" });
  const reduce = useReducedMotion();
  const [f, setF] = useState(reduce ? FRAMES.length - 1 : 0);
  useEffect(() => {
    if (!inView || reduce) return;
    const t = setInterval(() => setF((x) => (x + 1) % FRAMES.length), 2300);
    return () => clearInterval(t);
  }, [inView, reduce]);
  const fr = FRAMES[f];
  return (
    <div ref={ref} className="reel card overflow-hidden p-0">
      <div className="flex items-center justify-between border-b rule px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-3 caps">The Register · live close</span>
        </div>
        <div className="flex items-center gap-1" aria-hidden>{FRAMES.map((_, i) => <span key={i} className={`h-1 rounded-full transition-all duration-500 ${i === f ? "w-6 bg-[var(--held)]" : "w-2 bg-black/15"}`} />)}</div>
      </div>
      <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_260px]">
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-2)]"><span>Family</span><span className="w-24 text-right">Charged</span><span className="w-24 text-right">Status</span></div>
          <ul className="space-y-1.5">
            {FAM.map((name, i) => {
              const r = fr.rows[i];
              return (
                <motion.li key={name} layout className={`grid grid-cols-[1fr_auto_auto] items-center gap-x-4 rounded-lg px-2 py-2 ${r.state === "DECLINED" ? "bg-[#fff1ef]" : "bg-white/55"}`}>
                  <span className="truncate text-sm">{name}</span>
                  <span className="mono w-24 text-right text-sm">
                    <AnimatePresence mode="popLayout">
                      <motion.span key={r.charged + (r.note ?? "")} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }} className="inline-block">
                        {r.charged || " "}{r.note && <span className="ml-1 text-[10px] text-[var(--review)]">{r.note}</span>}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                  <span className="w-24 text-right">
                    <AnimatePresence mode="popLayout">
                      <motion.span key={r.state} initial={{ opacity: 0, scale: 1.4, rotate: -8 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 420, damping: 22 }} className={`stamp ${TONE[r.state]}`}>{r.state}</motion.span>
                    </AnimatePresence>
                  </span>
                </motion.li>
              );
            })}
          </ul>
        </div>
        <aside className="flex flex-col justify-between gap-4 border-t rule bg-white/40 p-5 md:border-l md:border-t-0">
          <div>
            <p className="caps">Share per child</p>
            <AnimatePresence mode="popLayout"><motion.p key={fr.share} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="kpi-xl mt-1">{fr.share}</motion.p></AnimatePresence>
          </div>
          <AnimatePresence mode="wait">
            <motion.p key={fr.caption} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="text-sm leading-relaxed text-[var(--ink-2)]" aria-live="polite">{fr.caption}</motion.p>
          </AnimatePresence>
          <div className={`rounded-xl px-4 py-3 transition-colors duration-500 ${fr.exact ? "bg-[#e8f6ef]" : "bg-black/[0.04]"}`}>
            <p className="caps">{fr.exact ? "Vendors paid" : "Vendors due"}</p>
            <p className={`mono mt-0.5 text-lg font-semibold ${fr.exact ? "text-[var(--settled)]" : ""}`}>{fr.total ?? "pending"}</p>
            {fr.exact && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-semibold text-[var(--settled)]">Exact to the cent</motion.p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
