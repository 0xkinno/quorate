"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function RunButtons() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  async function run(decline: boolean, template: "class-trip" | "team-bus" = "class-trip") {
    setBusy(true); setErr(null);
    const r = await fetch("/api/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decline, template }) });
    const j = await r.json();
    if (!r.ok) { setErr(j.error ?? "Could not start"); setBusy(false); return; }
    router.push(`/register?pool=${j.poolId}`);
  }
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button className="btn btn-primary" disabled={busy} onClick={() => run(true)}>{busy ? "Starting" : "Run it live, with a PayPal decline"}</button>
      <button className="btn btn-ghost" disabled={busy} onClick={() => run(false)}>Run a clean close</button>
      <button className="btn btn-ghost" disabled={busy} onClick={() => run(false, "team-bus")} title="Same engine, a youth football team's tournament bus">Same engine: a team bus</button>
      {err && <span role="alert" className="text-sm text-[#b42318]">{err === "LIVE_OFF" ? "Live runs are switched off right now." : err.startsWith("DAILY_LIMIT") ? "Today's run limit is reached. Open a recorded run below." : err}</span>}
    </div>
  );
}
