export type RGB = [number, number, number]

export interface EnvironmentSnapshot {
  hours: number
  sun: number
  sunColor: RGB
  moon: number
  ambient: number
  ambientColor: RGB
  hemiSky: RGB
  hemiGround: RGB
  skyTop: RGB
  skyBottom: RGB
  skyHorizon: RGB
  rgb: number
  windowGlow: number
  windowGlowColor: RGB
  monitor: number
  stars: number
  city: number
  clouds: number
  background: RGB
  fog: number
  sunPosition: RGB
  moonPosition: RGB
  sunUV: RGB
  moonUV: RGB
}

interface EnvKey {
  t: number
  sun: number
  sunColor: RGB
  moon: number
  ambient: number
  ambientColor: RGB
  hemiSky: RGB
  hemiGround: RGB
  skyTop: RGB
  skyBottom: RGB
  skyHorizon: RGB
  rgb: number
  windowGlow: number
  windowGlowColor: RGB
  monitor: number
  stars: number
  city: number
  clouds: number
  background: RGB
  fog: number
}

const NIGHT_SKY_TOP: RGB = [0.016, 0.024, 0.058]
const NIGHT_SKY_BOTTOM: RGB = [0.043, 0.063, 0.149]
const NIGHT_HORIZON: RGB = [0.094, 0.141, 0.286]
const NIGHT_BG: RGB = [0.02, 0.024, 0.047]

