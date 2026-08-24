import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

export function Effects() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        mipmapBlur
        intensity={0.7}
        luminanceThreshold={0.55}
        luminanceSmoothing={0.28}
        radius={0.72}
      />
      <Vignette eskil={false} offset={0.22} darkness={0.52} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
