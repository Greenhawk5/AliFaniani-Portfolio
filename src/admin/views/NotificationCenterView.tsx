/**
 * NotificationCenterView — Dedicated control center for persistent admin alerts,
 * deployment statuses, security warnings, and custom administrator notifications.
 */

import { useMemo, useState, useCallback } from 'react'
import { useAdminData } from '../AdminDataProvider'
import {
  AdminCard,
  AdminModal,
  AdminNotice,
  relativeTime,
  absoluteTime,
  toast,
} from '../ui/primitives'
import {
  AdminSelect,
  AdminInput,
  AdminTextarea,
  AdminSwitch,
  type SelectOption,
} from '../ui/form-controls'
import { Button } from '@/components/ui/Button'
import {
  BellIcon,
  PinIcon,
  ArchiveIcon,
  TrashIcon,
  CheckCheckIcon,
  CheckIcon,
  PlusIcon,
  SearchIcon,
  ShieldAlertIcon,
  RocketIcon,
  FolderIcon,
  UndoIcon,
} from '../ui/icons'
import { ExternalLinkIcon } from '@/components/ui/icons'
import { cn } from '@/lib/cn'
import type { AdminNotification } from '../notificationsApi'
import type { AdminView } from '../routes'

type FilterView = 'all' | 'unread' | 'pinned' | 'archived' | 'system' | 'security' | 'custom'

const FILTER_TABS: { id: FilterView; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'pinned', label: 'Pinned' },
  { id: 'archived', label: 'Archived' },
  { id: 'system', label: 'System' },
  { id: 'security', label: 'Security' },
  { id: 'custom', label: 'Custom' },
]

const CATEGORY_OPTIONS: SelectOption<'custom' | 'system' | 'security' | 'content'>[] = [
  { value: 'custom', label: 'Custom Administrator' },
  { value: 'system', label: 'System Notification' },
  { value: 'security', label: 'Security Alert' },
  { value: 'content', label: 'Publishing / Content' },
]

const PRIORITY_OPTIONS: SelectOption<'normal' | 'important' | 'critical'>[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'important', label: 'Important (Warning)' },
  { value: 'critical', label: 'Critical (Urgent)' },
]

