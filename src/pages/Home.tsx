import { Suspense } from 'react'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { LoadingVeil } from '@/components/home/LoadingVeil'
import { HomeOverlay } from '@/components/home/HomeOverlay'
import { lazyWithChunkRecovery } from '@/app/lazyWithRecovery'

const Scene = lazyWithChunkRecovery(() => import('@/components/three/Scene'))

export default function Home() {
  useDocumentMeta({
    title: 'Home',
    description:
      'Step into an interactive 3D developer room — a living workspace with a continuous day/night cycle, animated screens and hidden interactions.',
  })

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
      <HomeOverlay />
      <LoadingVeil />
    </div>
  )
}
