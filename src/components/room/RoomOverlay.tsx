import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUiStore, type FocusTarget } from '@/stores/uiStore'
import { useTimeStore } from '@/stores/timeStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useClockText } from '@/hooks/useClockText'
import { timeOfDayLabel } from '@/lib/timeController'
import { useIsTouch } from '@/hooks/useMediaQuery'
import {
  ClockIcon,
  CloseIcon,
  SparkleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@/components/ui/icons'

const FOCUS_TITLES: Record<string, string> = {
  monitor: 'Workstation Monitor',
  clock: 'Digital Wall Clock',
  projectBoard: 'Project Board',
  socialBoard: 'Social Board',
}

const BOARD_NAV_TARGETS: ReadonlySet<FocusTarget> = new Set(['projectBoard', 'socialBoard'])

export function RoomOverlay() {
  const [deviceNoteVisible, setDeviceNoteVisible] = useState(true)
  const hintVisible = useUiStore((s) => s.hintVisible)
  const dismissHint = useUiStore((s) => s.dismissHint)
  const hoveredLabel = useUiStore((s) => s.hoveredLabel)
  const focus = useUiStore((s) => s.focus)
  const setFocus = useUiStore((s) => s.setFocus)
  const sendBoardNav = useUiStore((s) => s.sendBoardNav)
  const toggleSettings = useUiStore((s) => s.toggleSettings)

  const timeMode = useTimeStore((s) => s.mode)
  const simulationHours = useTimeStore((s) => s.simulationHours)
  const setSimulationHours = useTimeStore((s) => s.setSimulationHours)
  const setMode = useTimeStore((s) => s.setMode)
  const { clock } = useClockText()
  const timezoneMode = useSettingsStore((s) => s.timezoneMode)
  const isTouch = useIsTouch()
  const verb = isTouch ? 'Tap' : 'click'

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <AnimatePresence>
        {deviceNoteVisible && (
          <motion.div
            key="device-note"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 1.2, duration: 0.6 } }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-[7.5rem] left-1/2 flex max-w-[92vw] -translate-x-1/2 items-center gap-2.5 rounded-full border border-edge-2 bg-panel/80 py-1.5 pr-2 pl-4 backdrop-blur-md md:hidden"
          >
            <SparkleIcon className="h-3.5 w-3.5 shrink-0 text-accent" />
            <p className="text-xs whitespace-nowrap text-frost/90">
              For a better 3D room experience, use a{' '}
              <span className="text-accent">laptop or PC</span>
            </p>
            <button
              onClick={() => setDeviceNoteVisible(false)}
              aria-label="Dismiss device note"
              className="pointer-events-auto relative ml-1 rounded-full p-1 text-mist transition-colors hover:text-frost cursor-pointer before:absolute before:-inset-2.5 before:rounded-full before:content-['']"
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {hintVisible && !focus && timeMode !== 'simulation' && (
          <motion.div
            key="hint"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 2.6, duration: 0.6 } }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 flex max-w-[92vw] -translate-x-1/2 items-center gap-2.5 rounded-2xl border border-edge-2 bg-panel/80 py-2 pr-2.5 pl-4 backdrop-blur-md sm:rounded-full"
          >
            <SparkleIcon className="h-3.5 w-3.5 shrink-0 text-accent" />
            <p className="text-xs leading-relaxed text-frost/90">
              Explore the room — {verb} the <span className="text-accent">board</span>,{' '}
              <span className="text-accent">monitor</span>, <span className="text-accent">clock</span>{' '}
              or <span className="text-accent">PC</span>
            </p>
            <button
              onClick={dismissHint}
              aria-label="Dismiss hint"
              className="pointer-events-auto relative ml-1 rounded-full p-1 text-mist transition-colors hover:text-frost cursor-pointer before:absolute before:-inset-2.5 before:rounded-full before:content-['']"
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hoveredLabel && !focus && (
          <motion.div
            key="hover-label"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-lg border border-accent/30 bg-void/80 px-3.5 py-1.5 font-mono text-[11px] tracking-wider text-accent backdrop-blur-sm"
          >
            {hoveredLabel}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {focus && (
          <motion.div
            key="focus-bar"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="pointer-events-auto absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-edge-2 bg-panel/85 py-2 pr-1.5 pl-4 backdrop-blur-md sm:gap-3 sm:pr-2 sm:pl-5"
          >
            <p className="text-xs whitespace-nowrap text-frost/90">
              <span className="font-mono text-accent">{FOCUS_TITLES[focus] ?? focus}</span>
              <span className="ml-2 hidden text-mist sm:inline">press ESC to exit</span>
            </p>
            {BOARD_NAV_TARGETS.has(focus) && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => sendBoardNav(focus, -1)}
                  aria-label="Previous slide"
                  className="relative rounded-full border border-edge-2 p-1.5 text-frost transition-colors hover:border-accent/50 hover:text-accent cursor-pointer before:absolute before:-inset-2 before:rounded-full before:content-['']"
                >
                  <ChevronLeftIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => sendBoardNav(focus, 1)}
                  aria-label="Next slide"
                  className="relative rounded-full border border-edge-2 p-1.5 text-frost transition-colors hover:border-accent/50 hover:text-accent cursor-pointer before:absolute before:-inset-2 before:rounded-full before:content-['']"
                >
                  <ChevronRightIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <button
              onClick={() => setFocus(null)}
              className="flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-xs font-semibold text-void transition-colors hover:bg-[#5cffa2] cursor-pointer"
            >
              <ChevronLeftIcon className="h-3.5 w-3.5" />
              Back to room
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={toggleSettings}
        className="pointer-events-auto absolute top-20 right-4 flex items-center gap-2 rounded-full border border-edge-2 bg-panel/80 px-3.5 py-2 backdrop-blur-md transition-colors hover:border-accent/40 md:right-6 cursor-pointer"
        aria-label="Open time settings"
      >
        <ClockIcon className="h-3.5 w-3.5 text-accent" />
        <span className="font-mono text-xs text-frost">{clock}</span>
        <span className="font-mono text-[9px] tracking-widest text-mist uppercase">
          {timeMode === 'simulation' ? timeOfDayLabel(simulationHours) : timezoneMode}
        </span>
      </button>

      <AnimatePresence>
        {timeMode === 'simulation' && !focus && (
          <motion.div
            key="sim-bar"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
            exit={{ opacity: 0, y: 20 }}
            className="pointer-events-auto absolute bottom-16 left-1/2 flex w-[min(92vw,430px)] -translate-x-1/2 items-center gap-3 rounded-2xl border border-edge-2 bg-panel/85 px-4 py-3 backdrop-blur-md"
          >
            <span className="font-mono text-xs text-accent">{clock}</span>
            <input
              type="range"
              min={0}
              max={23.99}
              step={0.05}
              value={simulationHours}
              aria-label="Time of day slider"
              onChange={(e) => setSimulationHours(Number(e.target.value))}
              className="time-slider flex-1"
            />
            <button
              onClick={() => setMode('live')}
              className="relative rounded-full border border-accent/40 px-2.5 py-1.5 font-mono text-[9px] tracking-widest text-accent uppercase transition-colors hover:bg-accent/10 cursor-pointer before:absolute before:-inset-1.5 before:rounded-full before:content-['']"
            >
              Live
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
