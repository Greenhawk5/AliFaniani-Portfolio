import type { TimezoneMode } from '@/stores/settingsStore'
import type { TimeMode } from '@/stores/timeStore'

export function computeHours(
  mode: TimeMode,
  timezoneMode: TimezoneMode,
  simulationHours: number
): number {
  if (mode === 'simulation') return ((simulationHours % 24) + 24) % 24
  const now = new Date()
  if (timezoneMode === 'utc') {
    return (
      now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600
    )
  }
  return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600
}

export function formatClock(hours: number): string {
  const h = Math.floor(((hours % 24) + 24) % 24)
  const m = Math.floor((hours * 60) % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function formatDateLabel(timezoneMode: TimezoneMode): string {
  const now = new Date()
  const weekday = now.toLocaleDateString('en-US', {
    weekday: 'long',
    timeZone: timezoneMode === 'utc' ? 'UTC' : undefined,
  })
  const monthDay = now.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    timeZone: timezoneMode === 'utc' ? 'UTC' : undefined,
  })
  return `${weekday} · ${monthDay}`
}

export function timeOfDayLabel(hours: number): string {
  if (hours < 5.5) return 'Night'
  if (hours < 8) return 'Dawn'
  if (hours < 11) return 'Morning'
  if (hours < 16) return 'Day'
  if (hours < 19) return 'Sunset'
  return 'Night'
}

export function timezoneLabel(timezoneMode: TimezoneMode): string {
  return timezoneMode === 'utc' ? 'UTC TIME' : 'LOCAL TIME'
}

