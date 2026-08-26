import { useMemo } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'

type Props = { file: string; position: [number, number, number]; size: number; rotation?: [number, number, number] }

export function WorkstationAsset({ file, position, size, rotation = [0, 0, 0] }: Props) {
  const { scene } = useGLTF(file)
  const model = useMemo(() => {
    const clone = scene.clone(true)
    clone.rotation.set(...rotation)
    clone.updateMatrixWorld(true)
    const native = new THREE.Box3().setFromObject(clone)
    const span = native.getSize(new THREE.Vector3())
    clone.scale.setScalar(size / (Math.max(span.x, span.y, span.z) || 1))
    clone.updateMatrixWorld(true)
    const bounds = new THREE.Box3().setFromObject(clone)
    const center = bounds.getCenter(new THREE.Vector3())
    clone.position.x -= center.x
    clone.position.y -= bounds.min.y
    clone.position.z -= center.z
    clone.traverse((object) => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true } })
    return clone
  }, [scene, size, rotation])
  return <primitive object={model} position={position} />
}
