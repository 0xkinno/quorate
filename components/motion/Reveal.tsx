"use client";
import { motion, useInView, useMotionValue, useReducedMotion, animate } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

const EASE = [0.2, 0.7, 0.2, 1] as const;

/** Fades and lifts its children into place once, as they scroll into view. */
export function Reveal({ children, delay = 0, y = 26, className = "" }: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} initial={reduce ? false : { opacity: 0, y, filter: "blur(6px)" }} whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.8, ease: EASE, delay }}>
      {children}
    </motion.div>
  );
}

/** Splits a headline into words that rise in sequence. */
export function Headline({ text, className = "" }: { text: string; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <h1 className={className} aria-label={text}>
      {text.split(" ").map((w, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span className="inline-block" initial={reduce ? false : { y: "105%" }} animate={{ y: "0%" }} transition={{ duration: 0.9, ease: EASE, delay: 0.08 * i + 0.1 }}>
            {w}{i < text.split(" ").length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </h1>
  );
}

/** Counts up to a number when it enters the view. */
export function CountUp({ to, prefix = "", suffix = "", decimals = 0, className = "" }: { to: number; prefix?: string; suffix?: string; decimals?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  // The real number is rendered on the server and without JavaScript; the count-up only replays it on view.
  const [v, setV] = useState(to);
  useEffect(() => {
    if (!inView || reduce) return;
    const c = animate(mv, to, { from: 0, duration: 1.6, ease: EASE, onUpdate: (x) => setV(x) });
    return () => c.stop();
  }, [inView, reduce, to, mv]);
  return <span ref={ref} className={className}>{prefix}{v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
}

/** Gentle float for hero ornaments. */
export function Float({ children, delay = 0, amp = 8, className = "" }: { children: ReactNode; delay?: number; amp?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} animate={reduce ? undefined : { y: [0, -amp, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay }}>
      {children}
    </motion.div>
  );
}
