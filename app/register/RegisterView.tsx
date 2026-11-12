"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef, type ICellRendererParams } from "ag-grid-community";
import { AgCharts } from "ag-charts-react";
import { AllCommunityModule as ChartsModules, ModuleRegistry as ChartsRegistry } from "ag-charts-community";

ModuleRegistry.registerModules([AllCommunityModule]);
try { ChartsRegistry.registerModules([ChartsModules]); } catch { /* older AG Charts registers itself */ }

const theme = themeQuartz.withParams({
  backgroundColor: "#fbfaf7", foregroundColor: "#16181d", headerBackgroundColor: "#f2f0eb", headerTextColor: "#4a4e57",
  borderColor: "rgba(22,24,29,0.10)", rowBorder: { color: "rgba(22,24,29,0.07)" }, accentColor: "#3355ff",
  fontFamily: "Switzer, ui-sans-serif, system-ui", headerFontWeight: 600, fontSize: 13, rowHeight: 44, headerHeight: 40,
  wrapperBorderRadius: 12, browserColorScheme: "light", selectedRowBackgroundColor: "rgba(51,85,255,0.08)",
});

type Member = {
  id: string; child: string; family: string; lang: string; role: string; seq: number; capCents: number; state: string;
  orderId?: string; authId?: string; honorUntil?: string; validUntil?: string; renewAt?: string | null; source?: string;
};
type CloseOut = { id: string; status: string; verdict: string; chargedCents: number; releasedCents: number; captures: { captureId: string; cents: number }[]; refunds: { refundId: string; cents: number }[]; note?: string };
type View = {
  pool: { id: string; title: string; school: string; teacher: string; minN: number; state: string; port: string; holdSource: string; note?: string; decline?: string; closeAt: string; vendors: { name: string; fixedCents: number; perHeadCents: number }[]; kind: string };
  members: Member[]; heldCount: number;
  preview: { ok: boolean; level?: number; total: number; charges?: Record<string, number>; shortfallCents?: number };
  close?: { state: string; steps: string[]; members?: CloseOut[]; reconciled?: { vendorsDue: number; netCharged: number; exact: boolean }; payout?: { batchId: string; items: { receiver: string; cents: number; note: string }[] } };
};
type Row = Member & { nowCents: number | null; chargedCents: number | null; releasedCents: number | null; verdict: string; ids: string[]; status: string; note?: string };

const usd = (c: number | null | undefined) => (c === null || c === undefined ? "" : `$${(c / 100).toFixed(2)}`);
const LANG: Record<string, string> = { en: "English", es: "Spanish", vi: "Vietnamese" };
const TABS = ["All", "Needs you", "Held", "Settled", "Released"] as const;

function Stamp({ value }: { value: string }) {
  const tone = value === "SETTLED" ? "settled" : value === "HELD" ? "held" : value === "DECLINED" ? "declined" : value === "REVIEW" || value === "CAPTURED_PART" ? "review" : "released";
  return <span className={`stamp stamp-${tone}`}>{value.replace("_", " ")}</span>;
}

