import { useMemo } from 'react'
import { cn } from '@/lib/cn'
import {
  EChartsPieChart,
  type ChartConfig as PieChartConfig,
} from '@/components/evilcharts/charts/echarts-pie-chart'
import {
  EChartsAreaChart,
  type ChartConfig as AreaChartConfig,
} from '@/components/evilcharts/charts/echarts-area-chart'

export interface DonutSlice {
  [key: string]: unknown
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
 * Official EvilCharts Donut Distribution Chart powered by Apache ECharts.
 * Eliminates hover offset mismatches and stale tooltips with native ECharts hit testing.
 */
export function DonutDistributionChart({
  data,
  ariaLabel,
  className,
}: DonutChartProps) {
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data])

  const chartConfig = useMemo(() => {
    const cfg: Record<string, { label: string; colors: { light: string[]; dark: string[] } }> = {}
    for (const d of data) {
      cfg[d.id] = {
        label: d.label,
        colors: {
          light: [d.color],
          dark: [d.color],
        },
      }
    }
    return cfg as PieChartConfig
  }, [data])

  if (total === 0 || data.length === 0) {
    return (
      <div
        className={cn(
          'flex h-48 w-full flex-col items-center justify-center gap-1 font-mono text-xs text-mist',
          className
        )}
        aria-label={ariaLabel}
      >
        <span>No activity events recorded yet.</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-between gap-6 sm:flex-row sm:items-center',
        className
      )}
      aria-label={ariaLabel}
    >
      {/* Left Column: Donut chart with centered total aggregate */}
      <div className="relative flex h-48 w-48 shrink-0 items-center justify-center">
        <EChartsPieChart
          data={data}
          dataKey="value"
          nameKey="id"
          config={chartConfig}
          className="h-full w-full"
        >
          <EChartsPieChart.Tooltip />
          <EChartsPieChart.Pie
            isClickable
            innerRadius={50}
            outerRadius={72}
            paddingAngle={3}
            cornerRadius={4}
          />
        </EChartsPieChart>

        {/* Center aggregate count */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-mono text-2xl font-bold tracking-tight text-frost">
            {total.toLocaleString()}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-mist">
            Events
          </span>
        </div>
      </div>

      {/* Right Column: Category statistics breakdown */}
      <div className="flex w-full flex-1 flex-col justify-center gap-3.5">
        {data.map((slice) => {
          const percentage = total > 0 ? ((slice.value / total) * 100).toFixed(1) : '0.0'
          const numValue = slice.value || 0
          return (
            <div key={slice.id} className="space-y-1.5">
              <div className="flex items-center justify-between font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: slice.color }}
                    aria-hidden="true"
                  />
                  <span className="font-medium text-frost">{slice.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold tabular-nums text-frost">
                    {numValue.toLocaleString()}
                  </span>
                  <span className="text-[11px] tabular-nums text-mist">
                    ({percentage}%)
                  </span>
                </div>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full border border-edge/60 bg-panel-2">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.max(Number(percentage), numValue > 0 ? 2 : 0)}%`,
                    backgroundColor: slice.color,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export interface TrendPoint {
  [key: string]: unknown
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
  tooltipHeaderColor?: string
}

/**
 * Official EvilCharts Area Trend Chart powered by Apache ECharts.
 * Smooth gradient fills, verified hover crosshairs, and crisp tooltips.
 */
export function AreaTrendChart({
  data,
  height = 140,
  ariaLabel,
  color = '#37d5ff',
  className,
  tooltipHeaderColor,
}: AreaTrendChartProps) {
  const chartConfig = useMemo(() => {
    return {
      value: {
        label: 'Events',
        colors: {
          light: [color],
          dark: [color],
        },
      },
    } as AreaChartConfig
  }, [color])

  if (data.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center font-mono text-xs text-mist',
          className
        )}
        style={{ height }}
        aria-label={ariaLabel}
      >
        No trend data recorded.
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)} style={{ height }} aria-label={ariaLabel}>
      <EChartsAreaChart
        data={data}
        config={chartConfig}
        xDataKey="label"
        className="h-full w-full"
      >
        <EChartsAreaChart.Grid />
        <EChartsAreaChart.XAxis dataKey="label" />
        <EChartsAreaChart.Tooltip labelColor={tooltipHeaderColor} />
        <EChartsAreaChart.Area dataKey="value" variant="gradient" isClickable>
          <EChartsAreaChart.Dot variant="border" />
          <EChartsAreaChart.ActiveDot variant="colored-border" />
        </EChartsAreaChart.Area>
      </EChartsAreaChart>
    </div>
  )
}
