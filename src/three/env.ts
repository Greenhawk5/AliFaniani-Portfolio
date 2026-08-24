import * as THREE from 'three'
import { getEnvironment } from './timeEngine'

export const env = {
  time: 0,
  hours: 12,
  sun: new THREE.Color(1, 1, 1),
  sunIntensity: 0,
  sunPosition: new THREE.Vector3(0, 5, -10),
  moon: new THREE.Color(0.48, 0.56, 0.82),
  moonIntensity: 0,
  moonPosition: new THREE.Vector3(0, -1, -10),
  ambient: new THREE.Color(1, 1, 1),
  ambientIntensity: 0.5,
  hemiSky: new THREE.Color(0.5, 0.6, 0.8),
  hemiGround: new THREE.Color(0.2, 0.2, 0.2),
  hemiIntensity: 0.5,
  skyTop: new THREE.Color(0.25, 0.5, 0.84),
  skyBottom: new THREE.Color(0.75, 0.88, 1),
  skyHorizon: new THREE.Color(0.92, 0.96, 1),
  rgb: 0.5,
  windowGlow: 1,
  windowGlowColor: new THREE.Color(1, 1, 1),
  monitor: 0.5,
  stars: 0,
  city: 0,
  clouds: 0.5,
  background: new THREE.Color(0.34, 0.42, 0.55),
  fogDensity: 0.02,
  sunUV: new THREE.Vector2(0.5, 0.5),
  moonUV: new THREE.Vector2(0.5, 0.5),
}

const rgbColor = new THREE.Color()

export function updateEnvironment(hours: number): void {
  const s = getEnvironment(hours)
  env.hours = hours
  env.sunIntensity = s.sun
  env.sun.setRGB(s.sunColor[0], s.sunColor[1], s.sunColor[2])
  env.sunPosition.set(s.sunPosition[0], s.sunPosition[1], s.sunPosition[2])
  env.moonIntensity = s.moon
  env.moon.setRGB(0.48, 0.56, 0.82)
  env.moonPosition.set(s.moonPosition[0], s.moonPosition[1], s.moonPosition[2])
  env.ambientIntensity = s.ambient
  env.ambient.setRGB(s.ambientColor[0], s.ambientColor[1], s.ambientColor[2])
  env.hemiSky.setRGB(s.hemiSky[0], s.hemiSky[1], s.hemiSky[2])
  env.hemiGround.setRGB(s.hemiGround[0], s.hemiGround[1], s.hemiGround[2])
  env.hemiIntensity = 0.35 + s.ambient * 0.9
  env.skyTop.setRGB(s.skyTop[0], s.skyTop[1], s.skyTop[2])
  env.skyBottom.setRGB(s.skyBottom[0], s.skyBottom[1], s.skyBottom[2])
  env.skyHorizon.setRGB(s.skyHorizon[0], s.skyHorizon[1], s.skyHorizon[2])
  env.rgb = s.rgb
  env.windowGlow = s.windowGlow
  env.windowGlowColor.setRGB(
    s.windowGlowColor[0],
    s.windowGlowColor[1],
    s.windowGlowColor[2]
  )
  env.monitor = s.monitor
  env.stars = s.stars
  env.city = s.city
  env.clouds = s.clouds
  rgbColor.setRGB(s.background[0], s.background[1], s.background[2])
  env.background.copy(rgbColor)
  env.fogDensity = s.fog
  env.sunUV.set(s.sunUV[0], s.sunUV[1])
  env.moonUV.set(s.moonUV[0], s.moonUV[1])
}
