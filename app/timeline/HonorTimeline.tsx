"use client";
import { BryntumScheduler } from "@bryntum/scheduler-react";
import "@bryntum/scheduler/scheduler.css";
import "@bryntum/scheduler/svalbard-light.css";

export type TimelineMember = { id: string; child: string; family: string; capCents: number; state: string; authorizedAt?: string; honorUntil?: string; validUntil?: string; renewAt?: string | null };

/**
 * Bryntum Scheduler: every family's PayPal hold on one timeline. Blue is the 3-day honor window the
 * hold was approved with; green is the renewed window the tick schedules so it covers the close; the
 * red line is the close. Read-only: the Bursar, not a drag, decides money.
 */
export default function HonorTimeline({ members, closeAt, title }: { members: TimelineMember[]; closeAt: string; title: string }) {
  const held = members.filter((m) => m.authorizedAt && m.honorUntil);
  const close = new Date(closeAt);
  const first = held.length ? new Date(Math.min(...held.map((m) => Date.parse(m.authorizedAt!)))) : new Date();
  const lastEdge = Math.max(close.getTime(), ...held.map((m) => Date.parse(m.honorUntil!)), ...held.filter((m) => m.renewAt).map((m) => Date.parse(m.renewAt!) + 3 * 86400000));
  const start = new Date(first.getTime() - 12 * 3600000);
  const end = new Date(lastEdge + 18 * 3600000);
  const usd = (c: number) => `$${(c / 100).toFixed(2)}`;

  const resources = held.map((m) => ({ id: m.id, name: m.child, family: m.family, amount: usd(m.capCents), status: m.state }));
  const events = held.flatMap((m) => {
    const out = [{ id: `${m.id}-honor`, resourceId: m.id, name: `Guaranteed: honor window, ${usd(m.capCents)}`, startDate: m.authorizedAt!, endDate: m.honorUntil!, eventColor: "blue" }];
    if (m.renewAt) {
      const r = Date.parse(m.renewAt);
      out.push({ id: `${m.id}-renew`, resourceId: m.id, name: "Renewed: covers the close", startDate: new Date(r).toISOString(), endDate: new Date(r + 3 * 86400000).toISOString(), eventColor: "green" });
    }
    return out;
  });

  return (
    <div className="card overflow-hidden p-0" aria-label={`Honor windows for ${title}`}>
      <div style={{ height: Math.min(140 + held.length * 44, 760) }}>
        <BryntumScheduler
          startDate={start}
          endDate={end}
          viewPreset={end.getTime() - start.getTime() > 5 * 86400000 ? "weekAndDayLetter" : "dayAndWeek"}
          rowHeight={42}
          barMargin={7}
          readOnly
          columns={[
            { text: "Family", field: "name", width: 150 },
            { text: "Hold", field: "amount", width: 90, align: "right" },
            { text: "Status", field: "status", width: 110 },
          ]}
          resources={resources}
          events={events}
          timeRangesFeature={{ showCurrentTimeLine: true }}
          timeRanges={[{ id: "close", name: "Close", startDate: close, duration: 0, cls: "q-close-line" }]}
          eventStyle="rounded"
          eventRenderer={({ eventRecord }: { eventRecord: { name: string } }) => eventRecord.name}
        />
      </div>
    </div>
  );
}
