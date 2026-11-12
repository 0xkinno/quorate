import { Mark } from "./Mark";

/** A road at dawn, a generic coach, slips floating in depth. Pure SVG and CSS, no raster. */
function Slip({ x, y, r, s, stamp, tone, label }: { x: number; y: number; r: number; s: number; stamp: string; tone: string; label: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} filter="url(#shadow)">
      <rect width="150" height="96" rx="8" fill="#fbfaf7" stroke="rgba(22,24,29,.12)" />
      <rect x="14" y="16" width="70" height="6" rx="3" fill="rgba(22,24,29,.75)" />
      <rect x="14" y="30" width="110" height="4" rx="2" fill="rgba(22,24,29,.18)" />
      <rect x="14" y="40" width="96" height="4" rx="2" fill="rgba(22,24,29,.18)" />
      <text x="14" y="76" fontFamily="JetBrains Mono, monospace" fontSize="13" fontWeight="700" fill="#16181d">{label}</text>
      <g transform="translate(92 60) rotate(-8)">
        <rect width="50" height="20" rx="3" fill="none" stroke={tone} strokeWidth="2" />
        <text x="25" y="14" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9" fontWeight="700" letterSpacing="1.2" fill={tone}>{stamp}</text>
      </g>
    </g>
  );
}

export function HeroArt() {
  return (
    <div className="relative aspect-[5/4] w-full">
      <svg viewBox="0 0 500 400" className="absolute inset-0 h-full w-full" role="img" aria-label="Permission slips stamped held, settled and released, floating over a road with a coach at dawn">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#dfe5ff" />
            <stop offset="0.55" stopColor="#f6efe3" />
            <stop offset="1" stopColor="#f2f0eb" />
          </linearGradient>
          <linearGradient id="road" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3355ff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#3355ff" stopOpacity="0.05" />
          </linearGradient>
          <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#16181d" floodOpacity="0.16" /></filter>
          <clipPath id="frame"><rect width="500" height="400" rx="22" /></clipPath>
        </defs>
        <g clipPath="url(#frame)">
          <rect width="500" height="400" fill="url(#sky)" />
          <circle cx="360" cy="168" r="54" fill="#fff6e6" opacity="0.9" />
          <path d="M0 210 L500 210 L500 400 L0 400 Z" fill="#ece8df" />
          <path d="M232 210 L268 210 L420 400 L80 400 Z" fill="url(#road)" />
          {[0, 1, 2, 3].map((i) => <rect key={i} x={248 - i * 2} y={226 + i * 40} width={4 + i * 4} height={14 + i * 8} fill="#fff" opacity="0.7" />)}
          <g transform="translate(150 178)">
            <rect width="120" height="40" rx="8" fill="#fdfcf9" stroke="rgba(22,24,29,.35)" />
            {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={10 + i * 20} y="8" width="15" height="12" rx="2" fill="#c9d3ff" />)}
            <rect x="0" y="27" width="120" height="3" fill="#3355ff" opacity="0.6" />
            <circle cx="24" cy="41" r="6" fill="#16181d" /><circle cx="96" cy="41" r="6" fill="#16181d" />
          </g>
          <Slip x={300} y={40} r={6} s={0.82} stamp="HELD" tone="#3355ff" label="$88.00" />
          <Slip x={36} y={70} r={-8} s={0.72} stamp="HELD" tone="#3355ff" label="$88.00" />
          <Slip x={280} y={238} r={-5} s={1} stamp="SETTLED" tone="#0d8a60" label="$80.00" />
          <Slip x={40} y={262} r={7} s={0.86} stamp="RELEASED" tone="#6b707a" label="$8.00" />
        </g>
      </svg>
      <div className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-xl border rule bg-white/85 px-4 py-2.5 shadow-lg backdrop-blur">
        <Mark size={30} animate />
        <div className="text-sm leading-tight">
          <div className="mono font-semibold"><span className="text-[var(--held)]">$88.00 held</span> <span className="text-[var(--ink-2)]">then</span> $80.00 charged</div>
          <div className="text-[var(--ink-2)]">20 children going, 18 needed</div>
        </div>
      </div>
    </div>
  );
}
