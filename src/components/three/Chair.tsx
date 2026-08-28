import { WorkstationAsset } from './WorkstationAsset'

export function Chair() {
  // "Corsair T3 Rush Gaming Chair" by BlackCube (CC-BY-4.0) — see
  // src/3D asset/Workstation/Credits/chair.md. Native bounds 0.66 x 1.47 x 0.70
  // (height the largest span) with the base authored at y=0, so size 1.56 keeps
  // the old procedural chair's ~1.57 seat-back height with a ~0.70 x 0.75
  // footprint. The model's backrest is native -Z (front faces +Z), so the Y
  // rotation of PI turns the seat toward the desk, same as the old build. The
  // rotated bbox center sits at z -0.052, so position.z is offset +0.055 to
  // land the same center (1.2, -, -2.42) the old chair occupied.
  return (
    <WorkstationAsset
      file="/models/workstation/chair.glb"
      position={[1.2, 0, -2.3646]}
      size={1.8}
      rotation={[0, Math.PI, 0]}
    />
  )
}
