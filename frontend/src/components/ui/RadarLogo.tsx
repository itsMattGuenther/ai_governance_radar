/** Brand mark (DESIGN_SYSTEM.md §3): accent rings with the green sweep, the only thing
 * on the page that moves (5s rotation, off under prefers-reduced-motion). */

import { SWEEP, T } from "../../lib/tokens";

export function RadarLogo({ size = 20 }: { size?: number }) {
  return (
    <span aria-hidden className="relative block shrink-0" style={{ width: size, height: size }}>
      <span
        className="radar-sweep absolute rounded-full"
        style={{
          inset: size * 0.06,
          background: `conic-gradient(from 0deg, ${SWEEP}CC 0deg, ${SWEEP}55 50deg, transparent 100deg, transparent 360deg)`,
          animation: "radar-spin 5s linear infinite",
        }}
      />
      <svg width={size} height={size} viewBox="0 0 34 34" className="relative block">
        <circle cx="17" cy="17" r="15" fill="none" stroke={T.accent} strokeWidth="2" />
        <circle cx="17" cy="17" r="9" fill="none" stroke={T.accent} strokeWidth="1.2" opacity=".5" />
        <circle cx="17" cy="17" r="2.2" fill={T.accent} />
        <circle cx="24" cy="10" r="2" fill={SWEEP} />
      </svg>
    </span>
  );
}
