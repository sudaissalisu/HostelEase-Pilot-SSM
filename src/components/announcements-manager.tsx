'use client'

import * as React from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import {
  Megaphone,
  Plus,
  Pin,
  PinOff,
  Pencil,
  Trash2,
  MoreVertical,
  RefreshCw,
  CircleAlert,
  Info,
  CheckCircle2,
  AlertCircle,
  Wrench,
  CalendarDays,
  PowerOff,
  Users,
  GraduationCap,
  Shield,
  Mail,
  Bell,
  Calendar,
  Eye,
} from 'lucide-react'

import { PageHeader, StatCard, EmptyState } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { cn, fmtRelative, fmtDateTime, fmtDate, initials } from '@/lib/utils'
import { useRolePermissions } from '@/lib/use-role-permissions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AnnouncementType = 'INFO' | 'SUCCESS' | 'WARNING' | 'MAINTENANCE' | 'EVENT'
type Audience = 'ALL' | 'STUDENTS' | 'STAFF' | 'ADMINS'

interface Author {
  id: string
  name: string | null
  email: string
  role?: string
}

interface Announcement {
  id: string
  title: string
  body: string
  type: AnnouncementType
  audience: Audience
  isPinned: boolean
  isActive: boolean
  publishedAt: string
  expiresAt: string | null
  author?: Author | null
}

