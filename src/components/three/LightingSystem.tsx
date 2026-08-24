import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUiStore } from '@/stores/uiStore'
import { env } from '@/three/env'

export function LightingSystem() {
  const quality = useSettingsStore((s) => s.quality)
  const lampOn = useUiStore((s) => s.lampOn)

  const sunRef = useRef<THREE.DirectionalLight>(null)
  const moonRef = useRef<THREE.DirectionalLight>(null)
  const ambientRef = useRef<THREE.AmbientLight>(null)
  const hemiRef = useRef<THREE.HemisphereLight>(null)
  const windowLightRef = useRef<THREE.PointLight>(null)
  const monitorLightRef = useRef<THREE.PointLight>(null)
  const lampLightRef = useRef<THREE.SpotLight>(null)
  const floorLampRef = useRef<THREE.PointLight>(null)
  const lampTarget = useMemo(() => new THREE.Object3D(), [])
  const lampIntensity = useRef(0)
  const floorLampIntensity = useRef(0)

  const shadows = quality !== 'performance'
  const shadowMapSize = quality === 'high' ? 2048 : 1024

  useFrame((_, dt) => {
    const sun = sunRef.current
    if (sun) {
      sun.position.copy(env.sunPosition)
      sun.intensity = env.sunIntensity
      sun.color.copy(env.sun)
    }
    const moon = moonRef.current
    if (moon) {
      moon.position.copy(env.moonPosition)
      moon.intensity = env.moonIntensity
    }
    if (ambientRef.current) {
      ambientRef.current.intensity = env.ambientIntensity
      ambientRef.current.color.copy(env.ambient)
    }
    if (hemiRef.current) {
      hemiRef.current.intensity = env.hemiIntensity
      hemiRef.current.color.copy(env.hemiSky)
      hemiRef.current.groundColor.copy(env.hemiGround)
    }
    if (windowLightRef.current) {
      windowLightRef.current.intensity = env.windowGlow * 8
      windowLightRef.current.color.copy(env.windowGlowColor)
    }
    if (monitorLightRef.current) {
      const flicker = 1 + Math.sin(env.time * 11.3) * 0.05 + Math.sin(env.time * 27.7) * 0.03
      monitorLightRef.current.intensity = env.monitor * 4.4 * flicker
    }
    const k = 1 - Math.exp(-dt * 6)
    lampIntensity.current += ((lampOn ? 9 : 0) - lampIntensity.current) * k
    if (lampLightRef.current) lampLightRef.current.intensity = lampIntensity.current
    const autoWarm = 0.6 + env.rgb * 4.5
    floorLampIntensity.current += (autoWarm - floorLampIntensity.current) * k
    if (floorLampRef.current) floorLampRef.current.intensity = floorLampIntensity.current
  })

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.5} />
      <hemisphereLight ref={hemiRef} intensity={0.5} />
      <directionalLight
        ref={sunRef}
        castShadow={shadows}
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-camera-near={0.5}
        shadow-camera-far={45}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <directionalLight ref={moonRef} color="#7a8fd0" />
      <pointLight
        ref={windowLightRef}
        position={[1.4, 2.2, -3.85]}
        distance={10}
        decay={2}
      />
      <pointLight ref={monitorLightRef} position={[1.2, 1.75, -2.85]} distance={5.5} decay={2} color="#7ab8ff" />
      <primitive object={lampTarget} position={[1.1, 1.05, -3.2]} />
      <spotLight
        ref={lampLightRef}
        target={lampTarget}
        position={[-0.05, 1.72, -3.78]}
        angle={0.7}
        penumbra={0.65}
        distance={7}
        decay={2}
        color="#ffd9a0"
      />
      <pointLight
        ref={floorLampRef}
        position={[3.95, 1.62, 0.9]}
        distance={6.5}
        decay={2}
        color="#ffc98a"
      />
    </>
  )
}
