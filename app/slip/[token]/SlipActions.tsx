"use client";
import { useEffect, useRef, useState } from "react";

type PayPalNs = { Buttons: (o: Record<string, unknown>) => { render: (el: HTMLElement) => Promise<void> } };
declare global { interface Window { paypal?: PayPalNs } }

/**
 * Family approval on PayPal: JS SDK Buttons with intent=authorize. The order is created by our
 * server (AUTHORIZE, the family's cap, the terms hash in custom_id); the family signs in to PayPal
 * and approves; our server then authorizes the order and records the hold.
 */
export function SlipActions({ token, state, clientId, labels, honorUntil }: { token: string; state: string; clientId: string; labels: { held: string; guaranteed: string; error: string }; honorUntil: string | null }) {
  const box = useRef<HTMLDivElement>(null);
  const [held, setHeld] = useState<string | null>(state === "INVITED" ? null : honorUntil ?? "");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (held !== null || !clientId || !box.current) return;
    const render = () => window.paypal?.Buttons({
      style: { layout: "vertical", shape: "rect", label: "paypal", height: 45 },
      createOrder: async () => {
        const r = await fetch(`/api/slip/${token}/order`, { method: "POST" });
        const j = await r.json(); if (!r.ok) throw new Error(j.error); return j.id;
      },
      onApprove: async (d: { orderID: string }) => {
        const r = await fetch(`/api/slip/${token}/authorize`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: d.orderID }) });
        const j = await r.json(); if (!r.ok) { setErr(j.error); return; } setHeld(j.honorUntil);
      },
      onError: (e: Error) => setErr(e?.message ?? "error"),
    }).render(box.current!);
    if (window.paypal) { render(); return; }
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&intent=authorize&currency=USD&components=buttons&disable-funding=card,credit,paylater,venmo`;
    s.onload = () => render();
    document.body.appendChild(s);
  }, [held, clientId, token]);

  if (held !== null) return (
    <div className="mt-6 text-center">
      <span className="stamp stamp-held text-base">{labels.held}</span>
      {held && <p className="mt-3 text-sm">{labels.guaranteed} <span className="mono">{new Date(held).toLocaleString()}</span></p>}
    </div>
  );
  return (
    <div className="mt-6">
      {!clientId && <p className="text-sm text-[var(--review)]">PayPal keys are not configured on this server.</p>}
      <div ref={box} />
      {err && <p role="alert" className="mt-2 text-sm text-[#b42318]">{labels.error} ({err})</p>}
    </div>
  );
}
