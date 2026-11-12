/** The quorum ring: separate arcs that close into a ring when enough are present. One arc is Held. */
export function Mark({ size = 28, arcs = 8, present = 8, animate = false }: { size?: number; arcs?: number; present?: number; animate?: boolean }) {
  const r = 40, c = 50, gap = present >= arcs ? 0 : 7;
  const seg = 360 / arcs;
  const paths = Array.from({ length: arcs }, (_, i) => {
    const a0 = ((i * seg + gap / 2 - 90) * Math.PI) / 180;
    const a1 = (((i + 1) * seg - gap / 2 - 90) * Math.PI) / 180;
    return `M ${c + r * Math.cos(a0)} ${c + r * Math.sin(a0)} A ${r} ${r} 0 0 1 ${c + r * Math.cos(a1)} ${c + r * Math.sin(a1)}`;
  });
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      {paths.map((d, i) => (
        <path key={i} d={d} fill="none" strokeWidth={11} strokeLinecap={present >= arcs ? "butt" : "round"}
          stroke={i === 0 ? "var(--held)" : "var(--ink)"} opacity={i < present ? 1 : 0.15}
          className={animate ? "arc" : undefined} style={animate ? { animationDelay: `${i * 0.16}s` } : undefined} />
      ))}
    </svg>
  );
}