const KEYS: EnvKey[] = [
  {
    t: 0,
    sun: 0,
    sunColor: [1, 0.62, 0.37],
    moon: 0.24,
    ambient: 0.3,
    ambientColor: [0.45, 0.55, 0.9],
    hemiSky: [0.1, 0.13, 0.24],
    hemiGround: [0.04, 0.045, 0.08],
    skyTop: NIGHT_SKY_TOP,
    skyBottom: NIGHT_SKY_BOTTOM,
    skyHorizon: NIGHT_HORIZON,
    rgb: 1,
    windowGlow: 0.3,
    windowGlowColor: [0.29, 0.37, 0.62],
    monitor: 1,
    stars: 1,
    city: 1,
    clouds: 0.08,
    background: NIGHT_BG,
    fog: 0.03,
  },
  {
    t: 4.5,
    sun: 0,
    sunColor: [1, 0.62, 0.37],
    moon: 0.18,
    ambient: 0.32,
    ambientColor: [0.5, 0.55, 0.85],
    hemiSky: [0.11, 0.13, 0.25],
    hemiGround: [0.045, 0.05, 0.085],
    skyTop: [0.039, 0.063, 0.14],
    skyBottom: [0.1, 0.13, 0.25],
    skyHorizon: [0.16, 0.2, 0.38],
    rgb: 0.95,
    windowGlow: 0.3,
    windowGlowColor: [0.3, 0.36, 0.6],
    monitor: 1,
    stars: 0.6,
    city: 1,
    clouds: 0.12,
    background: [0.026, 0.03, 0.058],
    fog: 0.03,
  },
  {
    t: 6,
    sun: 0.6,
    sunColor: [1, 0.62, 0.37],
    moon: 0,
    ambient: 0.38,
    ambientColor: [0.85, 0.7, 0.6],
    hemiSky: [0.35, 0.35, 0.5],
    hemiGround: [0.1, 0.08, 0.08],
    skyTop: [0.17, 0.23, 0.43],
    skyBottom: [1, 0.62, 0.37],
    skyHorizon: [1, 0.7, 0.42],
    rgb: 0.6,
    windowGlow: 0.85,
    windowGlowColor: [1, 0.62, 0.37],
    monitor: 0.85,
    stars: 0.12,
    city: 0.5,
    clouds: 0.3,
    background: [0.16, 0.12, 0.14],
    fog: 0.026,
  },
  {
    t: 7.5,
    sun: 1.9,
    sunColor: [1, 0.85, 0.66],
    moon: 0,
    ambient: 0.46,
    ambientColor: [1, 0.95, 0.88],
    hemiSky: [0.5, 0.6, 0.78],
    hemiGround: [0.18, 0.15, 0.12],
    skyTop: [0.29, 0.5, 0.75],
    skyBottom: [0.81, 0.89, 0.97],
    skyHorizon: [1, 0.85, 0.66],
    rgb: 0.35,
    windowGlow: 1.05,
    windowGlowColor: [1, 0.95, 0.87],
    monitor: 0.6,
    stars: 0,
    city: 0,
    clouds: 0.45,
    background: [0.3, 0.36, 0.46],
    fog: 0.02,
  },
  {
    t: 12,
    sun: 2.7,
    sunColor: [1, 0.96, 0.88],
    moon: 0,
    ambient: 0.56,
    ambientColor: [1, 1, 1],
    hemiSky: [0.58, 0.68, 0.88],
    hemiGround: [0.22, 0.2, 0.16],
    skyTop: [0.25, 0.5, 0.84],
    skyBottom: [0.75, 0.88, 1],
    skyHorizon: [0.92, 0.96, 1],
    rgb: 0.22,
    windowGlow: 1.25,
    windowGlowColor: [1, 1, 1],
    monitor: 0.5,
    stars: 0,
    city: 0,
    clouds: 0.5,
    background: [0.34, 0.42, 0.55],
    fog: 0.017,
  },
  {
    t: 16.5,
    sun: 1.8,
    sunColor: [1, 0.88, 0.69],
    moon: 0,
    ambient: 0.46,
    ambientColor: [1, 0.94, 0.85],
    hemiSky: [0.5, 0.58, 0.76],
    hemiGround: [0.2, 0.17, 0.13],
    skyTop: [0.29, 0.5, 0.75],
    skyBottom: [1, 0.85, 0.66],
    skyHorizon: [1, 0.9, 0.75],
    rgb: 0.35,
    windowGlow: 1.05,
    windowGlowColor: [1, 0.92, 0.8],
    monitor: 0.6,
    stars: 0,
    city: 0,
    clouds: 0.45,
    background: [0.3, 0.34, 0.44],
    fog: 0.02,
  },
  {
    t: 18.25,
    sun: 0.75,
    sunColor: [1, 0.48, 0.24],
    moon: 0,
    ambient: 0.36,
    ambientColor: [0.95, 0.7, 0.6],
    hemiSky: [0.35, 0.32, 0.45],
    hemiGround: [0.12, 0.09, 0.09],
    skyTop: [0.21, 0.25, 0.43],
    skyBottom: [1, 0.48, 0.24],
    skyHorizon: [1, 0.62, 0.37],
    rgb: 0.65,
    windowGlow: 0.95,
    windowGlowColor: [1, 0.54, 0.3],
    monitor: 0.85,
    stars: 0.1,
    city: 0.6,
    clouds: 0.35,
    background: [0.2, 0.14, 0.15],
    fog: 0.024,
  },
  {
    t: 19.5,
    sun: 0.06,
    sunColor: [0.6, 0.4, 0.7],
    moon: 0.1,
    ambient: 0.32,
    ambientColor: [0.6, 0.6, 0.9],
    hemiSky: [0.16, 0.17, 0.3],
    hemiGround: [0.06, 0.06, 0.1],
    skyTop: [0.075, 0.1, 0.23],
    skyBottom: [0.29, 0.23, 0.48],
    skyHorizon: [0.42, 0.29, 0.54],
    rgb: 0.9,
    windowGlow: 0.45,
    windowGlowColor: [0.42, 0.35, 0.62],
    monitor: 1,
    stars: 0.55,
    city: 1,
    clouds: 0.15,
    background: [0.05, 0.05, 0.1],
    fog: 0.028,
  },
  {
    t: 21,
    sun: 0,
    sunColor: [1, 0.62, 0.37],
    moon: 0.22,
    ambient: 0.3,
    ambientColor: [0.45, 0.55, 0.9],
    hemiSky: [0.1, 0.13, 0.24],
    hemiGround: [0.04, 0.045, 0.08],
    skyTop: NIGHT_SKY_TOP,
    skyBottom: NIGHT_SKY_BOTTOM,
    skyHorizon: NIGHT_HORIZON,
    rgb: 1,
    windowGlow: 0.3,
    windowGlowColor: [0.29, 0.37, 0.62],
    monitor: 1,
    stars: 1,
    city: 1,
    clouds: 0.08,
    background: NIGHT_BG,
    fog: 0.03,
  },
  {
    t: 24,
    sun: 0,
    sunColor: [1, 0.62, 0.37],
    moon: 0.24,
    ambient: 0.3,
    ambientColor: [0.45, 0.55, 0.9],
    hemiSky: [0.1, 0.13, 0.24],
    hemiGround: [0.04, 0.045, 0.08],
    skyTop: NIGHT_SKY_TOP,
    skyBottom: NIGHT_SKY_BOTTOM,
    skyHorizon: NIGHT_HORIZON,
    rgb: 1,
    windowGlow: 0.3,
    windowGlowColor: [0.29, 0.37, 0.62],
    monitor: 1,
    stars: 1,
    city: 1,
    clouds: 0.08,
    background: NIGHT_BG,
    fog: 0.03,
  },
]

