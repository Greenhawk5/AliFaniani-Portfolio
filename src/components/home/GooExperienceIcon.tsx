import type { CSSProperties } from 'react'
import { useId } from 'react'

const ARMS: Array<{ cx: number; cy: number; r: number; dur: string; dir: number; rest: string }> = [
  { cx: 32, cy: 21, r: 7, dur: '2.8s', dir: 1, rest: '20deg' },
  { cx: 32, cy: 17.5, r: 5.5, dur: '3.6s', dir: -1, rest: '140deg' },
  { cx: 32, cy: 23, r: 4.6, dur: '2.2s', dir: 1, rest: '255deg' },
  { cx: 32, cy: 16, r: 4, dur: '4.4s', dir: -1, rest: '310deg' },
]

/**
 * Decorative animated "goo" icon for the landing-page CTA to /room.
 *
 * Entirely decorative: no role="img", no aria-label — the accessible name of
 * the CTA comes from the surrounding link. Color follows `currentColor`, so
 * the site's accent token (text-accent) drives the green. The goo-weld filter
 * id is namespaced per component instance via useId to avoid collisions when
 * rendered more than once.
 *
 * Reduced motion: arms stop at their --rest rotation and the core stops
 * breathing, matching the global prefers-reduced-motion behavior.
 */
export function GooExperienceIcon({ className }: { className?: string }) {
  const filterId = `goo-weld-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <style>{`
        .goo-arm {
          transform-box: view-box;
          transform-origin: center;
          animation: goo-swing calc(var(--dur) * var(--rate, 1)) linear infinite;
        }
        .goo-core {
          transform-box: view-box;
          transform-origin: center;
          animation: goo-breathe calc(3.2s * var(--rate, 1)) ease-in-out infinite;
        }
        @keyframes goo-swing {
          from { transform: rotate(0deg); }
          to { transform: rotate(calc(var(--dir) * 360deg)); }
        }
        @keyframes goo-breathe {
          0%, 100% { transform: scale(.82); }
          50% { transform: scale(1.05); }
        }
        @media (prefers-reduced-motion: reduce) {
          .goo-arm { animation: none; transform: rotate(var(--rest)); }
          .goo-core { animation: none; transform: scale(1); }
        }
      `}</style>

      <defs>
        <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.6" result="soft" />
          <feColorMatrix
            in="soft"
            type="matrix"
            values="1 0 0 0 0
                    0 1 0 0 0
                    0 0 1 0 0
                    0 0 0 19 -8"
          />
        </filter>
      </defs>

      <circle className="goo-bound" cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="1" opacity="0.14" />

      <g filter={`url(#${filterId})`} fill="currentColor">
        <circle className="goo-core" cx="32" cy="32" r="9.5" />
        {ARMS.map((arm) => (
          <g
            key={arm.rest}
            className="goo-arm"
            style={{ '--dur': arm.dur, '--dir': arm.dir, '--rest': arm.rest } as CSSProperties}
          >
            <circle cx={arm.cx} cy={arm.cy} r={arm.r} />
          </g>
        ))}
      </g>
    </svg>
  )
}