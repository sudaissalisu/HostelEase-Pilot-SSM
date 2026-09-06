'use client'

import * as React from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import {
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  RefreshCw,
  Info,
  Building2,
  BedDouble,
  ShieldCheck,
  FileText,
  CircleDollarSign,
  Wrench,
  CircleAlert,
  MailOpen,
  CircleDot,
  Eye,
} from 'lucide-react'

import { PageHeader, StatCard, EmptyState } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn, fmtRelative, fmtDateTime } from '@/lib/utils'
import { useRolePermissions } from '@/lib/use-role-permissions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'
type NotificationCategory =
  | 'SYSTEM'
  | 'HOSTEL'
  | 'ALLOCATION'
  | 'VERIFICATION'
  | 'APPLICATION'
  | 'PAYMENT'
  | 'MAINTENANCE'
  | 'BURSARY'
  | 'SECURITY'
  | 'SUPPORT'
  | 'CHAT'

interface Notification {
  id: string
  title: string
  message: string
  type: NotificationType
  category: NotificationCategory
  isRead: boolean
  createdAt: string
  link?: string | null
}

interface NotificationResponse {
  notifications: Notification[]
  unreadCount: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_BADGE: Record<string, string> = {
  INFO: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
  SUCCESS: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  WARNING: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  ERROR: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30',
  PAYMENT: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30',
  ALLOCATION: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
}

const CATEGORY_BADGE: Record<string, string> = {
  SYSTEM: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/30',
  HOSTEL: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  ALLOCATION: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  VERIFICATION: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
  APPLICATION: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
  PAYMENT: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30',
  MAINTENANCE: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30',
  BURSARY: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30',
  SECURITY: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30',
  SUPPORT: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
  CHAT: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
}

const CATEGORY_ICON: Record<string, React.ElementType> = {
  SYSTEM: Info,
  HOSTEL: Building2,
  ALLOCATION: BedDouble,
  VERIFICATION: ShieldCheck,
  APPLICATION: FileText,
  PAYMENT: CircleDollarSign,
  MAINTENANCE: Wrench,
  BURSARY: CircleDollarSign,
  SECURITY: ShieldCheck,
  SUPPORT: MailOpen,
  CHAT: Bell,
}

const TYPE_ICON: Record<NotificationType, React.ElementType> = {
  INFO: Info,
  SUCCESS: CheckCheck,
  WARNING: CircleAlert,
  ERROR: CircleAlert,
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error(`Request failed: ${r.status}`)
    return r.json()
  })

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function NotificationsManager() {
  const { mutate } = useSWRConfig()
  const [category, setCategory] = React.useState<string>('ALL')
  const [unreadOnly, setUnreadOnly] = React.useState(false)
  const [toDelete, setToDelete] = React.useState<Notification | null>(null)

  const { canManage, isViewOnly } = useRolePermissions()
  const canEdit = canManage('canManageAnnouncements')
  const viewOnly = isViewOnly('canManageAnnouncements', 'canViewAnnouncements')

  const buildUrl = () => {
    const p = new URLSearchParams()
    if (unreadOnly) p.set('unread', 'true')
    if (category !== 'ALL') p.set('category', category)
    return `/api/notifications?${p.toString()}`
  }
  const url = buildUrl()

  const { data, isLoading, error } = useSWR<NotificationResponse>(url, fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 30_000,
  })

  const notifications = data?.notifications ?? []
  const unreadCount = data?.unreadCount ?? 0

  const refresh = React.useCallback(() => {
    mutate(url)
    mutate('/api/notifications')
    mutate('/api/dashboard')
  }, [mutate, url])

  const handleMarkRead = async (n: Notification) => {
    if (n.isRead) return
    try {
      const r = await fetch(`/api/notifications/${n.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
        credentials: 'include',
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body?.error || 'Failed to mark as read')
      }
      refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to mark as read')
    }
  }

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.isRead)
    if (unread.length === 0) {
      toast.info('No unread notifications')
      return
    }
    const t = toast.loading(`Marking ${unread.length} notification(s) as read…`)
    try {
      await Promise.all(
        unread.map((n) =>
          fetch(`/api/notifications/${n.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isRead: true }),
            credentials: 'include',
          })
        )
      )
      toast.success(`Marked ${unread.length} as read.`, { id: t })
      refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to mark all as read', { id: t })
    }
  }

  const handleDelete = async () => {
    if (!toDelete) return
    const n = toDelete
    setToDelete(null)
    const t = toast.loading('Deleting notification…')
    try {
      const r = await fetch(`/api/notifications/${n.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body?.error || 'Failed to delete')
      }
      toast.success('Notification deleted.', { id: t })
      refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete notification', { id: t })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Notifications"
          description="Your activity feed — alerts, application updates, and system messages."
        />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Notifications" description="Your activity feed." />
        <EmptyState
          icon={BellOff}
          title="Couldn't load notifications"
          description={error.message || 'Please retry in a moment.'}
          action={
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-1.5" /> Retry
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Your activity feed — alerts, application updates, and system messages."
        actions={
          canEdit ? (
            <Button
              size="sm"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
            >
              <CheckCheck className="h-4 w-4 mr-1.5" />
              Mark All Read
            </Button>
          ) : undefined
        }
      />

      {viewOnly && (
        <div className="rounded-md border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
          <Eye className="h-3.5 w-3.5 shrink-0" />
          <span>You have view-only access. Marking as read and deleting are disabled.</span>
        </div>
      )}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total"
          value={notifications.length}
          icon={Bell}
          accent="primary"
        />
        <StatCard
          label="Unread"
          value={unreadCount}
          icon={CircleDot}
          hint="Need attention"
          accent="amber"
        />
        <StatCard
          label="Read"
          value={notifications.length - unreadCount}
          icon={MailOpen}
          accent="blue"
        />
        <StatCard
          label="Alerts"
          value={notifications.filter((n) => n.type === 'ERROR' || n.type === 'WARNING').length}
          icon={CircleAlert}
          accent="destructive"
        />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Category:
            </span>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                <SelectItem value="SYSTEM">System</SelectItem>
                <SelectItem value="HOSTEL">Hostel</SelectItem>
                <SelectItem value="ALLOCATION">Allocation</SelectItem>
                <SelectItem value="VERIFICATION">Verification</SelectItem>
                <SelectItem value="APPLICATION">Application</SelectItem>
                <SelectItem value="PAYMENT">Payment</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Unread only</span>
              <Switch checked={unreadOnly} onCheckedChange={setUnreadOnly} />
            </div>
          </div>
        </CardContent>
      </Card>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={BellOff}
              title={unreadOnly ? 'No unread notifications' : 'No notifications yet'}
              description={
                unreadOnly
                  ? 'You\'re all caught up. Toggle the unread filter to view all notifications.'
                  : 'Notifications about applications, allocations, payments and more will appear here.'
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const TypeIcon = TYPE_ICON[n.type] || Info
            const CatIcon = CATEGORY_ICON[n.category] || Info
            const catBadge = CATEGORY_BADGE[n.category] || CATEGORY_BADGE.SYSTEM
            const typeBadge = TYPE_BADGE[n.type] || TYPE_BADGE.INFO
            return (
              <Card
                key={n.id}
                className={cn(
                  'hover:shadow-md transition-all cursor-pointer group',
                  !n.isRead && 'border-primary/40 bg-primary/[0.02]'
                )}
                onClick={() => canEdit && handleMarkRead(n)}
              >
                <CardContent className="p-4 flex gap-3 items-start">
                  <div
                    className={cn(
                      'h-10 w-10 rounded-lg grid place-items-center shrink-0',
                      typeBadge
                    )}
                  >
                    <TypeIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{n.title}</span>
                          {!n.isRead && (
                            <span className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={cn('text-[9px] font-semibold', catBadge)}
                          >
                            <CatIcon className="h-3 w-3" />
                            {n.category}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn('text-[9px] font-semibold', typeBadge)}
                          >
                            {n.type}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {fmtRelative(n.createdAt)}
                          </span>
                          <span className="text-[10px] text-muted-foreground/70 hidden sm:inline">
                            · {fmtDateTime(n.createdAt)}
                          </span>
                        </div>
                      </div>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation()
                            setToDelete(n)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete notification?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The notification &ldquo;{toDelete?.title}&rdquo; will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
