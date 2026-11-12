"use client";
import { motion, useReducedMotion } from "motion/react";

/** The falling price as bars that grow into place. */
export function PriceBars({ curve }: { curve: { n: number; share: number }[] }) {
  const reduce = useReducedMotion();
  const max = Math.max(...curve.map((c) => c.share));
  return (
    <div className="card mt-6 p-6 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="caps">Price per child as children join</p>
        <p className="text-sm text-[var(--ink-2)]">coach $1,440 + museum $8 a child</p>
      </div>
      <div className="mt-6 grid grid-cols-5 items-end gap-3 sm:gap-6" role="list">
        {curve.map((c, i) => (
          <div key={c.n} role="listitem" className="flex flex-col items-center">
            <div className="flex h-40 w-full items-end justify-center">
              <motion.div className="w-full max-w-20 rounded-t-xl bg-gradient-to-t from-[var(--held)] to-[#7d94ff]"
                style={{ opacity: 0.55 + i * 0.1, transformOrigin: "bottom" }}
                initial={reduce ? false : { scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }}
                transition={{ duration: 0.9, delay: 0.1 * i, ease: [0.2, 0.7, 0.2, 1] }}>
                <div style={{ height: `${Math.round((c.share / max) * 150)}px` }} />
              </motion.div>
            </div>
            <div className="mono mt-3 text-sm font-semibold sm:text-base">${(c.share / 100).toFixed(2)}</div>
            <div className="text-xs text-[var(--ink-2)]">{c.n} children</div>
          </div>
        ))}
      </div>
    </div>
  );
}
