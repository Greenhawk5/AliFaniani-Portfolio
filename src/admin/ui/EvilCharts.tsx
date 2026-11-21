import { useState, useId } from 'react'
import { cn } from '@/lib/cn'

export interface DonutSlice {
  id: string
  label: string
  value: number
  color: string
}

export interface DonutChartProps {
  data: DonutSlice[]
  title?: string
  ariaLabel: string
  className?: string
}

/**
 * EvilCharts Donut Distribution Chart.
 *
 * Lightweight, high-precision SVG donut chart with interactive hover slices,
 * center percentage readout, and accessible ARIA markup.
 */
export function DonutDistributionChart({
  data,
  title,
  ariaLabel,
  className,
}: DonutChartProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const total = data.reduce((sum, d) => sum + d.value, 0)

  const size = 140
  const center = size / 2
  const radius = 48
  const strokeWidth = 14
  const circumference = 2 * Math.PI * radius

  let currentOffset = 0
  const slices = data.map((d) => {
    const fraction = total > 0 ? d.value / total : 0
    const strokeDasharray = `${fraction * circumference} ${circumference}`
    const strokeDashoffset = -currentOffset
    currentOffset += fraction * circumference
    return {
      ...d,
      fraction,
      percentage: Math.round(fraction * 100),
      strokeDasharray,
      strokeDashoffset,
    }
  })

  const activeSlice = hoveredId
    ? slices.find((s) => s.id === hoveredId)
    : slices[0]

  return (
    <div className={cn('flex flex-col sm:flex-row items-center gap-6', className)}>
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg
          role="img"
          aria-label={ariaLabel}
          viewBox={`0 0 ${size} ${size}`}
          className="h-full w-full -rotate-90 transform"
        >
          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />

          {/* Slices */}
          {slices.map((slice) => (
            <circle
              key={slice.id}
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={slice.color}
              strokeWidth={slice.id === hoveredId ? strokeWidth + 3 : strokeWidth}
              strokeDasharray={slice.strokeDasharray}
              strokeDashoffset={slice.strokeDashoffset}
              strokeLinecap="round"
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHoveredId(slice.id)}
              onMouseLeave={() => setHoveredId(null)}
            />
          ))}
        </svg>

        {/* Center readout */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-mono text-base font-bold text-frost">
            {total > 0 && activeSlice ? `${activeSlice.percentage}%` : '0%'}
          </span>
          <span className="max-w-[70px] truncate font-mono text-[9px] uppercase tracking-wider text-mist">
            {activeSlice?.label ?? 'Total'}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-1 flex-col justify-center space-y-1.5 w-full">
        {title && (
          <p className="mb-1 font-mono text-[10px] tracking-wider text-mist uppercase">
            {title}
          </p>
        )}
        {slices.map((slice) => (
          <div
            key={slice.id}
            onMouseEnter={() => setHoveredId(slice.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={cn(
              'flex items-center justify-between rounded px-2 py-1 transition-colors cursor-pointer',
              hoveredId === slice.id ? 'bg-white/5' : 'hover:bg-white/[0.02]'
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="font-mono text-xs text-frost">{slice.label}</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-frost font-semibold">{slice.value}</span>
              <span className="text-mist/60 text-[10px]">({slice.percentage}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export interface TrendPoint {
  label: string
  value: number
  fullDate?: string
}

export interface AreaTrendChartProps {
  data: TrendPoint[]
  height?: number
  ariaLabel: string
  color?: string
  className?: string
}

/**
 * EvilCharts Area Trend Chart.
 *
 * Smooth Bézier curves with interactive hover crosshairs, glowing data nodes,
 * and data-truthful auto-scaling ceiling.
 */
export function AreaTrendChart({
  data,
  height = 140,
  ariaLabel,
  color = '#39ff8b',
  className,
}: AreaTrendChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const gradientId = useId()

  if (data.length === 0) {
    return (
      <div
        className={cn('flex items-center justify-center text-mist font-mono text-xs', className)}
        style={{ height }}
      >
        No trend data recorded.
      </div>
    )
  }

  const width = 500
  const paddingX = 24
  const paddingY = 20
  const innerW = width - paddingX * 2
  const innerH = height - paddingY * 2

  const max = Math.max(1, ...data.map((d) => d.value))
  const magnitude = 10 ** Math.max(0, Math.floor(Math.log10(max)))
  const niceMax = [1, 2, 5, 10].map((m) => m * magnitude).find((m) => m >= max) ?? max

  const points = data.map((d, i) => {
    const x = paddingX + (i / Math.max(1, data.length - 1)) * innerW
    const y = paddingY + innerH - (d.value / niceMax) * innerH
    return { ...d, x, y }
  })

  // Generate smooth SVG Bézier path
  let pathD = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i]
    const next = points[i + 1]
    const midX = (curr.x + next.x) / 2
    pathD += ` C ${midX} ${curr.y}, ${midX} ${next.y}, ${next.x} ${next.y}`
  }

  const areaD = `${pathD} L ${points[points.length - 1].x} ${paddingY + innerH} L ${points[0].x} ${paddingY + innerH} Z`

  const activePoint = hoverIndex !== null && hoverIndex >= 0 ? points[hoverIndex] : null

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const mouseX = ((e.clientX - rect.left) / rect.width) * width
    // Find closest point by x
    let closestIdx = 0
    let minDiff = Infinity
    points.forEach((p, i) => {
      const diff = Math.abs(p.x - mouseX)
      if (diff < minDiff) {
        minDiff = diff
        closestIdx = i
      }
    })
    setHoverIndex(closestIdx)
  }

  return (
    <div className={cn('relative w-full select-none', className)}>
      <svg
        role="img"
        aria-label={ariaLabel}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Gridlines */}
        <line
          x1={paddingX}
          y1={paddingY}
          x2={width - paddingX}
          y2={paddingY}
          stroke="rgba(255,255,255,0.08)"
          strokeDasharray="3 3"
        />
        <line
          x1={paddingX}
          y1={paddingY + innerH / 2}
          x2={width - paddingX}
          y2={paddingY + innerH / 2}
          stroke="rgba(255,255,255,0.05)"
          strokeDasharray="3 3"
        />
        <line
          x1={paddingX}
          y1={paddingY + innerH}
          x2={width - paddingX}
          y2={paddingY + innerH}
          stroke="rgba(255,255,255,0.12)"
        />

        {/* Filled gradient area */}
        <path d={areaD} fill={`url(#${gradientId})`} />

        {/* Stroke line */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Interactive hover elements */}
        {activePoint && (
          <g>
            <line
              x1={activePoint.x}
              y1={paddingY}
              x2={activePoint.x}
              y2={paddingY + innerH}
              stroke="rgba(255,255,255,0.25)"
              strokeDasharray="2 2"
            />
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r="4.5"
              fill={color}
              stroke="#0a0e18"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>

      {/* Floating tooltip */}
      {activePoint && (
        <div
          className="pointer-events-none absolute -top-9 z-20 -translate-x-1/2 transform rounded border border-edge-2 bg-panel-2 px-2 py-0.5 shadow-xl backdrop-blur-md"
          style={{ left: `${(activePoint.x / width) * 100}%` }}
        >
          <span className="font-mono text-[10px] text-frost">
            {activePoint.fullDate || activePoint.label}:{' '}
            <strong className="text-accent">{activePoint.value}</strong>
          </span>
        </div>
      )}

      {/* Scale indicators */}
      <div className="mt-1 flex items-center justify-between font-mono text-[9px] text-mist/60">
        <span>{points[0]?.label}</span>
        <span>Peak: {max}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  )
}
