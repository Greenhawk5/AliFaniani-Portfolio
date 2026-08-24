import { Room } from './Room'
import { WindowEnv } from './WindowEnv'
import { RGBStrips } from './RGBStrips'
import { LightingSystem } from './LightingSystem'
import { Desk } from './Desk'
import { Chair } from './Chair'
import { MonitorSetup } from './MonitorSetup'
import { PC } from './PC'
import { Lounge } from './Lounge'
import { ShelfDecor } from './ShelfDecor'
import { NeonSign } from './NeonSign'
import { DigitalClock } from './DigitalClock'
import { ProjectBoard } from './ProjectBoard'
import { DustParticles } from './DustParticles'

export function Experience() {
  return (
    <group>
      <Room />
      <WindowEnv />
      <RGBStrips />
      <LightingSystem />
      <Desk />
      <Chair />
      <MonitorSetup />
      <PC />
      <Lounge />
      <ShelfDecor />
      <NeonSign />
      <DigitalClock />
      <ProjectBoard />
      <DustParticles />
    </group>
  )
}
