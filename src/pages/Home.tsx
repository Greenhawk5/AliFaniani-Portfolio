import { Suspense } from 'react'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { LoadingVeil } from '@/components/home/LoadingVeil'
import { HomeOverlay } from '@/components/home/HomeOverlay'
import { HomeContentLayer } from '@/components/home/HomeContentLayer'
import { lazyWithChunkRecovery } from '@/app/lazyWithRecovery'

const Scene = lazyWithChunkRecovery(() => import('@/components/three/Scene'))

export default function Home() {
  useDocumentMeta({
    title: 'Ali Faniani — Software Developer',
    description:
      'Portfolio of Ali Faniani, software developer and computer science graduate focused on Artificial Intelligence, backend development, web applications, and automation.',
  })

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
      <HomeContentLayer />
      <HomeOverlay />
      <LoadingVeil />
    </div>
  )
}