function Honor({ data }: ICellRendererParams<Row>) {
  if (!data?.honorUntil) return <span className="text-[var(--ink-2)]">not held</span>;
  const left = Date.parse(data.honorUntil) - Date.now();
  const pct = Math.max(0, Math.min(1, left / (3 * 86400000)));
  return (
    <div className="flex h-full flex-col justify-center gap-1">
      <span className="mono text-xs">{new Date(data.honorUntil).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" })}</span>
      <span className="h-1 w-24 overflow-hidden rounded bg-black/10"><span className="block h-full bg-[var(--held)]" style={{ width: `${pct * 100}%` }} /></span>
    </div>
  );
}

function Ids({ value }: ICellRendererParams<Row, string[]>) {
  return <span className="mono flex gap-1 overflow-hidden text-[11px]">{(value ?? []).slice(0, 3).map((id) => (
    <button key={id} title={`Copy ${id}`} className="rounded border rule bg-white px-1.5" onClick={() => navigator.clipboard?.writeText(id)}>{id.slice(0, 10)}</button>
  ))}</span>;
}

export function RegisterView({ poolId, slips, pools }: { poolId: string; slips: Record<string, string>; pools: { id: string; title: string; kind: string; createdAt: string }[] }) {
  const [v, setV] = useState<View | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const grid = useRef<AgGridReact<Row>>(null);

  useEffect(() => {
    let alive = true;
    let t: ReturnType<typeof setTimeout> | undefined;
    const FINAL = ["CLOSED", "NEEDS_TEACHER", "LAPSED", "FAILED"];
    const load = async () => {
      const r = await fetch(`/api/pools/${poolId}`, { cache: "no-store" });
      if (!r.ok || !alive) return;
      const j: View = await r.json();
      setV(j);
      // Poll fast while a close runs, slowly while families approve slips, and stop once it is final.
      if (!FINAL.includes(j.pool.state)) t = setTimeout(load, j.pool.kind === "class" ? 5000 : 1500);
    };
    load();
    return () => { alive = false; if (t) clearTimeout(t); };
  }, [poolId]);

  const rows: Row[] = useMemo(() => {
    if (!v) return [];
    const out = new Map((v.close?.members ?? []).map((m) => [m.id, m]));
    return v.members.map((m) => {
      const o = out.get(m.id);
      const ids = [m.authId, ...(o?.captures.map((c) => c.captureId) ?? []), ...(o?.refunds.map((r) => r.refundId) ?? [])].filter(Boolean) as string[];
      return {
        ...m, nowCents: v.preview.ok && v.preview.charges ? v.preview.charges[m.id] ?? null : null,
        chargedCents: o ? o.chargedCents : null, releasedCents: o ? o.releasedCents : null,
        verdict: o?.verdict ?? (m.authId ? "OBSERVED" : "NOT OBSERVED"), ids, status: o?.status ?? m.state, note: o?.note,
      };
    });
  }, [v]);

  const shown = rows.filter((r) => tab === "All" || (tab === "Needs you" && (r.status === "REVIEW" || r.status === "DECLINED" || r.status === "CAPTURED_PART")) || (tab === "Held" && r.status === "HELD") || (tab === "Settled" && r.status === "SETTLED") || (tab === "Released" && r.status === "RELEASED"));

  const cols: ColDef<Row>[] = useMemo(() => [
    { field: "child", headerName: "Child", pinned: "left", width: 130 },
    { field: "family", headerName: "Family", width: 150 },
    { field: "lang", headerName: "Language", width: 110, valueFormatter: (p) => LANG[p.value] ?? p.value },
    { field: "capCents", headerName: "Approved", width: 110, valueFormatter: (p) => usd(p.value), cellClass: "mono", type: "rightAligned" },
    { field: "honorUntil", headerName: "Guaranteed until", width: 150, cellRenderer: Honor },
    { field: "renewAt", headerName: "Renewal", width: 130, valueFormatter: (p) => (p.data?.authId ? (p.value ? new Date(p.value).toLocaleString("en-US", { weekday: "short", hour: "numeric" }) : "not needed") : "") },
    { field: "nowCents", headerName: "If the trip ran now", width: 150, valueFormatter: (p) => usd(p.value), cellClass: "mono", enableCellChangeFlash: true, type: "rightAligned" },
    { field: "chargedCents", headerName: "Charged", width: 110, valueFormatter: (p) => usd(p.value), cellClass: "mono", enableCellChangeFlash: true, type: "rightAligned" },
    { field: "releasedCents", headerName: "Released", width: 110, valueFormatter: (p) => usd(p.value), cellClass: "mono", enableCellChangeFlash: true, type: "rightAligned" },
    { field: "verdict", headerName: "Verdict", width: 130 },
    { field: "ids", headerName: "PayPal ids", width: 260, cellRenderer: Ids, sortable: false, filter: false },
    { field: "status", headerName: "Status", width: 140, cellRenderer: (p: ICellRendererParams<Row>) => <Stamp value={p.value} />, enableCellChangeFlash: true },
    ...(Object.keys(slips).length ? [{ headerName: "Slip", width: 110, sortable: false, filter: false, cellRenderer: (p: ICellRendererParams<Row>) => p.data && slips[p.data.id] && p.data.status === "INVITED" ? <Link className="text-[var(--held)] underline" href={`/slip/${slips[p.data.id]}`}>Open slip</Link> : null } as ColDef<Row>] : []),
  ], [slips]);

  if (!v) return <p className="py-20 text-center text-[var(--ink-2)]">Opening the register</p>;
  const going = v.heldCount;
  const sums = rows.reduce((s, r) => ({ held: s.held + (r.authId ? r.capCents : 0), now: s.now + (r.nowCents ?? 0), charged: s.charged + (r.chargedCents ?? 0) }), { held: 0, now: 0, charged: 0 });
  const curve = Array.from({ length: 9 }, (_, i) => 18 + i).map((n) => ({ n, share: Math.ceil((144000 + 800 * n) / n) / 100 }));
  const closing = v.pool.state === "HOLDING" || v.pool.state === "CLOSING";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="caps">The Register · {v.pool.school} · {v.pool.teacher}</p>
          <h1 className="display mt-2 text-3xl sm:text-4xl">{v.pool.title}</h1>
          <p className="mt-2 text-sm text-[var(--ink-2)]">
            Payments: <strong className={v.pool.port === "sandbox" ? "text-[var(--held)]" : ""}>{v.pool.port === "sandbox" ? "PayPal sandbox" : "PayPal stand-in"}</strong>
            {" · "}holds by {v.pool.holdSource === "paypal-login" ? "each family approving on PayPal" : v.pool.holdSource === "saved-wallet" ? "a sandbox buyer's saved PayPal wallet (scripted run, approved once)" : v.pool.holdSource === "sandbox-card" ? "PayPal sandbox test card (scripted run)" : "the stand-in"}
            {v.pool.decline ? " · PayPal told to decline family 7 (sandbox negative testing)" : ""}
          </p>
          {v.pool.note && <p className="mt-1 text-sm text-[var(--review)]">{v.pool.note}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm" htmlFor="pool">Trip</label>
          <select id="pool" className="w-full max-w-[16rem] truncate rounded-lg border rule bg-white/80 px-2 py-2 text-sm sm:w-auto sm:max-w-xs" value={poolId} onChange={(e) => (window.location.href = `/register?pool=${e.target.value}`)}>
            {pools.map((p) => <option key={p.id} value={p.id}>{p.kind === "class" ? "Class trip (slips)" : `${p.createdAt.slice(5, 16).replace("T", " ")} ${p.title}`}</option>)}
          </select>
          <span className="stamp stamp-held">{v.pool.state}</span>
          <Link className="btn btn-ghost !py-2 text-sm" href={`/proof/${v.pool.id}`}>Proof page</Link>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {[
          ["Children going", `${going} of ${v.members.length}`],
          ["Needed", String(v.pool.minN)],
          ["Price per child now", v.preview.ok ? usd(v.preview.level) : going < v.pool.minN ? "below minimum" : "short"],
          ["If 2 more join", going >= v.pool.minN - 2 ? usd(Math.ceil((144000 + 800 * (going + 2)) / (going + 2))) : "n/a"],
        ].map(([k, val]) => <div key={k} className="card p-4"><div className="caps">{k}</div><div className="mono mt-1 text-2xl font-semibold">{val}</div></div>)}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter rows">
              {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-lg px-3 py-1.5 text-sm ${tab === t ? "bg-[var(--ink)] text-white" : "border rule bg-white/60"}`}>{t}</button>)}
            </div>
            <button className="btn btn-ghost ml-auto !py-1.5 text-sm" onClick={() => grid.current?.api.exportDataAsCsv({ fileName: `register-${v.pool.id}.csv` })}>Export for the school office</button>
          </div>
          <div style={{ height: 560 }}>
            <AgGridReact<Row>
              ref={grid} theme={theme} rowData={shown} columnDefs={cols} getRowId={(p) => p.data.id}
              defaultColDef={{ sortable: true, filter: true, resizable: true }}
              pinnedBottomRowData={[{ id: "total", child: "Totals", family: "", lang: "", role: "", seq: 999, capCents: sums.held, state: "", nowCents: sums.now, chargedCents: v.close?.reconciled?.netCharged ?? null, releasedCents: null, verdict: v.close?.reconciled ? (v.close.reconciled.exact ? "EXACT" : "MISMATCH") : "", ids: [], status: v.close?.reconciled ? (v.close.reconciled.exact ? "SETTLED" : "REVIEW") : "HELD" } as Row]}
              rowSelection={{ mode: "multiRow" }}
            />
          </div>
        </div>
        <aside className="min-w-0 space-y-4">
          <div className="card p-4">
            <p className="caps">Price per child vs children going</p>
            <div style={{ height: 200 }}>
              <AgCharts options={{
                data: curve, background: { fill: "transparent" }, padding: { top: 10, right: 10, bottom: 0, left: 0 },
                series: [{ type: "line", xKey: "n", yKey: "share", stroke: "#3355ff", marker: { fill: "#3355ff", size: 5 }, yName: "Share" }],
                axes: { x: { type: "number", position: "bottom", label: { fontSize: 10 } }, y: { type: "number", position: "left", label: { fontSize: 10, formatter: (p: { value: number }) => `$${p.value}` } } } as never,
              } as never} />
            </div>
          </div>
          <div className="card p-4">
            <p className="caps">{closing ? "Closing now" : v.close ? "The close" : "Close preview"}</p>
            {v.close?.reconciled && (
              <div className="mt-2 rounded-lg bg-white/70 p-3 text-sm">
                <div className="flex justify-between"><span>Families charged</span><span className="mono">{usd(v.close.reconciled.netCharged)}</span></div>
                <div className="flex justify-between"><span>Vendors paid</span><span className="mono">{usd(v.close.reconciled.vendorsDue)}</span></div>
                <div className={`mt-1 font-semibold ${v.close.reconciled.exact ? "text-[var(--settled)]" : "text-[#b42318]"}`}>{v.close.reconciled.exact ? "Exact to the cent" : "Mismatch"}</div>
              </div>
            )}
            {!v.close && v.preview.ok && <p className="mt-2 text-sm">If the trip closed now, {going} families pay {usd(v.preview.level)} or one cent more, and the vendors get {usd(v.preview.total)}.</p>}
            {!v.close && !v.preview.ok && <p className="mt-2 text-sm">Not enough held yet: {going} of {v.pool.minN} children.</p>}
            <ol tabIndex={0} aria-label="Steps of the close" className="mono mt-3 max-h-72 space-y-1 overflow-auto text-[11px] leading-relaxed" aria-live="polite">
              {(v.close?.steps ?? []).map((s, i) => <li key={i} className={s.includes("declined") ? "text-[#b42318]" : s.includes("exact") ? "text-[var(--settled)]" : ""}>{s}</li>)}
            </ol>
            {v.close?.payout && <p className="mt-3 text-xs">Payout batch <span className="mono">{v.close.payout.batchId}</span>: {v.close.payout.items.map((i) => `${i.note} ${usd(i.cents)}`).join(", ")}</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