const NUMERIC_PROPS = [
  'sun',
  'moon',
  'ambient',
  'rgb',
  'windowGlow',
  'monitor',
  'stars',
  'city',
  'clouds',
  'fog',
] as const

const RGB_PROPS = [
  'sunColor',
  'ambientColor',
  'hemiSky',
  'hemiGround',
  'skyTop',
  'skyBottom',
  'skyHorizon',
  'windowGlowColor',
  'background',
] as const

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

const DAY_START = 5.5
const DAY_SPAN = 13

function celestialPosition(hours: number, dayOffset: number): [number, number, number] {
  const h = (hours + dayOffset + 24) % 24
  const t = (h - DAY_START) / DAY_SPAN
  if (t < 0 || t > 1) return [0, -1, 0]
  const elevation = Math.sin(t * Math.PI)
  const x = lerp(9, -6, t)
  const y = lerp(-1.5, 9.5, elevation)
  return [x, y, -10]
}

function toSkyUV(position: RGB): RGB {
  const u = 0.5 + (position[0] - 1.4) / 16
  const v = 0.3 + position[1] / 15
  return [Math.min(0.95, Math.max(0.05, u)), Math.min(0.92, Math.max(0.04, v)), 0]
}

const snapshot: EnvironmentSnapshot = {
  hours: 12,
  sun: 0,
  sunColor: [1, 1, 1],
  moon: 0,
  ambient: 0.5,
  ambientColor: [1, 1, 1],
  hemiSky: [0.5, 0.6, 0.8],
  hemiGround: [0.2, 0.2, 0.2],
  skyTop: [0.25, 0.5, 0.84],
  skyBottom: [0.75, 0.88, 1],
  skyHorizon: [0.92, 0.96, 1],
  rgb: 0.5,
  windowGlow: 1,
  windowGlowColor: [1, 1, 1],
  monitor: 0.5,
  stars: 0,
  city: 0,
  clouds: 0.5,
  background: [0.34, 0.42, 0.55],
  fog: 0.02,
  sunPosition: [0, 0, -10],
  moonPosition: [0, -1, 0],
  sunUV: [0.5, 0.5, 0],
  moonUV: [0.5, 0.5, 0],
}

export function getEnvironment(hours: number): EnvironmentSnapshot {
  snapshot.hours = hours

  let i = 0
  while (i < KEYS.length - 2 && KEYS[i + 1].t <= hours) i++
  const a = KEYS[i]
  const b = KEYS[i + 1]
  const raw = (hours - a.t) / (b.t - a.t)
  const t = smoothstep(Math.min(1, Math.max(0, raw)))

  for (const prop of NUMERIC_PROPS) {
    snapshot[prop] = lerp(a[prop], b[prop], t)
  }
  for (const prop of RGB_PROPS) {
    const ca = a[prop]
    const cb = b[prop]
    const co = snapshot[prop]
    co[0] = lerp(ca[0], cb[0], t)
    co[1] = lerp(ca[1], cb[1], t)
    co[2] = lerp(ca[2], cb[2], t)
  }

  const sunPos = celestialPosition(hours, 0)
  const moonPos = celestialPosition(hours, 12)
  snapshot.sunPosition = sunPos
  snapshot.moonPosition = moonPos
  const su = toSkyUV(sunPos)
  const mu = toSkyUV(moonPos)
  snapshot.sunUV = [su[0], su[1], 0]
  snapshot.moonUV = [mu[0], mu[1], 0]

  return snapshot
}
