import { useEffect, useState } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'
import { useTimeStore } from '@/stores/timeStore'
import {
  computeHours,
  formatClock,
  formatDateLabel,
  timezoneLabel,
} from '@/lib/timeController'

export function useClockText(pollMs = 1000) {
  const timezoneMode = useSettingsStore((s) => s.timezoneMode)
  const mode = useTimeStore((s) => s.mode)
  const simulationHours = useTimeStore((s) => s.simulationHours)
  const [, setTick] = useState(0)

  useEffect(() => {
    if (mode === 'simulation') return
    const id = window.setInterval(() => setTick((t) => t + 1), pollMs)
    return () => window.clearInterval(id)
  }, [mode, pollMs])

  const hours = computeHours(mode, timezoneMode, simulationHours)
  return {
    hours,
    clock: formatClock(hours),
    dateLabel: formatDateLabel(timezoneMode),
    tzLabel: timezoneLabel(timezoneMode),
  }
}