export function NotificationCenterView({
  navigate,
}: {
  navigate?: (view: AdminView, param?: string) => void
}) {
  const data = useAdminData()
  const {
    notifications,
    notificationsError,
    refreshNotifications,
    markNotificationRead,
    pinNotification,
    archiveNotification,
    deleteNotification,
    markAllNotificationsRead,
    clearArchivedNotifications,
    createCustomNotification,
  } = data

  const [activeTab, setActiveTab] = useState<FilterView>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [clearArchivedConfirmOpen, setClearArchivedConfirmOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  // Create form state
  const [formTitle, setFormTitle] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [formType, setFormType] = useState<'custom' | 'system' | 'security' | 'content'>('custom')
  const [formPriority, setFormPriority] = useState<'normal' | 'important' | 'critical'>('normal')
  const [formLinkUrl, setFormLinkUrl] = useState('')
  const [formPinned, setFormPinned] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSubmitting, setFormSubmitting] = useState(false)

  const handleCloseCreateModal = useCallback(() => {
    setCreateModalOpen(false)
  }, [])

  const handleCloseDeleteModal = useCallback(() => {
    setDeleteTargetId(null)
  }, [])

  const handleCloseClearArchivedModal = useCallback(() => {
    setClearArchivedConfirmOpen(false)
  }, [])

  const allNotifications = useMemo(() => notifications ?? [], [notifications])

  // Tab counts
  const counts = useMemo(() => {
    const res: Record<FilterView, number> = {
      all: 0,
      unread: 0,
      pinned: 0,
      archived: 0,
      system: 0,
      security: 0,
      custom: 0,
    }
    for (const n of allNotifications) {
      if (n.state === 'deleted') continue
      if (n.state === 'archived' || n.state === 'dismissed') {
        res.archived++
      } else {
        res.all++
        if (!n.readAt) res.unread++
        if (n.isPinned) res.pinned++
        if (n.type === 'security') res.security++
        else if (n.type === 'custom') res.custom++
        else res.system++
      }
    }
    return res
  }, [allNotifications])

  // Filtered list
  const filteredList = useMemo(() => {
    let list = allNotifications.filter((n) => n.state !== 'deleted')

    // Tab filter
    switch (activeTab) {
      case 'unread':
        list = list.filter((n) => !n.readAt && n.state !== 'archived' && n.state !== 'dismissed')
        break
      case 'pinned':
        list = list.filter((n) => n.isPinned && n.state !== 'archived' && n.state !== 'dismissed')
        break
      case 'archived':
        list = list.filter((n) => n.state === 'archived' || n.state === 'dismissed')
        break
      case 'system':
        list = list.filter((n) => n.type !== 'security' && n.type !== 'custom' && n.state !== 'archived' && n.state !== 'dismissed')
        break
      case 'security':
        list = list.filter((n) => n.type === 'security' && n.state !== 'archived' && n.state !== 'dismissed')
        break
      case 'custom':
        list = list.filter((n) => n.type === 'custom' && n.state !== 'archived' && n.state !== 'dismissed')
        break
      case 'all':
      default:
        list = list.filter((n) => n.state !== 'archived' && n.state !== 'dismissed')
        break
    }

    // Search query filter
    const query = searchQuery.trim().toLowerCase()
    if (query) {
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          n.message.toLowerCase().includes(query) ||
          n.type.toLowerCase().includes(query) ||
          (n.priority && n.priority.toLowerCase().includes(query))
      )
    }

    // Sort: Pinned first, then newest first
    return list.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
      return b.createdAt.localeCompare(a.createdAt)
    })
  }, [allNotifications, activeTab, searchQuery])

  // Action handlers
  const handleToggleRead = async (item: AdminNotification) => {
    const nextRead = !item.readAt
    setBusyId(item.id)
    try {
      const ok = await markNotificationRead(item.id, nextRead)
      if (ok) {
        toast('success', nextRead ? 'Marked as read' : 'Marked as unread')
      }
    } finally {
      setBusyId(null)
    }
  }

  const handleTogglePin = async (item: AdminNotification) => {
    const nextPinned = !item.isPinned
    setBusyId(item.id)
    try {
      const ok = await pinNotification(item.id, nextPinned)
      if (ok) {
        toast('success', nextPinned ? 'Notification pinned' : 'Notification unpinned')
      }
    } finally {
      setBusyId(null)
    }
  }

  const handleToggleArchive = async (item: AdminNotification) => {
    const isArchived = item.state === 'archived' || item.state === 'dismissed'
    setBusyId(item.id)
    try {
      const ok = await archiveNotification(item.id, !isArchived)
      if (ok) {
        toast('success', isArchived ? 'Notification restored' : 'Notification archived')
      }
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (id: string) => {
    setBusyId(id)
    try {
      const ok = await deleteNotification(id)
      if (ok) {
        toast('success', 'Notification permanently deleted')
        setDeleteTargetId(null)
      } else {
        toast('error', 'Failed to delete notification')
      }
    } finally {
      setBusyId(null)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      const ok = await markAllNotificationsRead()
      if (ok) {
        toast('success', 'All notifications marked as read')
      }
    } catch {
      toast('error', 'Failed to mark all as read')
    }
  }

  const handleClearArchived = async () => {
    try {
      const ok = await clearArchivedNotifications()
      if (ok) {
        toast('success', 'Archived notifications cleared')
        setClearArchivedConfirmOpen(false)
      }
    } catch {
      toast('error', 'Failed to clear archived notifications')
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    const cleanTitle = formTitle.trim()
    const cleanMessage = formMessage.trim()

    if (!cleanTitle) {
      setFormError('Title is required')
      return
    }
    if (cleanTitle.length > 120) {
      setFormError('Title cannot exceed 120 characters')
      return
    }
    if (!cleanMessage) {
      setFormError('Message is required')
      return
    }
    if (cleanMessage.length > 1000) {
      setFormError('Message cannot exceed 1000 characters')
      return
    }

    setFormSubmitting(true)
    try {
      const ok = await createCustomNotification({
        title: cleanTitle,
        message: cleanMessage,
        type: formType,
        priority: formPriority,
        linkUrl: formLinkUrl.trim() || undefined,
        isPinned: formPinned,
      })

      if (ok) {
        toast('success', 'Notification created successfully')
        setCreateModalOpen(false)
        setFormTitle('')
        setFormMessage('')
        setFormLinkUrl('')
        setFormPinned(false)
        setFormPriority('normal')
        setFormType('custom')
      } else {
        setFormError('Failed to create notification')
      }
    } catch (err) {
      setFormError((err as Error).message || 'Failed to create notification')
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleActionClick = (item: AdminNotification) => {
    if (!item.linkUrl) return
    if (item.linkUrl.startsWith('#/')) {
      const routePart = item.linkUrl.replace(/^#\/?/, '')
      const [view, param] = routePart.split('/')
      if (navigate) {
        navigate(view as AdminView, param ? decodeURIComponent(param) : undefined)
      } else {
        window.location.assign(item.linkUrl)
      }
    } else if (item.linkUrl.startsWith('/')) {
      window.location.assign(item.linkUrl)
    } else {
      window.open(item.linkUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">Operations</p>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-frost">Notification Center</h1>
            {counts.unread > 0 && (
              <span className="flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 font-mono text-xs font-semibold text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                {counts.unread} unread
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-mist max-w-2xl">
            Actionable system alerts, security incidents, publishing states, and custom administrative messages.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCreateModalOpen(true)}
            className="border-accent/40 text-accent hover:bg-accent/10"
          >
            <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
            New notification
          </Button>

          {counts.unread > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleMarkAllRead()}
              title="Mark all notifications as read"
            >
              <CheckCheckIcon className="mr-1.5 h-3.5 w-3.5 text-accent" />
              Mark all read
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => void refreshNotifications()}
            title="Refresh notifications"
          >
            Refresh
          </Button>
        </div>
      </header>

      {notificationsError && <AdminNotice kind="error">{notificationsError}</AdminNotice>}

      {/* Control bar: Tabs and Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Filter notifications"
          className="flex flex-wrap items-center gap-1 rounded-xl border border-edge bg-panel/60 p-1"
        >
          {FILTER_TABS.map((tab) => {
            const count = counts[tab.id]
            const isSelected = activeTab === tab.id
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'cursor-pointer rounded-lg px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5',
                  isSelected
                    ? 'bg-accent/15 text-accent font-semibold'
                    : 'text-mist hover:text-frost hover:bg-panel-2'
                )}
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.2 font-mono text-[10px]',
                      isSelected ? 'bg-accent/25 text-accent' : 'bg-panel-2 text-mist'
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Search input and Tab-specific actions */}
        <div className="flex items-center gap-2">
          {activeTab === 'archived' && counts.archived > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setClearArchivedConfirmOpen(true)}
              className="text-danger border-danger/30 hover:bg-danger/10"
            >
              <TrashIcon className="mr-1.5 h-3.5 w-3.5" />
              Clear archived
            </Button>
          )}

          <div className="relative min-w-[200px] flex-1 sm:w-64">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-mist" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications..."
              aria-label="Search notifications"
              className="w-full rounded-xl border border-edge-2 bg-panel/85 py-1.5 pl-9 pr-3 font-mono text-xs text-frost placeholder:text-mist/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
            />
          </div>
        </div>
      </div>

      {/* Main List */}
      {filteredList.length === 0 ? (
        <AdminCard className="p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-panel-2 border border-edge-2 text-mist">
            <BellIcon className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-medium text-frost">
            {searchQuery
              ? 'No matching notifications'
              : activeTab === 'unread'
                ? "You're all caught up"
                : activeTab === 'pinned'
                  ? 'No pinned notifications'
                  : activeTab === 'archived'
                    ? 'No archived notifications'
                    : 'No notifications'}
          </h3>
          <p className="mt-1 text-xs text-mist max-w-sm mx-auto">
            {searchQuery
              ? `No notifications found matching "${searchQuery}". Try a different keyword.`
              : activeTab === 'unread'
                ? 'All attention items and alerts have been marked as read.'
                : activeTab === 'pinned'
                  ? 'Pin critical alerts or important messages to keep them at the top of the center.'
                  : activeTab === 'archived'
                    ? 'Notifications you archive will appear here.'
                    : 'System notifications and alerts will appear here when events occur.'}
          </p>
        </AdminCard>
      ) : (
        <ul className="space-y-3" aria-label="Notifications list">
          {filteredList.map((item) => {
            const isUnread = !item.readAt
            const isArchived = item.state === 'archived' || item.state === 'dismissed'
            const isCritical = item.priority === 'critical' || item.severity === 'critical'
            const isImportant = item.priority === 'important' || item.severity === 'warning'
            const isBusy = busyId === item.id

            return (
              <li
                key={item.id}
                className={cn(
                  'group relative flex flex-col gap-3 rounded-xl border p-4 transition-all duration-150 sm:flex-row sm:items-start sm:justify-between',
                  isCritical
                    ? 'border-danger/30 bg-danger/5 hover:border-danger/50'
                    : isImportant
                      ? 'border-amber/30 bg-amber/5 hover:border-amber/50'
                      : isUnread
                        ? 'border-accent/30 bg-accent/5 hover:border-accent/40'
                        : 'border-edge bg-panel/75 hover:border-edge-2',
                  item.isPinned && 'ring-1 ring-accent/30'
                )}
              >
                {/* Left section: status indicator + content */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {/* Status dot / category icon */}
                  <div className="mt-1 flex shrink-0 items-center justify-center">
                    {item.type === 'security' ? (
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber/15 text-amber">
                        <ShieldAlertIcon className="h-4 w-4" />
                      </span>
                    ) : item.type === 'deploy' ? (
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan/15 text-cyan">
                        <RocketIcon className="h-4 w-4" />
                      </span>
                    ) : item.type === 'content' ? (
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
                        <FolderIcon className="h-4 w-4" />
                      </span>
                    ) : item.type === 'custom' ? (
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400">
                        <BellIcon className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-panel-2 text-mist">
                        <BellIcon className="h-4 w-4" />
                      </span>
                    )}
                  </div>

                  {/* Text details */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Title */}
                      <p
                        className={cn(
                          'text-sm font-semibold',
                          isUnread ? 'text-frost font-bold' : 'text-frost/85'
                        )}
                      >
                        {item.title}
                      </p>

                      {/* Badges */}
                      <span className="rounded border border-edge bg-panel-2 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-mist">
                        {item.type}
                      </span>

                      {item.priority && item.priority !== 'normal' && (
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider font-semibold',
                            item.priority === 'critical'
                              ? 'bg-danger/20 text-danger border border-danger/30'
                              : 'bg-amber/20 text-amber border border-amber/30'
                          )}
                        >
                          {item.priority}
                        </span>
                      )}

                      {item.isPinned && (
                        <span className="inline-flex items-center gap-1 rounded bg-accent/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-accent">
                          <PinIcon className="h-2.5 w-2.5" />
                          Pinned
                        </span>
                      )}

                      {isUnread && (
                        <span className="h-2 w-2 rounded-full bg-accent" title="Unread" />
                      )}
                    </div>

                    {/* Message Body */}
                    <p className="text-xs text-mist leading-relaxed break-words">{item.message}</p>

                    {/* Metadata & Timestamp footer */}
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-mist/70">
                      <span title={absoluteTime(item.createdAt)}>
                        {relativeTime(item.createdAt)}
                      </span>

                      {item.readAt && (
                        <span title={absoluteTime(item.readAt)} className="text-mist/50">
                          Read {relativeTime(item.readAt)}
                        </span>
                      )}

                      {item.linkUrl && (
                        <button
                          onClick={() => handleActionClick(item)}
                          className="inline-flex items-center gap-1 font-mono text-accent hover:underline cursor-pointer"
                        >
                          <span>Open link</span>
                          <ExternalLinkIcon className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right section: Action Buttons */}
                <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-center">
                  {/* Action Link button */}
                  {item.linkUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleActionClick(item)}
                      className="border-edge-2 text-xs py-1"
                    >
                      Action
                    </Button>
                  )}

                  {/* Mark Read/Unread toggle */}
                  <button
                    onClick={() => void handleToggleRead(item)}
                    disabled={isBusy}
                    title={isUnread ? 'Mark as read' : 'Mark as unread'}
                    aria-label={isUnread ? 'Mark as read' : 'Mark as unread'}
                    className={cn(
                      'cursor-pointer rounded-lg p-1.5 transition-colors',
                      isUnread
                        ? 'text-accent hover:bg-accent/10'
                        : 'text-mist hover:text-frost hover:bg-panel-2'
                    )}
                  >
                    {isUnread ? <CheckIcon className="h-4 w-4" /> : <UndoIcon className="h-3.5 w-3.5" />}
                  </button>

                  {/* Pin/Unpin toggle */}
                  <button
                    onClick={() => void handleTogglePin(item)}
                    disabled={isBusy}
                    title={item.isPinned ? 'Unpin notification' : 'Pin notification'}
                    aria-label={item.isPinned ? 'Unpin notification' : 'Pin notification'}
                    className={cn(
                      'cursor-pointer rounded-lg p-1.5 transition-colors',
                      item.isPinned
                        ? 'text-accent bg-accent/15 hover:bg-accent/25'
                        : 'text-mist hover:text-frost hover:bg-panel-2'
                    )}
                  >
                    <PinIcon className="h-4 w-4" />
                  </button>

                  {/* Archive/Restore toggle */}
                  <button
                    onClick={() => void handleToggleArchive(item)}
                    disabled={isBusy}
                    title={isArchived ? 'Restore to inbox' : 'Archive notification'}
                    aria-label={isArchived ? 'Restore to inbox' : 'Archive notification'}
                    className="cursor-pointer rounded-lg p-1.5 text-mist hover:text-frost hover:bg-panel-2 transition-colors"
                  >
                    {isArchived ? <UndoIcon className="h-4 w-4" /> : <ArchiveIcon className="h-4 w-4" />}
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={() => setDeleteTargetId(item.id)}
                    disabled={isBusy}
                    title="Permanently delete notification"
                    aria-label="Delete notification"
                    className="cursor-pointer rounded-lg p-1.5 text-mist hover:text-danger hover:bg-danger/10 transition-colors"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Modal: Create Custom Notification */}
      <AdminModal
        open={createModalOpen}
        onClose={handleCloseCreateModal}
        title="Create notification"
      >
        <form onSubmit={(e) => void handleCreateSubmit(e)} className="space-y-4">
          {formError && <AdminNotice kind="error">{formError}</AdminNotice>}

          <AdminInput
            id="notif-title"
            label="Title *"
            type="text"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="e.g. Scheduled Maintenance"
            maxLength={120}
            required
            autoComplete="off"
          />

          <AdminTextarea
            id="notif-message"
            label="Message / Details *"
            rows={3}
            value={formMessage}
            onChange={(e) => setFormMessage(e.target.value)}
            placeholder="Enter announcement or note details..."
            maxLength={1000}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AdminSelect<'custom' | 'system' | 'security' | 'content'>
              label="Category"
              value={formType}
              onChange={setFormType}
              options={CATEGORY_OPTIONS}
              ariaLabel="Notification category"
              className="w-full"
            />

            <AdminSelect<'normal' | 'important' | 'critical'>
              label="Priority"
              value={formPriority}
              onChange={setFormPriority}
              options={PRIORITY_OPTIONS}
              ariaLabel="Notification priority"
              className="w-full"
            />
          </div>

          <AdminInput
            id="notif-url"
            label="Destination URL or Route (Optional)"
            type="text"
            value={formLinkUrl}
            onChange={(e) => setFormLinkUrl(e.target.value)}
            placeholder="#/publishing or https://..."
            maxLength={500}
            autoComplete="off"
          />

          <div className="pt-1">
            <AdminSwitch
              checked={formPinned}
              onChange={setFormPinned}
              label="Pin notification immediately"
              description="Keep this notification pinned to the top of the admin inbox"
              className="rounded-xl border border-edge-2 bg-panel-2/60 p-3"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-edge">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCloseCreateModal}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={formSubmitting}
            >
              {formSubmitting ? 'Creating...' : 'Create notification'}
            </Button>
          </div>
        </form>
      </AdminModal>

      {/* Modal: Delete Confirmation */}
      <AdminModal
        open={deleteTargetId !== null}
        onClose={handleCloseDeleteModal}
        title="Delete notification"
      >
        <div className="space-y-4">
          <p className="text-sm text-mist leading-relaxed">
            Are you sure you want to permanently delete this notification? This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCloseDeleteModal}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-danger text-danger hover:bg-danger/10"
              onClick={() => deleteTargetId && void handleDelete(deleteTargetId)}
            >
              Delete permanently
            </Button>
          </div>
        </div>
      </AdminModal>

      {/* Modal: Clear Archived Confirmation */}
      <AdminModal
        open={clearArchivedConfirmOpen}
        onClose={handleCloseClearArchivedModal}
        title="Clear archived notifications"
      >
        <div className="space-y-4">
          <p className="text-sm text-mist leading-relaxed">
            Are you sure you want to permanently remove all archived notifications? This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCloseClearArchivedModal}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-danger text-danger hover:bg-danger/10"
              onClick={() => void handleClearArchived()}
            >
              Clear all archived
            </Button>
          </div>
        </div>
      </AdminModal>
    </div>
  )
}
