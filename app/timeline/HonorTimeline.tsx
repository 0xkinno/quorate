"use client";
import { useEffect, useRef, useState } from "react";

export type TimelineMember = { id: string; child: string; family: string; capCents: number; state: string; authorizedAt?: string; honorUntil?: string; validUntil?: string; renewAt?: string | null };

/**
 * Bryntum Scheduler: every family's PayPal hold on one timeline. Blue is the 3-day honor window the hold
 * was approved with; green is the renewed window the tick schedules so it covers the close; the red line
 * is the close. Read-only: the Bursar, not a drag, decides money.
 * Bryntum is loaded at runtime from the public npm CDN (the trial build), not bundled, so the app's build
 * stays small.
 */
const BRYNTUM = "https://unpkg.com/@bryntum/scheduler-trial@7.3.8";
type BryntumNs = { scheduler: { Scheduler: new (cfg: Record<string, unknown>) => { destroy: () => void } } };
declare global { interface Window { bryntum?: BryntumNs } }

let loading: Promise<void> | null = null;
function loadBryntum() {
  if (window.bryntum?.scheduler) return Promise.resolve();
  if (!loading) loading = new Promise<void>((resolve, reject) => {
    for (const css of ["scheduler.css", "svalbard-light.css"]) {
      const l = document.createElement("link"); l.rel = "stylesheet"; l.href = `${BRYNTUM}/${css}`; document.head.appendChild(l);
    }
    const s = document.createElement("script"); s.src = `${BRYNTUM}/scheduler.umd.js`; s.onload = () => resolve(); s.onerror = () => reject(new Error("Bryntum did not load"));
    document.head.appendChild(s);
  });
  return loading;
}

export default function HonorTimeline({ members, closeAt, title }: { members: TimelineMember[]; closeAt: string; title: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const held = members.filter((m) => m.authorizedAt && m.honorUntil);

  useEffect(() => {
    let inst: { destroy: () => void } | null = null;
    let alive = true;
    const close = new Date(closeAt);
    const first = held.length ? Math.min(...held.map((m) => Date.parse(m.authorizedAt!))) : Date.now();
    const lastEdge = Math.max(close.getTime(), ...held.map((m) => Date.parse(m.honorUntil!)), ...held.filter((m) => m.renewAt).map((m) => Date.parse(m.renewAt!) + 3 * 86400000));
    const start = new Date(first - 12 * 3600000), end = new Date(lastEdge + 18 * 3600000);
    const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
    loadBryntum().then(() => {
      if (!alive || !box.current || !window.bryntum) return;
      inst = new window.bryntum.scheduler.Scheduler({
        appendTo: box.current,
        startDate: start, endDate: end,
        viewPreset: end.getTime() - start.getTime() > 5 * 86400000 ? "weekAndDayLetter" : "dayAndWeek",
        rowHeight: 42, barMargin: 7, readOnly: true, eventStyle: "rounded",
        columns: [{ text: "Family", field: "name", width: 150 }, { text: "Hold", field: "amount", width: 90, align: "right" }, { text: "Status", field: "status", width: 110 }],
        resources: held.map((m) => ({ id: m.id, name: m.child, amount: usd(m.capCents), status: m.state })),
        events: held.flatMap((m) => {
          const out = [{ id: `${m.id}-honor`, resourceId: m.id, name: `Guaranteed: honor window, ${usd(m.capCents)}`, startDate: m.authorizedAt, endDate: m.honorUntil, eventColor: "blue" }];
          if (m.renewAt) { const r = Date.parse(m.renewAt); out.push({ id: `${m.id}-renew`, resourceId: m.id, name: "Renewed: covers the close", startDate: new Date(r).toISOString(), endDate: new Date(r + 3 * 86400000).toISOString(), eventColor: "green" }); }
          return out;
        }),
        features: { timeRanges: { showCurrentTimeLine: true } },
        timeRanges: [{ id: "close", name: "Close", startDate: close, duration: 0, cls: "q-close-line" }],
      });
    }).catch((e) => setErr((e as Error).message));
    return () => { alive = false; inst?.destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeAt, members]);

  return (
    <div className="card overflow-hidden p-0" aria-label={`Honor windows for ${title}`}>
      {err && <p className="empty m-4">{err}</p>}
      <div ref={box} style={{ height: Math.min(140 + held.length * 44, 760) }} />
    </div>
  );
}
