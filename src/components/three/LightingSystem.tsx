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
  const nightFillRef = useRef<THREE.PointLight>(null)
  const shelfAccentRef = useRef<THREE.PointLight>(null)
  const boardAccentRef = useRef<THREE.PointLight>(null)
  const plantAccentRef = useRef<THREE.PointLight>(null)
  const loungeAccentRef = useRef<THREE.PointLight>(null)
  const nightFactor = useRef(0)
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

    // Night fill + accents: driven by the day/night cycle (sun intensity).
    // Fades in smoothly as the sun sets, zero influence during daytime.
    const targetNight = Math.pow(1 - Math.min(1, env.sunIntensity / 0.45), 1.4)
    nightFactor.current += (targetNight - nightFactor.current) * k
    const night = nightFactor.current
    if (nightFillRef.current) nightFillRef.current.intensity = night * 1.7
    if (shelfAccentRef.current) shelfAccentRef.current.intensity = night * 1.1
    if (boardAccentRef.current) boardAccentRef.current.intensity = night * 0.85
    if (plantAccentRef.current) plantAccentRef.current.intensity = night * 0.7
    if (loungeAccentRef.current) loungeAccentRef.current.intensity = night * 0.9
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
      {/* Soft indirect night fill for the darker left side */}
      <pointLight
        ref={nightFillRef}
        position={[-2.6, 3.4, 1.0]}
        distance={12}
        decay={1.6}
        intensity={0}
        color="#5f74b8"
      />
      {/* Subtle night accent: wall shelf & decorations */}
      <pointLight
        ref={shelfAccentRef}
        position={[-3.5, 2.5, 0.8]}
        distance={3.2}
        decay={2}
        intensity={0}
        color="#9db4e6"
      />
      {/* Subtle night accent: social board area */}
      <pointLight
        ref={boardAccentRef}
        position={[-3.5, 2.75, 2.6]}
        distance={2.8}
        decay={2}
        intensity={0}
        color="#8fa8e0"
      />
      {/* Subtle night accent: plant corner */}
      <pointLight
        ref={plantAccentRef}
        position={[-3.2, 1.1, -3.1]}
        distance={2.6}
        decay={2}
        intensity={0}
        color="#7e9ad0"
      />
      {/* Subtle night accent: lounge / coffee table */}
      <pointLight
        ref={loungeAccentRef}
        position={[1.7, 1.5, 1.7]}
        distance={4.5}
        decay={2}
        intensity={0}
        color="#a89a80"
      />
    </>
  )
}
