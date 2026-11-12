"use client";
import type { ReactNode } from "react";

export function GlowCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`card card-glow ${className}`}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
    >
      {children}
    </div>
  );
}
