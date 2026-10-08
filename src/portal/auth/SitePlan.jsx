import React from "react";

// Decorative surveyor's layout of the estate — boundary, roads, a central
// circle and the plot grid — drawn in once with gold hairlines and laid back
// in perspective like a plan on a drafting table. Pure SVG + CSS (see
// .cip-plan in global.css); static under prefers-reduced-motion.

const BLOCKS = [
  // x, y, width, height, columns, rows
  [104, 96, 262, 168, 6, 2],
  [436, 84, 286, 180, 6, 2],
  [96, 336, 270, 180, 6, 2],
  [436, 336, 170, 176, 4, 2],
];
const SOLD = new Set([1, 2, 7, 13, 14, 15, 20, 26, 27, 33, 38, 39, 44]);
const HIGHLIGHT = 9;

function plots() {
  const out = [];
  BLOCKS.forEach(([x, y, w, h, cols, rows], b) => {
    const cw = w / cols, rh = h / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        out.push({ x: x + c * cw, y: y + r * rh, w: cw, h: rh, b, i: out.length });
      }
    }
  });
  return out;
}
const PLOTS = plots();
const rect = (x, y, w, h) => `M${x.toFixed(1)} ${y.toFixed(1)}h${w.toFixed(1)}v${h.toFixed(1)}h${(-w).toFixed(1)}z`;

export default function SitePlan({ compact }) {
  const d = (s) => ({ animationDelay: `${s}s` });
  return (
    <div className="cip-plan" aria-hidden="true"
      style={{
        WebkitMaskImage: "radial-gradient(60% 58% at 46% 50%, #000 35%, transparent 100%)",
        maskImage: "radial-gradient(60% 58% at 46% 50%, #000 35%, transparent 100%)",
        opacity: compact ? 0.7 : 1,
      }}>
      <svg viewBox="0 0 800 600" fill="none">
        {/* Estate boundary */}
        <path className="d" pathLength="1" style={d(0)} stroke="var(--gold)" strokeOpacity=".55" strokeWidth="1.2"
          d="M66 64 L744 44 L772 548 L44 566 Z" />
        {/* Main road (E–W) and spine (N–S) — two kerb lines each */}
        <path className="d" pathLength="1" style={d(0.35)} stroke="var(--ivory)" strokeOpacity=".22" d="M52 286 H366 M434 286 H760" />
        <path className="d" pathLength="1" style={d(0.4)} stroke="var(--ivory)" strokeOpacity=".22" d="M52 314 H366 M434 314 H762" />
        <path className="d" pathLength="1" style={d(0.45)} stroke="var(--ivory)" strokeOpacity=".22" d="M386 52 V266 M386 334 V560" />
        <path className="d" pathLength="1" style={d(0.5)} stroke="var(--ivory)" strokeOpacity=".22" d="M414 52 V266 M414 334 V560" />
        <path className="d" pathLength="1" style={d(0.9)} stroke="var(--gold)" strokeOpacity=".28" d="M60 300 H740 M400 60 V556" />
        {/* Central circle */}
        <circle className="d" pathLength="1" style={d(0.6)} cx="400" cy="300" r="34" stroke="var(--gold)" strokeOpacity=".6" />
        <circle className="d" pathLength="1" style={d(0.8)} cx="400" cy="300" r="20" stroke="var(--gold)" strokeOpacity=".3" />
        {/* Park beside block D */}
        <path className="d" pathLength="1" style={d(1)} stroke="var(--ivory)" strokeOpacity=".2" d={rect(626, 336, 108, 176)} />
        {[[652, 368], [700, 384], [664, 428], [708, 456], [654, 486]].map(([cx, cy], k) => (
          <circle key={k} className="f" style={d(1.8 + k * 0.08)} cx={cx} cy={cy} r="9" stroke="var(--gold)" strokeOpacity=".35" />
        ))}
        {/* Plot grid */}
        {PLOTS.map((p) => (
          <g key={p.i}>
            {(SOLD.has(p.i) || p.i === HIGHLIGHT) && (
              <path className="f" style={d(1.9 + p.i * 0.012)} d={rect(p.x + 3, p.y + 3, p.w - 6, p.h - 6)}
                fill="var(--gold)" fillOpacity={p.i === HIGHLIGHT ? 0.22 : 0.07} />
            )}
            <path className="d" pathLength="1" style={d(0.7 + p.b * 0.18 + (p.i % 12) * 0.035)} d={rect(p.x, p.y, p.w, p.h)}
              stroke={p.i === HIGHLIGHT ? "var(--gold-lt)" : "var(--gold)"} strokeOpacity={p.i === HIGHLIGHT ? 0.95 : 0.34}
              strokeWidth={p.i === HIGHLIGHT ? 1.4 : 0.9} />
          </g>
        ))}
      </svg>
    </div>
  );
}

// North arrow — drawn flat in screen space, not in the plan's perspective.
export function Compass({ size = 56 }) {
  return (
    <svg className="cip-compass" width={size} height={size} viewBox="0 0 56 56" fill="none" aria-hidden="true">
      <circle cx="28" cy="28" r="22" stroke="var(--line-gold)" />
      <circle cx="28" cy="28" r="1.6" fill="var(--gold)" />
      <path d="M28 9 L32 28 L28 25 L24 28 Z" fill="var(--gold)" fillOpacity=".85" />
      <path d="M28 47 L32 28 L28 31 L24 28 Z" stroke="var(--gold)" strokeOpacity=".5" strokeWidth=".8" />
      <path d="M6 28h4M46 28h4" stroke="var(--line-gold)" />
      <text x="28" y="5.6" textAnchor="middle" fontFamily="var(--font-sans)" fontSize="5.6" fontWeight="600" fill="var(--gold-lt)" letterSpacing=".5">N</text>
    </svg>
  );
}
