import { useMemo } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'

interface NormalizeOptions {
  /** Axis + world-space size to normalize the model to. */
  axis: 'x' | 'y' | 'z'
  size: number
  /** Non-destructive corrective rotation applied to the runtime clone
   *  BEFORE measuring the bounding box (used to fix asset-local up axis). */
  correction?: [number, number, number]
  /** Fraction of the (scaled) height to sink below the group origin so a
   *  seated character contacts at pelvis/seat height, not at its feet. */
  seatOffset?: number
}

/**
 * Normalizes a loaded GLTF scene so its bounding box bottom sits at y=0,
 * centered on x/z, scaled so the given axis equals `size`. Non-destructive:
 * only transform values on the runtime clone are touched.
 */
function useNormalized(scene: THREE.Object3D, { axis, size, correction, seatOffset = 0 }: NormalizeOptions) {
  // Normalization runs in useMemo (not useEffect) so it executes while the
  // clone is still DETACHED. Box3.setFromObject computes world-space bounds,
  // which multiply in the parent's matrixWorld; measuring before attachment
  // guarantees an identity parent, making the result deterministic no matter
  // when the component mounts or re-renders. Measuring in a post-render
  // effect instead could observe an already-transformed parent and would
  // "correct" the figure off the shelf (random mid-room placement bug).
  return useMemo(() => {
    const clone = SkeletonUtils.clone(scene)

    clone.scale.set(1, 1, 1)
    clone.position.set(0, 0, 0)
    clone.rotation.set(0, 0, 0)
    if (correction) clone.rotation.set(...correction)
    clone.updateMatrixWorld(true)

    const bbox = new THREE.Box3().setFromObject(clone)
    const dims = bbox.getSize(new THREE.Vector3())
    const s = size / Math.max(dims[axis], 1e-6)
    clone.scale.setScalar(s)

    bbox.setFromObject(clone)
    const center = bbox.getCenter(new THREE.Vector3())
    clone.position.x -= center.x
    clone.position.z -= center.z
    clone.position.y -= bbox.min.y + seatOffset * size

    clone.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })

    return clone
    // `correction` is a tuple; consumers pass module-level constants so the
    // identity (and thus the memo) stays stable across re-renders.
  }, [scene, axis, size, correction, seatOffset])
}

/**
 * Corrective rotations live at module scope so their array identity is stable:
 * they are dependencies of the normalization memo, and a fresh literal each
 * render would needlessly re-run (and re-create) the clone.
 */
const T_FIGURE_CORRECTION = [-Math.PI / 2, 0, 0] as [number, number, number]

/**
 * Seated character perched on the front edge of the shelf's top board.
 *
 * Vertex-slice analysis of the asset showed the figure is modeled Z-up
 * (55-unit axis = seated height along +Z, feet at −Z, head at +Z) with the
 * facing direction along +X. The [-π/2, 0, 0] correction rotates native
 * +Z up to world +Y without touching the asset itself. The seatOffset sinks
 * the figure so the pelvis/seat rests on the shelf while the feet dangle
 * naturally past the shelf edge.
 */
function TFigurine() {
  const { scene } = useGLTF('/models/t-figure.glb', '/draco/')
  const model = useNormalized(scene, {
    axis: 'y',
    size: 0.3,
    correction: T_FIGURE_CORRECTION,
    seatOffset: 0.25,
  })
  return (
    <group position={[0.15, 2.16, -0.08]}>
      <primitive object={model} />
    </group>
  )
}

/**
 * Jet is rigged with a single root joint only (no limb bones), so it cannot
 * be posed via its skeleton. Instead it is displayed as a gliding hawk —
 * a safe whole-model tilt/bank that reads as an intentional display pose.
 */
function JetFigurine() {
  const { scene } = useGLTF('/models/jet_the_hawk.glb', '/draco/')
  const model = useNormalized(scene, { axis: 'x', size: 0.55 })
  return (
    <group position={[0.02, 1.64, 0.42]} rotation={[-0.22, Math.PI / 2, 0.12]}>
      <primitive object={model} />
    </group>
  )
}

export function ShelfCharacters() {
  return (
    <group position={[-4.4, 0, 0.8]}>
      <TFigurine />
      {/* Jet temporarily disabled — restore by rendering <JetFigurine /> again.
          The optimized asset (public/models/jet_the_hawk.glb) is kept. */}
      {/* <JetFigurine /> */}
    </group>
  )
}