interface AnnouncementsResponse {
  announcements: Announcement[]
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
// Style maps
// ---------------------------------------------------------------------------

const TYPE_META: Record<AnnouncementType, {
  icon: React.ElementType
  color: string
  bg: string
  border: string
  badge: string
}> = {
  INFO: {
    icon: Info,
    color: 'text-blue-600 dark:text-blue-300',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
  },
  SUCCESS: {
    icon: CheckCircle2,
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/30',
    badge: 'bg-primary/10 text-primary border-primary/30',
  },
  WARNING: {
    icon: AlertCircle,
    color: 'text-amber-600 dark:text-amber-300',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  },
  MAINTENANCE: {
    icon: Wrench,
    color: 'text-zinc-600 dark:text-zinc-300',
    bg: 'bg-zinc-500/10',
    border: 'border-zinc-500/30',
    badge: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/30',
  },
  EVENT: {
    icon: CalendarDays,
    color: 'text-purple-600 dark:text-purple-300',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    badge: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
  },
}

const AUDIENCE_META: Record<Audience, { icon: React.ElementType; badge: string; label: string }> = {
  ALL: { icon: Users, label: 'Everyone', badge: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/30' },
  STUDENTS: { icon: GraduationCap, label: 'Students', badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30' },
  STAFF: { icon: Shield, label: 'Staff', badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30' },
  ADMINS: { icon: Shield, label: 'Admins', badge: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30' },
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AnnouncementsManager() {
  const { mutate } = useSWRConfig()
  const { data, isLoading, error } = useSWR<AnnouncementsResponse>(
    '/api/announcements',
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: false }
  )

  const { canManage, isViewOnly } = useRolePermissions()
  const canEdit = canManage('canManageAnnouncements')
  const viewOnly = isViewOnly('canManageAnnouncements', 'canViewAnnouncements')

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Announcement | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Announcement | null>(null)
  const [search, setSearch] = React.useState('')
  const [filterType, setFilterType] = React.useState<string>('__ALL')
  const [filterAudience, setFilterAudience] = React.useState<string>('__ALL')

  const refresh = React.useCallback(() => {
    mutate('/api/announcements')
    mutate('/api/notifications')
  }, [mutate])

  const announcements = data?.announcements ?? []

  const stats = React.useMemo(() => {
    const active = announcements.filter((a) => a.isActive).length
    const pinned = announcements.filter((a) => a.isPinned && a.isActive).length
    const byAudience: Record<Audience, number> = { ALL: 0, STUDENTS: 0, STAFF: 0, ADMINS: 0 }
    for (const a of announcements) byAudience[a.audience] = (byAudience[a.audience] || 0) + 1
    return { active, pinned, byAudience, total: announcements.length }
  }, [announcements])

  const filtered = React.useMemo(() => {
    let list = [...announcements].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    })
    if (filterType !== '__ALL') list = list.filter((a) => a.type === filterType)
    if (filterAudience !== '__ALL') list = list.filter((a) => a.audience === filterAudience)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.body.toLowerCase().includes(q) ||
          a.author?.name?.toLowerCase().includes(q)
      )
    }
    return list
  }, [announcements, filterType, filterAudience, search])

  // ----- Loading -----
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Announcements" description="Broadcast messages to students and staff." />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Announcements" />
        <EmptyState
          icon={CircleAlert}
          title="Failed to load announcements"
          description={error.message || 'Please try again.'}
          action={
            <Button onClick={() => refresh()} variant="outline" size="sm">
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
        title="Announcements"
        description="Broadcast messages to students and staff."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => refresh()}>
              <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
            </Button>
            {canEdit && (
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null)
                  setDialogOpen(true)
                }}
              >
                <Plus className="h-4 w-4 mr-1.5" /> New Announcement
              </Button>
            )}
          </>
        }
      />

      {viewOnly && (
        <div className="rounded-md border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
          <Eye className="h-3.5 w-3.5 shrink-0" />
          <span>You have view-only access. Editing is disabled.</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Active"
          value={stats.active}
          icon={Megaphone}
          hint={`${stats.total} total · ${stats.total - stats.active} inactive`}
          accent="primary"
        />
        <StatCard
          label="Pinned"
          value={stats.pinned}
          icon={Pin}
          hint="Sticky broadcasts"
          accent="amber"
        />
        <StatCard
          label="To Students"
          value={stats.byAudience.STUDENTS}
          icon={GraduationCap}
          hint="Audience-targeted"
          accent="blue"
        />
        <StatCard
          label="To Staff/Admins"
          value={stats.byAudience.STAFF + stats.byAudience.ADMINS}
          icon={Shield}
          hint={`STAFF ${stats.byAudience.STAFF} · ADMINS ${stats.byAudience.ADMINS}`}
          accent="purple"
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search title, body or author…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] max-w-md"
        />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__ALL">All types</SelectItem>
            <SelectItem value="INFO">Info</SelectItem>
            <SelectItem value="SUCCESS">Success</SelectItem>
            <SelectItem value="WARNING">Warning</SelectItem>
            <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
            <SelectItem value="EVENT">Event</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterAudience} onValueChange={setFilterAudience}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Audience" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__ALL">All audiences</SelectItem>
            <SelectItem value="ALL">Everyone</SelectItem>
            <SelectItem value="STUDENTS">Students</SelectItem>
            <SelectItem value="STAFF">Staff</SelectItem>
            <SelectItem value="ADMINS">Admins</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="outline" className="ml-auto text-xs">
          {filtered.length} of {announcements.length} announcements
        </Badge>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-2">
            <EmptyState
              icon={Megaphone}
              title={announcements.length === 0 ? 'No announcements yet' : 'No matching announcements'}
              description={
                announcements.length === 0
                  ? 'Create your first broadcast to reach students and staff instantly.'
                  : 'Try adjusting your search or filters.'
              }
              action={
                announcements.length === 0 ? (
                  canEdit ? (
                    <Button
                      onClick={() => {
                        setEditing(null)
                        setDialogOpen(true)
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1.5" /> Create your first broadcast
                    </Button>
                  ) : undefined
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch('')
                      setFilterType('__ALL')
                      setFilterAudience('__ALL')
                    }}
                  >
                    Clear filters
                  </Button>
                )
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <AnnouncementCard
              key={a.id}
              announcement={a}
              canEdit={canEdit}
              onEdit={(an) => {
                setEditing(an)
                setDialogOpen(true)
              }}
              onDelete={(an) => setDeleteTarget(an)}
              onRefresh={refresh}
            />
          ))}
        </div>
      )}

      {/* Editor Dialog */}
      <AnnouncementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        canEdit={canEdit}
        onSaved={() => {
          setDialogOpen(false)
          refresh()
        }}
      />

      {/* Delete Confirmation */}
      <DeleteAnnouncementDialog
        announcement={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => {
          setDeleteTarget(null)
          refresh()
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Announcement Card
// ---------------------------------------------------------------------------

interface AnnouncementCardProps {
  announcement: Announcement
  canEdit: boolean
  onEdit: (a: Announcement) => void
  onDelete: (a: Announcement) => void
  onRefresh: () => void
}

function AnnouncementCard({ announcement: a, canEdit, onEdit, onDelete, onRefresh }: AnnouncementCardProps) {
  const [expanded, setExpanded] = React.useState(false)
  const [acting, setActing] = React.useState(false)
  const meta = TYPE_META[a.type] || TYPE_META.INFO
  const aud = AUDIENCE_META[a.audience] || AUDIENCE_META.ALL

  async function patch(payload: Record<string, unknown>, successMsg: string) {
    setActing(true)
    try {
      const res = await fetch(`/api/announcements/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.message || 'Update failed')
      }
      toast.success(successMsg)
      onRefresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setActing(false)
    }
  }

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all hover:shadow-md',
        !a.isActive && 'opacity-60',
        a.isPinned && 'border-primary/40 bg-primary/[0.02]'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Type icon */}
          <div className={cn('h-10 w-10 rounded-lg grid place-items-center shrink-0', meta.bg)}>
            <meta.icon className={cn('h-5 w-5', meta.color)} />
          </div>

          {/* Body */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-semibold text-base leading-tight">
                    {a.title}
                    {!a.isActive && (
                      <Badge variant="outline" className="ml-2 text-[9px] bg-destructive/10 text-destructive border-destructive/30">
                        Inactive
                      </Badge>
                    )}
                  </h3>
                  {a.isPinned && (
                    <Badge variant="outline" className="text-[9px] gap-0.5 py-0 h-4 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">
                      <Pin className="h-2.5 w-2.5" /> Pinned
                    </Badge>
                  )}
                  <Badge variant="outline" className={cn('text-[9px]', meta.badge)}>
                    {a.type}
                  </Badge>
                  <Badge variant="outline" className={cn('text-[9px] gap-0.5', aud.badge)}>
                    <aud.icon className="h-2.5 w-2.5" /> {aud.label}
                  </Badge>
                  {a.expiresAt && (
                    <Badge variant="outline" className="text-[9px] gap-0.5 text-muted-foreground">
                      <Calendar className="h-2.5 w-2.5" /> Expires {fmtDate(a.expiresAt)}
                    </Badge>
                  )}
                </div>

                {/* Body text */}
                <p
                  className={cn(
                    'text-sm text-muted-foreground whitespace-pre-wrap cursor-pointer',
                    !expanded && 'line-clamp-3'
                  )}
                  onClick={() => setExpanded((v) => !v)}
                  title={expanded ? 'Click to collapse' : 'Click to expand'}
                >
                  {a.body}
                </p>
                {a.body.length > 200 && (
                  <button
                    onClick={() => setExpanded((v) => !v)}
                    className="text-xs text-primary hover:underline mt-1"
                  >
                    {expanded ? 'Show less' : 'Show more'}
                  </button>
                )}

                {/* Author + time */}
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  {a.author ? (
                    <div className="flex items-center gap-1.5">
                      <div className="h-5 w-5 rounded-full bg-primary/15 text-primary grid place-items-center text-[9px] font-bold">
                        {initials(a.author.name || a.author.email)}
                      </div>
                      <span className="font-medium text-foreground/80">{a.author.name || a.author.email}</span>
                    </div>
                  ) : (
                    <span>System</span>
                  )}
                  <span>·</span>
                  <span title={fmtDateTime(a.publishedAt)}>{fmtRelative(a.publishedAt)}</span>
                </div>
              </div>

              {/* Actions */}
              {canEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={acting}>
                      {acting ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <MoreVertical className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onEdit(a)}>
                      <Pencil className="h-4 w-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => patch({ isPinned: !a.isPinned }, a.isPinned ? 'Unpinned' : 'Pinned')}>
                      {a.isPinned ? (
                        <><PinOff className="h-4 w-4 mr-2" /> Unpin</>
                      ) : (
                        <><Pin className="h-4 w-4 mr-2" /> Pin to top</>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => patch({ isActive: !a.isActive }, a.isActive ? 'Deactivated' : 'Reactivated')}
                    >
                      <PowerOff className="h-4 w-4 mr-2" /> {a.isActive ? 'Deactivate' : 'Reactivate'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(a)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Announcement Dialog (Create / Edit)
// ---------------------------------------------------------------------------

interface AnnouncementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: Announcement | null
  canEdit: boolean
  onSaved: () => void
}

function AnnouncementDialog({ open, onOpenChange, editing, canEdit, onSaved }: AnnouncementDialogProps) {
  const [title, setTitle] = React.useState('')
  const [body, setBody] = React.useState('')
  const [type, setType] = React.useState<AnnouncementType>('INFO')
  const [audience, setAudience] = React.useState<Audience>('ALL')
  const [isPinned, setIsPinned] = React.useState(false)
  const [expiresAt, setExpiresAt] = React.useState<Date | undefined>(undefined)
  const [notifyUsers, setNotifyUsers] = React.useState(false)
  const [emailUsers, setEmailUsers] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  // Sync form with editing target
  React.useEffect(() => {
    if (!open) return
    if (editing) {
      setTitle(editing.title)
      setBody(editing.body)
      setType(editing.type)
      setAudience(editing.audience)
      setIsPinned(editing.isPinned)
      setExpiresAt(editing.expiresAt ? new Date(editing.expiresAt) : undefined)
      setNotifyUsers(false)
      setEmailUsers(false)
    } else {
      setTitle('')
      setBody('')
      setType('INFO')
      setAudience('ALL')
      setIsPinned(false)
      setExpiresAt(undefined)
      setNotifyUsers(false)
      setEmailUsers(false)
    }
  }, [editing, open])

  const isEdit = !!editing

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) {
      toast.error('Title and body are required')
      return
    }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        body: body.trim(),
        type,
        audience,
        isPinned,
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
      }
      if (!isEdit) {
        payload.notifyUsers = notifyUsers
        payload.emailUsers = emailUsers
      }
      const url = isEdit ? `/api/announcements/${editing!.id}` : '/api/announcements'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.message || 'Save failed')
      }
      toast.success(isEdit ? 'Announcement updated' : 'Announcement published')
      onSaved()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const audMeta = AUDIENCE_META[audience]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the broadcast details. Changes take effect immediately.'
              : 'Compose a broadcast message and choose who should see it.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="ann-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ann-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Hostel applications open for 2024/2025 session"
              maxLength={200}
              required
              disabled={!canEdit}
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <Label htmlFor="ann-body">
              Message <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="ann-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write the full announcement body…"
              rows={5}
              required
              disabled={!canEdit}
            />
            <p className="text-[11px] text-muted-foreground">{body.length} characters</p>
          </div>

          {/* Type + Audience */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as AnnouncementType)} disabled={!canEdit}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INFO">Info</SelectItem>
                  <SelectItem value="SUCCESS">Success</SelectItem>
                  <SelectItem value="WARNING">Warning</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="EVENT">Event</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Audience</Label>
              <Select value={audience} onValueChange={(v) => setAudience(v as Audience)} disabled={!canEdit}>
                <SelectTrigger>
                  <SelectValue placeholder="Select audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Everyone</SelectItem>
                  <SelectItem value="STUDENTS">Students</SelectItem>
                  <SelectItem value="STAFF">Staff (Moderators + Admins)</SelectItem>
                  <SelectItem value="ADMINS">Admins only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pinned + Expires */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="ann-pin" className="text-sm">Pin to top</Label>
                <p className="text-[11px] text-muted-foreground">Pinned items appear first</p>
              </div>
              <Switch id="ann-pin" checked={isPinned} onCheckedChange={setIsPinned} disabled={!canEdit} />
            </div>
            <div className="space-y-1.5">
              <Label>Expires at (optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={!canEdit}>
                    <Calendar className="h-4 w-4 mr-2" />
                    {expiresAt ? fmtDate(expiresAt.toISOString()) : 'No expiry'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={expiresAt}
                    onSelect={setExpiresAt}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                  {expiresAt && (
                    <div className="p-2 border-t flex justify-between">
                      <Button variant="ghost" size="sm" onClick={() => setExpiresAt(undefined)}>
                        Clear
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Broadcast options (only for new) */}
          {!isEdit && (
            <div className="rounded-md border bg-muted/30 divide-y">
              <div className="flex items-center justify-between p-3">
                <div className="flex items-start gap-2.5">
                  <Bell className="h-4 w-4 text-primary mt-0.5" />
                  <div className="space-y-0.5">
                    <Label htmlFor="ann-notify" className="text-sm">Notify all users in audience</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Creates an in-app notification for each user in the <span className="font-medium">{audMeta.label}</span> audience.
                    </p>
                  </div>
                </div>
                <Switch id="ann-notify" checked={notifyUsers} onCheckedChange={setNotifyUsers} disabled={!canEdit} />
              </div>
              <div className="flex items-center justify-between p-3">
                <div className="flex items-start gap-2.5">
                  <Mail className="h-4 w-4 text-primary mt-0.5" />
                  <div className="space-y-0.5">
                    <Label htmlFor="ann-email" className="text-sm">Also send email</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Sends the announcement body to each user&apos;s email. Requires notifications to be enabled.
                    </p>
                  </div>
                </div>
                <Switch
                  id="ann-email"
                  checked={emailUsers}
                  onCheckedChange={setEmailUsers}
                  disabled={!canEdit || !notifyUsers}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !canEdit || !title.trim() || !body.trim()}>
              {saving && <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />}
              {isEdit ? 'Save changes' : 'Publish broadcast'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Delete Confirmation
// ---------------------------------------------------------------------------

interface DeleteAnnouncementDialogProps {
  announcement: Announcement | null
  onClose: () => void
  onDeleted: () => void
}

function DeleteAnnouncementDialog({ announcement, onClose, onDeleted }: DeleteAnnouncementDialogProps) {
  const [deleting, setDeleting] = React.useState(false)

  async function confirmDelete() {
    if (!announcement) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/announcements/${announcement.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.message || 'Delete failed')
      }
      toast.success('Announcement deleted')
      onDeleted()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog open={!!announcement} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete announcement?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes <span className="font-semibold">“{announcement?.title}”</span>.
            This action cannot be undone. Consider deactivating instead if you only want to hide it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              confirmDelete()
            }}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? 'Deleting…' : 'Delete permanently'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default AnnouncementsManager
