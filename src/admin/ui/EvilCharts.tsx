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
          'flex h-44 w-full items-center justify-center font-mono text-xs text-mist',
          className
        )}
        aria-label={ariaLabel}
      >
        No activity events recorded yet.
      </div>
    )
  }

  return (
    <div className={cn('h-48 w-full', className)} aria-label={ariaLabel}>
      <EChartsPieChart
        data={data}
        dataKey="value"
        nameKey="id"
        config={chartConfig}
        className="h-full w-full"
      >
        <EChartsPieChart.Legend isClickable />
        <EChartsPieChart.Tooltip />
        <EChartsPieChart.Pie
          isClickable
          innerRadius={46}
          outerRadius={72}
          paddingAngle={3}
          cornerRadius={4}
        />
      </EChartsPieChart>
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
        <EChartsAreaChart.Tooltip />
        <EChartsAreaChart.Area dataKey="value" variant="gradient" isClickable>
          <EChartsAreaChart.Dot variant="border" />
          <EChartsAreaChart.ActiveDot variant="colored-border" />
        </EChartsAreaChart.Area>
      </EChartsAreaChart>
    </div>
  )
}
