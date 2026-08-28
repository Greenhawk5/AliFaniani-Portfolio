import { useEffect } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUiStore } from '@/stores/uiStore'
import { TimeDriver } from './TimeDriver'
import { CameraRig } from './CameraRig'
import { FreeCamRig } from './FreeCamRig'
import { Experience } from './Experience'
import { Effects } from './Effects'

/**
 * Tracks real asset readiness for the Home room. All Home 3D assets (GLB
 * models, textures, environment HDR) load through three's DefaultLoadingManager
 * via useGLTF/useTexture/Environment, which drei's useProgress mirrors.
 * The veil is only released once every tracked item has finished loading —
 * no timers, no fake progress.
 */
function HomeReadiness() {
  const active = useProgress((s) => s.active)
  const progress = useProgress((s) => s.progress)

  useEffect(() => {
    // Released on real readiness — no timers, no fake progress. Item errors
    // (failed downloads that did not throw) still release the veil so the
    // user is never trapped behind a permanent spinner; thrown failures reach
    // the room's error boundary on their own.
    if (!active && progress >= 100) {
      useUiStore.getState().setSceneReady(true)
    }
  }, [active, progress])

  return null
}

export default function Scene() {
  const quality = useSettingsStore((s) => s.quality)
  const cameraMode = useSettingsStore((s) => s.cameraMode)

  return (
    <Canvas
      className="absolute inset-0"
      shadows={quality === 'performance' ? false : { type: THREE.PCFShadowMap }}
      dpr={quality === 'high' ? [1, 2] : quality === 'medium' ? [1, 1.5] : [0.75, 1]}
      camera={{ fov: 42, near: 0.1, far: 80, position: [14.5, 9, 15] }}
      gl={{
        antialias: quality !== 'performance',
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      onCreated={({ gl }) => {
        gl.setClearColor('#05060a')
      }}
      onPointerMissed={() => {
        const ui = useUiStore.getState()
        ui.setFocus(null)
        ui.setHoveredLabel(null)
        document.body.style.cursor = 'auto'
      }}
    >
      <TimeDriver />
      <HomeReadiness />
      <CameraRig />
      {cameraMode === 'free' && <FreeCamRig />}
      <Experience />
      {quality === 'high' && <Effects />}
    </Canvas>
  )
}
