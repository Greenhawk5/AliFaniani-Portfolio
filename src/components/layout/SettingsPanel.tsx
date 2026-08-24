import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { useSettingsStore, type Quality, type MotionMode, type TimezoneMode } from '@/stores/settingsStore'
import { useTimeStore } from '@/stores/timeStore'
import { useUiStore } from '@/stores/uiStore'
import { useClockText } from '@/hooks/useClockText'
import { cn } from '@/lib/cn'
import { CloseIcon, ClockIcon } from '@/components/ui/icons'

function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: Array<{ value: T; label: string; hint?: string }>
  value: T
  onChange: (v: T) => void
  ariaLabel: string
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="grid grid-cols-3 gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          role="radio"
          aria-checked={value === opt.value}
          title={opt.hint}
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-lg border px-2 py-2 text-xs font-medium transition-all cursor-pointer',
            value === opt.value
              ? 'border-accent/60 bg-accent/10 text-accent shadow-[0_0_16px_-6px_rgba(57,255,139,0.6)]'
              : 'border-edge bg-abyss text-mist hover:border-edge-2 hover:text-frost'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function SettingsPanel() {
  const open = useUiStore((s) => s.settingsOpen)
  const close = () => useUiStore.getState().setSettingsOpen(false)
  const quality = useSettingsStore((s) => s.quality)
  const motionMode = useSettingsStore((s) => s.motion)
  const timezoneMode = useSettingsStore((s) => s.timezoneMode)
  const setQuality = useSettingsStore((s) => s.setQuality)
  const setMotion = useSettingsStore((s) => s.setMotion)
  const setTimezoneMode = useSettingsStore((s) => s.setTimezoneMode)
  const reset = useSettingsStore((s) => s.reset)

  const timeMode = useTimeStore((s) => s.mode)
  const simulationHours = useTimeStore((s) => s.simulationHours)
  const setTimeMode = useTimeStore((s) => s.setMode)
  const setSimulationHours = useTimeStore((s) => s.setSimulationHours)

  const { clock, dateLabel, tzLabel } = useClockText()

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[80] bg-void/60 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            aria-hidden="true"
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            className="fixed top-0 right-0 z-[85] flex h-dvh w-full max-w-sm flex-col border-l border-edge-2 bg-panel shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="flex items-center justify-between border-b border-edge px-5 py-4">
              <h2 className="text-sm font-semibold tracking-wide text-frost uppercase">
                Settings
              </h2>
              <button
                onClick={close}
                aria-label="Close settings"
                className="rounded-lg p-1.5 text-mist transition-colors hover:bg-panel-2 hover:text-frost cursor-pointer"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 space-y-7 overflow-y-auto px-5 py-6">
              <section className="space-y-2.5">
                <h3 className="font-mono text-[11px] tracking-[0.2em] text-mist uppercase">
                  Graphics
                </h3>
                <Segmented<Quality>
                  ariaLabel="Graphics quality"
                  value={quality}
                  onChange={setQuality}
                  options={[
                    { value: 'high', label: 'High', hint: 'Shadows, particles, bloom' },
                    { value: 'medium', label: 'Medium', hint: 'Balanced rendering' },
                    { value: 'performance', label: 'Performance', hint: 'Lightest rendering' },
                  ]}
                />
                <p className="text-[11px] leading-relaxed text-mist/70">
                  Auto-detected from your device. Higher tiers enable shadows, particles and
                  bloom in the 3D room.
                </p>
              </section>

              <section className="space-y-2.5">
                <h3 className="font-mono text-[11px] tracking-[0.2em] text-mist uppercase">
                  Time
                </h3>
                <Segmented
                  ariaLabel="Time mode"
                  value={timeMode}
                  onChange={(v) => setTimeMode(v as 'live' | 'simulation')}
                  options={[
                    { value: 'live', label: 'Live' },
                    { value: 'simulation', label: 'Simulation' },
                  ]}
                />
                {timeMode === 'live' ? (
                  <div className="space-y-2.5">
                    <Segmented<TimezoneMode>
                      ariaLabel="Timezone"
                      value={timezoneMode}
                      onChange={setTimezoneMode}
                      options={[
                        { value: 'local', label: 'Local' },
                        { value: 'utc', label: 'UTC' },
                      ]}
                    />
                  </div>
                ) : (
                  <div className="space-y-2.5 rounded-xl border border-edge bg-abyss p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs text-mist">
                        <ClockIcon className="h-3.5 w-3.5 text-accent" />
                        Simulated time
                      </span>
                      <span className="font-mono text-sm text-accent">{clock}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={23.99}
                      step={0.05}
                      value={simulationHours}
                      aria-label="Time of day slider"
                      onChange={(e) => setSimulationHours(Number(e.target.value))}
                      className="time-slider w-full"
                    />
                    <div className="flex justify-between font-mono text-[9px] tracking-wider text-mist/60 uppercase">
                      <span>Dawn</span>
                      <span>Day</span>
                      <span>Sunset</span>
                      <span>Night</span>
                    </div>
                  </div>
                )}
                <p className="text-[11px] leading-relaxed text-mist/70">
                  {dateLabel} · {tzLabel}
                </p>
              </section>

              <section className="space-y-2.5">
                <h3 className="font-mono text-[11px] tracking-[0.2em] text-mist uppercase">
                  Motion
                </h3>
                <Segmented<MotionMode>
                  ariaLabel="Motion preference"
                  value={motionMode}
                  onChange={setMotion}
                  options={[
                    { value: 'full', label: 'Full' },
                    { value: 'reduced', label: 'Reduced' },
                  ]}
                />
                <p className="text-[11px] leading-relaxed text-mist/70">
                  Reduced motion disables camera parallax and ambient animation for a calmer
                  experience.
                </p>
              </section>
            </div>

            <footer className="border-t border-edge px-5 py-4">
              <button
                onClick={reset}
                className="w-full rounded-lg border border-edge py-2 text-xs text-mist transition-colors hover:border-edge-2 hover:text-frost cursor-pointer"
              >
                Reset to defaults
              </button>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

