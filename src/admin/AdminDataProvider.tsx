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
import {
  fetchNotifications,
  acknowledgeNotification as ackApi,
  resolveNotification as resApi,
  dismissNotification as disApi,
  markNotificationRead as readApi,
  pinNotification as pinApi,
  archiveNotification as arcApi,
  deleteNotification as delApi,
  markAllNotificationsRead as markAllApi,
  clearArchivedNotifications as clearArcApi,
  createCustomNotification as createApi,
  type AdminNotification,
} from './notificationsApi'
import type { SessionState } from './authApi'

export interface AdminData {
  items: ContentListItem[] | null
  itemsError: string
  deploy: DeployStateInfo | null
  activity: { events: ActivityEvent[]; summary: ActivitySummary } | null
  activityError: string
  notifications: AdminNotification[] | null
  notificationsError: string
  session: SessionState | null
  refreshContent: () => Promise<void>
  refreshDeploy: () => Promise<void>
  refreshActivity: () => Promise<void>
  refreshNotifications: () => Promise<void>
  acknowledgeNotification: (id: string) => Promise<boolean>
  resolveNotification: (id: string) => Promise<boolean>
  dismissNotification: (id: string) => Promise<boolean>
  markNotificationRead: (id: string, read?: boolean) => Promise<boolean>
  pinNotification: (id: string, isPinned?: boolean) => Promise<boolean>
  archiveNotification: (id: string, archive?: boolean) => Promise<boolean>
  deleteNotification: (id: string) => Promise<boolean>
  markAllNotificationsRead: () => Promise<boolean>
  clearArchivedNotifications: () => Promise<boolean>
  createCustomNotification: (data: {
    title: string
    message: string
    type?: string
    priority?: string
    linkUrl?: string
    isPinned?: boolean
  }) => Promise<boolean>
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
  session = null,
  onAuthLost,
}: {
  children: ReactNode
  session?: SessionState | null
  onAuthLost: () => void
}) {
  const [items, setItems] = useState<ContentListItem[] | null>(null)
  const [itemsError, setItemsError] = useState('')
  const [deploy, setDeploy] = useState<DeployStateInfo | null>(null)
  const [activity, setActivity] = useState<{ events: ActivityEvent[]; summary: ActivitySummary } | null>(null)
  const [activityError, setActivityError] = useState('')
  const [notifications, setNotifications] = useState<AdminNotification[] | null>(null)
  const [notificationsError, setNotificationsError] = useState('')
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

  const refreshNotifications = useCallback(async () => {
    try {
      const data = await fetchNotifications()
      setNotifications(data)
      setNotificationsError('')
    } catch (e) {
      guard(e, setNotificationsError)
    }
  }, [guard])

  const acknowledgeNotification = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const ok = await ackApi(id)
        if (ok) {
          setNotifications((prev) =>
            prev
              ? prev.map((n) => (n.id === id ? { ...n, state: 'acknowledged' as const } : n))
              : null
          )
        }
        return ok
      } catch (e) {
        guard(e, setNotificationsError)
        return false
      }
    },
    [guard]
  )

  const resolveNotification = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const ok = await resApi(id)
        if (ok) {
          setNotifications((prev) =>
            prev
              ? prev.map((n) => (n.id === id ? { ...n, state: 'resolved' as const } : n))
              : null
          )
        }
        return ok
      } catch (e) {
        guard(e, setNotificationsError)
        return false
      }
    },
    [guard]
  )

  const dismissNotification = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const ok = await disApi(id)
        if (ok) {
          setNotifications((prev) =>
            prev
              ? prev.map((n) => (n.id === id ? { ...n, state: 'dismissed' as const } : n))
              : null
          )
        }
        return ok
      } catch (e) {
        guard(e, setNotificationsError)
        return false
      }
    },
    [guard]
  )

  const markNotificationRead = useCallback(
    async (id: string, read = true): Promise<boolean> => {
      try {
        const ok = await readApi(id, read)
        if (ok) {
          setNotifications((prev) =>
            prev
              ? prev.map((n) => (n.id === id ? { ...n, readAt: read ? new Date().toISOString() : null } : n))
              : null
          )
        }
        return ok
      } catch (e) {
        guard(e, setNotificationsError)
        return false
      }
    },
    [guard]
  )

  const pinNotification = useCallback(
    async (id: string, isPinned = true): Promise<boolean> => {
      try {
        const ok = await pinApi(id, isPinned)
        if (ok) {
          setNotifications((prev) =>
            prev
              ? prev.map((n) => (n.id === id ? { ...n, isPinned } : n))
              : null
          )
        }
        return ok
      } catch (e) {
        guard(e, setNotificationsError)
        return false
      }
    },
    [guard]
  )

  const archiveNotification = useCallback(
    async (id: string, archive = true): Promise<boolean> => {
      try {
        const ok = await arcApi(id, archive)
        if (ok) {
          setNotifications((prev) =>
            prev
              ? prev.map((n) =>
                  n.id === id
                    ? { ...n, state: archive ? ('archived' as const) : ('active' as const), archivedAt: archive ? new Date().toISOString() : null }
                    : n
                )
              : null
          )
        }
        return ok
      } catch (e) {
        guard(e, setNotificationsError)
        return false
      }
    },
    [guard]
  )

  const deleteNotification = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const ok = await delApi(id)
        if (ok) {
          setNotifications((prev) => (prev ? prev.filter((n) => n.id !== id) : null))
        }
        return ok
      } catch (e) {
        guard(e, setNotificationsError)
        return false
      }
    },
    [guard]
  )

  const markAllNotificationsRead = useCallback(async (): Promise<boolean> => {
    try {
      const ok = await markAllApi()
      if (ok) {
        const now = new Date().toISOString()
        setNotifications((prev) =>
          prev ? prev.map((n) => ({ ...n, readAt: n.readAt || now })) : null
        )
      }
      return ok
    } catch (e) {
      guard(e, setNotificationsError)
      return false
    }
  }, [guard])

  const clearArchivedNotifications = useCallback(async (): Promise<boolean> => {
    try {
      const ok = await clearArcApi()
      if (ok) {
        setNotifications((prev) =>
          prev ? prev.filter((n) => n.state !== 'archived' && n.state !== 'dismissed') : null
        )
      }
      return ok
    } catch (e) {
      guard(e, setNotificationsError)
      return false
    }
  }, [guard])

  const createCustomNotification = useCallback(
    async (data: {
      title: string
      message: string
      type?: string
      priority?: string
      linkUrl?: string
      isPinned?: boolean
    }): Promise<boolean> => {
      try {
        const res = await createApi(data)
        if (res.ok) {
          await refreshNotifications()
        }
        return res.ok
      } catch (e) {
        guard(e, setNotificationsError)
        return false
      }
    },
    [guard, refreshNotifications]
  )

  const refreshAll = useCallback(async () => {
    await Promise.allSettled([
      refreshContent(),
      refreshDeploy(),
      refreshActivity(),
      refreshNotifications(),
    ])
  }, [refreshContent, refreshDeploy, refreshActivity, refreshNotifications])

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
      notifications,
      notificationsError,
      session,
      refreshContent,
      refreshDeploy,
      refreshActivity,
      refreshNotifications,
      acknowledgeNotification,
      resolveNotification,
      dismissNotification,
      markNotificationRead,
      pinNotification,
      archiveNotification,
      deleteNotification,
      markAllNotificationsRead,
      clearArchivedNotifications,
      createCustomNotification,
      refreshAll,
    }),
    [
      items,
      itemsError,
      deploy,
      activity,
      activityError,
      notifications,
      notificationsError,
      session,
      refreshContent,
      refreshDeploy,
      refreshActivity,
      refreshNotifications,
      acknowledgeNotification,
      resolveNotification,
      dismissNotification,
      markNotificationRead,
      pinNotification,
      archiveNotification,
      deleteNotification,
      markAllNotificationsRead,
      clearArchivedNotifications,
      createCustomNotification,
      refreshAll,
    ]
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
