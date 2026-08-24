import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useTimeStore } from '@/stores/timeStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { computeHours } from '@/lib/timeController'
import { env, updateEnvironment } from '@/three/env'

export function TimeDriver() {
  const mode = useTimeStore((s) => s.mode)
  const timezoneMode = useSettingsStore((s) => s.timezoneMode)
  const simulationHours = useTimeStore((s) => s.simulationHours)
  const scene = useThree((s) => s.scene)
  const fog = useMemo(() => new THREE.FogExp2(0x05060c, 0.02), [])

  useEffect(() => {
    scene.fog = fog
    scene.background = env.background
    return () => {
      scene.fog = null
      scene.background = null
    }
  }, [scene, fog])

  useFrame((_, dt) => {
    env.time += Math.min(dt, 0.1)
    const hours = computeHours(mode, timezoneMode, simulationHours)
    updateEnvironment(hours)
    fog.color.copy(env.background)
    fog.density = env.fogDensity
  })

  return null
}
