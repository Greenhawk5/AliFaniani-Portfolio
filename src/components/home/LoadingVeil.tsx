import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SITE } from '@/app/config'
import { useUiStore } from '@/stores/uiStore'

export function LoadingVeil() {
  const sceneReady = useUiStore((s) => s.sceneReady)
  const [minElapsed, setMinElapsed] = useState(false)
  const [failsafe, setFailsafe] = useState(false)

  useEffect(() => {
    const min = window.setTimeout(() => setMinElapsed(true), 900)
    const max = window.setTimeout(() => setFailsafe(true), 4000)
    return () => {
      window.clearTimeout(min)
      window.clearTimeout(max)
    }
  }, [])

  const hidden = minElapsed && (sceneReady || failsafe)

  return (
    <AnimatePresence>
      {!hidden && (
        <motion.div
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-void"
          exit={{ opacity: 0, transition: { duration: 0.9, ease: 'easeInOut' } }}
          aria-hidden="true"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent/40 bg-accent/10 font-mono text-lg font-bold text-accent shadow-[0_0_30px_-6px_rgba(57,255,139,0.7)]">
              {SITE.shortName}
            </span>
            <div>
              <p className="text-sm font-semibold tracking-wide">{SITE.name}</p>
              <p className="text-xs text-mist">{SITE.shortRole}</p>
            </div>
          </div>
          <div className="mt-8 h-px w-48 overflow-hidden rounded-full bg-edge">
            <motion.div
              className="h-full w-1/3 rounded-full bg-accent shadow-[0_0_14px_rgba(57,255,139,0.9)]"
              animate={{ x: ['-100%', '300%'] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
          <p className="mt-4 font-mono text-[10px] tracking-[0.3em] text-mist/60 uppercase">
            Entering the room
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
