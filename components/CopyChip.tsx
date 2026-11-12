"use client";
import { useState } from "react";

/** A PayPal id as a mono chip; click to copy. */
export function CopyChip({ value, short = 14 }: { value: string; label?: string; short?: number }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      title={`Copy ${value}`}
      onClick={() => { navigator.clipboard?.writeText(value); setDone(true); setTimeout(() => setDone(false), 1200); }}
      className="chip group"
    >
      <span>{value.length > short ? `${value.slice(0, short)}…` : value}</span>
      <span className="text-[10px] font-medium text-[#3b4bb0]">{done ? "copied" : "copy"}</span>
    </button>
  );
}
