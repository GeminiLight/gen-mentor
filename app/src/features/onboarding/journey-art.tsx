"use client";

import { motion, useReducedMotion } from "motion/react";

const NODES = [{ x: 87, y: 170 }, { x: 173, y: 128 }, { x: 259, y: 76 }];

/** A schematic of the three setup phases, not a generated plan or learning score. */
export function JourneyArt({ phase }: { phase: number }) {
  const reduce = useReducedMotion();
  return <div className="journey-art" aria-hidden>
    <svg viewBox="0 0 360 250" fill="none" focusable="false">
      <g className="atlas-guides" stroke="currentColor" strokeWidth="0.75">
        <path d="M12 206 175 239 347 179M12 188 175 221 347 161M12 170 175 203 347 143M12 152 175 185 347 125" />
        <path d="m54 161 163 33m-117-50 163 33m-117-50 163 33m-157 19 163-58m-120 67 163-58" />
        <path d="M18 48v-8h8m308 146h8v-8M25 211v8h8M321 24h8v8" />
      </g>
      <g className="atlas-sheet">
        <path d="m41 59 268-32 14 175-268 32z" className="atlas-underlay" />
        <path d="m36 49 268-32 14 175-268 32z" className="atlas-middle" />
        <path d="m31 39 268-32 14 175-268 32z" className="atlas-paper" />
        <path d="m32 57 268-32" className="atlas-rule" />
        <circle cx="43" cy="47" r="2" className="atlas-registration" />
        <circle cx="52" cy="46" r="2" className="atlas-registration" />
        <circle cx="61" cy="45" r="2" className="atlas-registration" />
        <path d="M87 170h41q9 0 9-9v-24q0-9 9-9h52q9 0 9-9V85q0-9 9-9h43" className="atlas-route" />
        <motion.path d="M87 170h41q9 0 9-9v-24q0-9 9-9h52q9 0 9-9V85q0-9 9-9h43"
          className="atlas-completed" initial={false} animate={{ pathLength: phase / 2 }}
          transition={{ duration: reduce ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }} />
        {NODES.map(({ x, y }, i) => <g key={i} data-current={phase === i} data-complete={phase > i} className="atlas-node">
          <circle cx={x} cy={y} r="22" className="atlas-node-halo" />
          <rect x={x - 14} y={y - 14} width="28" height="28" rx="7" className="atlas-node-surface" />
          {i === 0 ? <g className="atlas-glyph"><circle cx={x} cy={y} r="6" /><circle cx={x} cy={y} r="2" /><path d={`M${x} ${y-9}v3m0 12v3m-9-9h3m12 0h3`} /></g>
            : i === 1 ? <g className="atlas-glyph"><path d={`m${x-5} ${y+5} 5-10 5 10m-10 0h10`} /><circle cx={x} cy={y-5} r="2" /><circle cx={x-5} cy={y+5} r="2" /><circle cx={x+5} cy={y+5} r="2" /></g>
            : <g className="atlas-glyph"><path d={`M${x-6} ${y-7}h8l4 4v10h-12zm8 0v4h4m-9 3h6m-6 3h4`} /></g>}
        </g>)}
        <g className="atlas-ticks"><path d="m61 191 30-3m60-39 30-3m57-47 30-3" /></g>
      </g>
    </svg>
  </div>;
}
