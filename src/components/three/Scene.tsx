import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUiStore } from '@/stores/uiStore'
import { TimeDriver } from './TimeDriver'
import { CameraRig } from './CameraRig'
import { Experience } from './Experience'
import { Effects } from './Effects'

export default function Scene() {
  const quality = useSettingsStore((s) => s.quality)

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
        useUiStore.getState().setSceneReady(true)
      }}
      onPointerMissed={() => {
        const ui = useUiStore.getState()
        ui.setFocus(null)
        ui.setHoveredLabel(null)
        document.body.style.cursor = 'auto'
      }}
    >
      <TimeDriver />
      <CameraRig />
      <Experience />
      {quality === 'high' && <Effects />}
    </Canvas>
  )
}
