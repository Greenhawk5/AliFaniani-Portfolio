import { useUiStore } from '@/stores/uiStore'
import { WorkstationAsset } from './WorkstationAsset'
import { Interactable } from './Interactable'

export function PC() {
  const toggleRgb = useUiStore((s) => s.toggleRgb)

  return (
    // The user's tuned on-desk spot (right rear corner of the desktop, base
    // contact at y=1.001 like the other desk props). The new GLB is authored
    // vertically centered (native min y -2.504 with height 5.205 the largest
    // span), so size 1 (scale 0.192) makes y = 1.482 land the base on the
    // desktop with the tower topping out at ~2.0. Unlike the old asset, the
    // fan-glass front is native +Z, so rotation stays 0 to face the camera,
    // leaving the open internals side toward the window and the tempered glass
    // side panel toward the room. Footprint x[2.409, 2.842], z[-4.004, -3.068]
    // stays on the desktop (top spans x[-0.5, 2.9], z[-4.175, -3.025]) and
    // clear of the mouse pad. This copy ships meshopt-compressed; drei's
    // useGLTF auto-attaches the MeshoptDecoder so it loads like any other
    // model. The re-exported GLB no longer embeds asset metadata — attribution
    // lives in src/3D asset/Workstation/Credits/pc.md: "Pc Gamer (Animation)"
    // by Caio de Oliveira, CC-BY-4.0.
    <Interactable id="pc" label="PC — click to toggle RGB" onActivate={toggleRgb}>
      <WorkstationAsset
        file="/models/workstation/pc.glb"
        position={[2.6, 1.44, -3.52]}
        size={0.8}
        rotation={[0, 0, 0]}
      />
    </Interactable>
  )
}


