/**
 * Central admin data provider — the single source of UI truth for every
 * Control Center view. Loads content list, deploy state, and activity in
 * parallel; tracks loading/error per resource so views can render their own
 * skeletons and fallbacks.
 *
 * Auth loss (401 from any call) flips the whole app back to the login phase
 * via onAuthLost — no view has to handle it individually.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  listContent,
  type ContentListItem,
  type ContentKind,
} from './contentApi'
import { fetchDeployState, type DeployStateInfo } from './publishApi'
import { fetchActivity, type ActivityEvent, type ActivitySummary } from './activityApi'

export interface AdminData {
  items: ContentListItem[] | null
  itemsError: string
  deploy: DeployStateInfo | null
  activity: { events: ActivityEvent[]; summary: ActivitySummary } | null
  activityError: string
  refreshContent: () => Promise<void>
  refreshDeploy: () => Promise<void>
  refreshActivity: () => Promise<void>
  refreshAll: () => Promise<void>
}

const DataContext = createContext<AdminData | null>(null)

export function useAdminData(): AdminData {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useAdminData must be used inside AdminDataProvider')
  return ctx
}

/** Content counts derived once per items change — every view reuses this. */
export function useContentCounts() {
  const { items } = useAdminData()
  return useMemo(() => {
    const all = items ?? []
    const byKind = (kind: ContentKind) => all.filter((i) => i.kind === kind)
    return {
      total: all.length,
      published: all.filter((i) => i.state === 'published').length,
      draft: all.filter((i) => i.state === 'draft').length,
      archived: all.filter((i) => i.state === 'archived').length,
      edited: all.filter((i) => i.hasDraft || i.state === 'draft').length,
      projects: byKind('project'),
      profileSections: byKind('profile-section'),
      links: byKind('link'),
      lastUpdated: all.reduce<string | null>(
        (latest, i) => (latest && latest > i.updatedAt ? latest : i.updatedAt),
        null
      ),
    }
  }, [items])
}

export function AdminDataProvider({
  children,
  onAuthLost,
}: {
  children: ReactNode
  onAuthLost: () => void
}) {
  const [items, setItems] = useState<ContentListItem[] | null>(null)
  const [itemsError, setItemsError] = useState('')
  const [deploy, setDeploy] = useState<DeployStateInfo | null>(null)
  const [activity, setActivity] = useState<{ events: ActivityEvent[]; summary: ActivitySummary } | null>(null)
  const [activityError, setActivityError] = useState('')
  const authLostRef = useRef(false)

  const guard = useCallback(
    (e: unknown, onError: (msg: string) => void) => {
      const err = e as Error & { status?: number }
      if (err?.status === 401) {
        if (!authLostRef.current) {
          authLostRef.current = true
          onAuthLost()
        }
        return
      }
      onError(err?.message ?? 'Request failed.')
    },
    [onAuthLost]
  )

  const refreshContent = useCallback(async () => {
    try {
      const { items: next } = await listContent()
      setItems(next)
      setItemsError('')
    } catch (e) {
      guard(e, setItemsError)
    }
  }, [guard])

  const refreshDeploy = useCallback(async () => {
    try {
      setDeploy(await fetchDeployState())
    } catch (e) {
      guard(e, () => setDeploy({ status: null, requestedAt: null }))
    }
  }, [guard])

  const refreshActivity = useCallback(async () => {
    try {
      // Full log (endpoint caps at 200) with full IPs — pagination and the
      // IP reveal affordance are client-side off this single fetch. The data
      // never leaves this authenticated admin surface.
      setActivity(await fetchActivity(200, true))
      setActivityError('')
    } catch (e) {
      guard(e, setActivityError)
    }
  }, [guard])

  const refreshAll = useCallback(async () => {
    await Promise.allSettled([refreshContent(), refreshDeploy(), refreshActivity()])
  }, [refreshContent, refreshDeploy, refreshActivity])

  // Initial load runs once; refresh functions are stable, but the effect
  // only triggers on mount (the refresh* fns only change identity if
  // guard/onAuthLost change, which happens on auth transitions). The
  // microtask defers the first setState out of the effect body (react-hooks
  // purity rule: no synchronous state writes during the effect).
  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      return refreshAll()
    })
    return () => {
      cancelled = true
    }
  }, [refreshAll])

  const value = useMemo<AdminData>(
    () => ({
      items,
      itemsError,
      deploy,
      activity,
      activityError,
      refreshContent,
      refreshDeploy,
      refreshActivity,
      refreshAll,
    }),
    [items, itemsError, deploy, activity, activityError, refreshContent, refreshDeploy, refreshActivity, refreshAll]
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
