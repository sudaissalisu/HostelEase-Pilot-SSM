'use client'

/**
 * Premium Audit Logs Viewer (v2.0.0)
 * ----------------------------------
 *
 * Every audit log row now carries: severity, category, summary, tags,
 * riskScore, isFlagged, flagReason, beforeState / afterState (JSON snapshots),
 * reviewedBy / reviewedAt, adminNote.
 *
 * This viewer:
 *   - reads optional `?severity=&category=&flagged=1` URL search params on
 *     mount so the Observability Dashboard can deep-link with a pre-filter
 *   - exposes Severity + Category `<Select>` filters and a "Flagged only"
 *     `<Switch>` in the filter bar
 *   - renders the premium fields in the detail Sheet
 *   - exposes a "Support Actions" footer in the Sheet: Flag / Review / Note /
 *     Incident Report / Block IP / Create Support Ticket
 *
 * Optional `initialFilters` prop lets a parent (e.g. the Observability
 * Dashboard's "Top Actions" / "Top Actors" cards) pre-populate the action /
 * actor / severity / category / flagged filters without going through URL.
 */

import * as React from 'react'
import useSWR, { mutate as mutateGlobal } from 'swr'
import { toast } from 'sonner'
import {
  ShieldCheck,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  History,
  Loader2,
  Flag,
  CheckCircle2,
  StickyNote,
  FileJson,
  ShieldBan,
  LifeBuoy,
  AlertTriangle,
  Trash2,
} from 'lucide-react'

import { PageHeader, EmptyState } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  cn,
  fmtDateTime,
  fmtRelative,
  initials,
  truncate,
} from '@/lib/utils'
import { useAuthStore } from '@/lib/store'
import { useRolePermissions } from '@/lib/use-role-permissions'
import type { Severity } from '@/lib/audit'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Actor = {
  id: string
  name: string | null
  email: string
  role: string
  avatarUrl?: string | null
}

interface AuditLog {
  id: string
  action: string
  entityType: string
  entityId: string | null
  ipAddress: string | null
  userAgent: string | null
  metadata: unknown
  createdAt: string
  actor?: Actor | null
  // ── Premium fields (may be absent on older rows) ──
  severity?: Severity | string | null
  category?: string | null
  summary?: string | null
  tags?: string | null
  riskScore?: number | null
  isFlagged?: boolean | null
  flagReason?: string | null
  beforeState?: string | null
  afterState?: string | null
  reviewedBy?: string | null
  reviewedAt?: string | null
  adminNote?: string | null
  reviewer?: { id: string; name: string | null; email: string; role: string } | null
}

interface AuditResponse {
  logs: AuditLog[]
  total: number
  pagination?: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTION_VALUES = [
  'LOGIN',
  'LOGOUT',
  'LOGIN_FAILED',
  'PASSWORD_RESET_REQUEST',
  'PASSWORD_RESET_COMPLETE',
  'PASSWORD_CHANGE',
  'REGISTER',
  'USER_CREATED',
  'USER_UPDATED',
  'USER_DEACTIVATED',
  'USER_ACTIVATED',
  'USER_ROLE_CHANGED',
  'BLOCK_CREATED',
  'BLOCK_UPDATED',
  'BLOCK_DELETED',
  'ROOM_CREATED',
  'ROOM_UPDATED',
  'ROOM_DELETED',
  'BED_CREATED',
  'BED_UPDATED',
  'BED_DELETED',
  'BED_STATUS_CHANGED',
  'ALLOCATION_CREATED',
  'ALLOCATION_OVERRIDE',
  'ALLOCATION_VACATED',
  'BED_VACATED',
  'CHECK_IN',
  'CHECK_OUT',
  'APPLICATION_SUBMITTED',
  'APPLICATION_APPROVED',
  'APPLICATION_REJECTED',
  'VERIFICATION_APPROVED',
  'VERIFICATION_REJECTED',
  'VERIFICATION_REQUESTED',
  'PAYMENT_CONFIG_UPDATED',
  'PAYMENT_INITIATED',
  'PAYMENT_SUCCESS',
  'PAYMENT_FAILED',
  'SETTINGS_UPDATED',
  'SESSION_CREATED',
  'SESSION_UPDATED',
  'TICKET_CREATED',
  'TICKET_UPDATED',
  'TICKET_RESOLVED',
] as const

const ENTITY_TYPES = [
  'USER',
  'STUDENT',
  'BLOCK',
  'ROOM',
  'BED',
  'ALLOCATION',
  'APPLICATION',
  'PAYMENT',
  'PAYMENT_GATEWAY',
  'SESSION',
  'SETTING',
  'MAINTENANCE_TICKET',
] as const

const SEVERITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'info', label: 'Info' },
]

const CATEGORY_OPTIONS = [
  'auth',
  'user',
  'hostel',
  'allocation',
  'payment',
  'bursary',
  'verification',
  'support',
  'system',
  'security',
] as const

type ActionCategory =
  | 'AUTH'
  | 'USER'
  | 'HOSTEL'
  | 'ALLOCATION'
  | 'VERIFICATION'
  | 'PAYMENT'
  | 'SETTINGS'
  | 'SESSION'
  | 'MAINTENANCE'

function categorize(action: string): ActionCategory {
  if (
    action.startsWith('LOGIN') ||
    action.startsWith('PASSWORD') ||
    action === 'REGISTER'
  )
    return 'AUTH'
  if (action.startsWith('USER_') || action === 'USER_CREATED' || action.includes('USER'))
    return 'USER'
  if (
    action.startsWith('BLOCK_') ||
    action.startsWith('ROOM_') ||
    action.startsWith('BED_')
  )
    return 'HOSTEL'
  if (action.startsWith('ALLOCATION_') || action === 'BED_VACATED' || action.startsWith('CHECK_'))
    return 'ALLOCATION'
  if (action.startsWith('VERIFICATION_')) return 'VERIFICATION'
  if (action.startsWith('APPLICATION_')) return 'VERIFICATION'
  if (action.startsWith('PAYMENT')) return 'PAYMENT'
  if (action === 'SETTINGS_UPDATED') return 'SETTINGS'
  if (action.startsWith('SESSION_')) return 'SESSION'
  if (action.startsWith('TICKET_')) return 'MAINTENANCE'
  return 'SETTINGS'
}

const CATEGORY_BADGE: Record<ActionCategory, string> = {
  AUTH: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
  USER: 'bg-primary/10 text-primary border-primary/30',
  HOSTEL: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  ALLOCATION: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  VERIFICATION: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
  PAYMENT: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30',
  SETTINGS: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/30',
  SESSION: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
  MAINTENANCE: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30',
}

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
  ADMIN: 'bg-primary/10 text-primary border-primary/30',
  MODERATOR: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  STUDENT: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
}

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MODERATOR: 'Moderator',
  STUDENT: 'Student',
}

const SEVERITY_BADGE: Record<string, string> = {
  critical: 'bg-destructive/10 text-destructive border-destructive/30',
  high: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  medium: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
  low: 'bg-primary/10 text-primary border-primary/30',
  info: 'bg-muted text-muted-foreground border-border',
}

const SEVERITY_LABEL: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
}

const SEARCH_DEBOUNCE_MS = 500

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error(`Request failed: ${r.status}`)
    return r.json()
  })

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

interface Filters {
  actor: string
  action: string
  entityType: string
  from: string
  to: string
  q: string
  severity: string // 'ALL' | Severity
  category: string // 'ALL' | category
  flagged: boolean
}

const DEFAULT_FILTERS: Filters = {
  actor: '',
  action: 'ALL',
  entityType: 'ALL',
  from: '',
  to: '',
  q: '',
  severity: 'ALL',
  category: 'ALL',
  flagged: false,
}

export interface AuditLogsViewerProps {
  /** Optional initial filter overrides (used by the Observability Dashboard). */
  initialFilters?: Partial<Filters>
  /** Hide the page-level header (useful when embedding inside another page). */
  hideHeader?: boolean
}

function buildUrl(filters: Filters, page: number, pageSize: number, debouncedQ: string) {
  const p = new URLSearchParams()
  // Use the debounced search string for the actual API request so we don't
  // fire a query on every keystroke. The `filters.q` value is what the input
  // shows; `debouncedQ` is what we send to the server.
  const q = debouncedQ.trim()
  if (q) p.set('q', q)
  if (filters.action && filters.action !== 'ALL') p.set('action_filter', filters.action)
  if (filters.entityType && filters.entityType !== 'ALL') p.set('entityType', filters.entityType)
  if (filters.from) p.set('from', filters.from)
  if (filters.to) p.set('to', filters.to)
  if (filters.severity && filters.severity !== 'ALL') p.set('severity', filters.severity)
  if (filters.category && filters.category !== 'ALL') p.set('category', filters.category)
  if (filters.flagged) p.set('flagged', '1')
  p.set('page', String(page))
  p.set('pageSize', String(pageSize))
  return `/api/audit-logs?${p.toString()}`
}

function safeParseJson(v: unknown): unknown {
  if (typeof v !== 'string') return v
  try {
    return JSON.parse(v)
  } catch {
    return v
  }
}

/**
 * Compute a rough set-diff between two JSON state snapshots (before/after).
 * Returns lines tagged as `added` / `removed` / `unchanged` so the Sheet can
 * tint them green/red. We don't pull in a real diff library — a key-by-key
 * comparison is plenty for an admin audit trail.
 */
function diffState(
  before: string | null | undefined,
  after: string | null | undefined
): { added: string[]; removed: string[]; beforeKeys: string[]; afterKeys: string[] } {
  const beforeObj = safeParseJson(before)
  const afterObj = safeParseJson(after)
  const beforeKeys =
    beforeObj && typeof beforeObj === 'object' ? Object.keys(beforeObj as Record<string, unknown>) : []
  const afterKeys =
    afterObj && typeof afterObj === 'object' ? Object.keys(afterObj as Record<string, unknown>) : []
  const added = afterKeys.filter((k) => !beforeKeys.includes(k))
  const removed = beforeKeys.filter((k) => !afterKeys.includes(k))
  return { added, removed, beforeKeys, afterKeys }
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AuditLogsViewer({ initialFilters, hideHeader }: AuditLogsViewerProps) {
  
  const { canManage } = useRolePermissions()
  const canManageSettings = canManage('canManageSettings')
  const isSuperAdmin = useAuthStore((s) => s.user?.role === 'SUPER_ADMIN')

  // "Clear All Logs" confirmation dialog state — SUPER_ADMIN only.
  const [clearDialogOpen, setClearDialogOpen] = React.useState(false)
  const [clearing, setClearing] = React.useState(false)

  // Initialize from optional `initialFilters` prop OR from URL search params
  // (so the dashboard can deep-link via setView('admin:observability-audit',
  // { action: 'LOGIN' }) and have the viewer pick it up).
  const [filters, setFilters] = React.useState<Filters>(() => {
    const merged: Filters = { ...DEFAULT_FILTERS }
    // URL params (only read on mount — the viewer is the source of truth after).
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search)
      const sev = sp.get('severity')
      const cat = sp.get('category')
      const flagged = sp.get('flagged')
      const action = sp.get('action_filter') || sp.get('action')
      const actor = sp.get('q')
      if (sev) merged.severity = sev
      if (cat) merged.category = cat
      if (flagged === '1' || flagged === 'true') merged.flagged = true
      if (action) merged.action = action
      if (actor) {
        merged.actor = actor
        merged.q = actor
      }
    }
    // Explicit prop overrides win.
    if (initialFilters) Object.assign(merged, initialFilters)
    return merged
  })
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(50)
  // Debounced search string — the input updates `filters.q` immediately so the
  // UI feels responsive, but we only fire an API request 500ms after the user
  // stops typing. This avoids hammering the audit_logs table (which can be
  // huge) on every keystroke.
  const [debouncedQ, setDebouncedQ] = React.useState(filters.q)
  const [selected, setSelected] = React.useState<AuditLog | null>(null)
  // Note dialog state (the "Add Note" button).
  const [noteDialogOpen, setNoteDialogOpen] = React.useState(false)
  const [noteText, setNoteText] = React.useState('')
  // Per-row action busy state — disables buttons while a PATCH is in flight.
  const [acting, setActing] = React.useState<string | null>(null)

  // Debounce the search input. Whenever `filters.q` changes (the live input
  // value), schedule a 500ms timeout to flush it into `debouncedQ`. Clear on
  // cleanup so rapid typing only produces one flush after the user pauses.
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [filters.q])

  const url = buildUrl(filters, page, pageSize, debouncedQ)
  const { data, isLoading, error, mutate } = useSWR<AuditResponse>(url, fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 60_000,
    keepPreviousData: true,
  })

  const logs = data?.logs ?? []
  const total = data?.pagination?.total ?? data?.total ?? 0
  const totalPages = data?.pagination?.totalPages ?? Math.max(1, Math.ceil(total / pageSize))
  const currentPage = data?.pagination?.page ?? page

  React.useEffect(() => {
    setPage(1)
  }, [filters])

  const handleExport = () => {
    // Export pulls ALL matching rows (server ignores page/pageSize when
    // format=csv), so we pass page=1 & pageSize=1 — they're irrelevant.
    const exportUrl = buildUrl(filters, 1, 1, debouncedQ) + '&format=csv'
    toast.success('Preparing CSV export…')
    window.location.href = exportUrl
  }

  const handleReset = () => {
    setFilters({ ...DEFAULT_FILTERS })
  }

  // -------------------------------------------------------------------------
  // Support actions (Task 9)
  // -------------------------------------------------------------------------

  async function refreshAfterAction() {
    await mutate()
    // The Observability Dashboard's stats / flagged queue read from sibling
    // endpoints — broadcast a global revalidation so they refresh too.
    mutateGlobal('/api/audit-logs/stats').catch(() => {})
    mutateGlobal('/api/audit-logs/flagged?unreviewed=true').catch(() => {})
    mutateGlobal('/api/audit-logs/flagged').catch(() => {})
  }

  async function patchLog(
    id: string,
    body: { action: 'flag' | 'review' | 'note'; reason?: string; note?: string }
  ) {
    setActing(`${body.action}:${id}`)
    try {
      const r = await fetch(`/api/audit-logs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j?.error || `Failed (${r.status})`)
      }
      const json = await r.json()
      // Update the local selected log so the Sheet reflects the new state
      // immediately without waiting for the SWR revalidation.
      if (json?.log) {
        setSelected((cur) =>
          cur && cur.id === id ? { ...cur, ...json.log } : cur
        )
      }
      await refreshAfterAction()
      return true
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed')
      return false
    } finally {
      setActing(null)
    }
  }

  async function handleFlag(id: string) {
    const ok = await patchLog(id, { action: 'flag', reason: 'Manually flagged by admin' })
    if (ok) toast.success('Flagged for review')
  }

  async function handleReview(id: string) {
    const ok = await patchLog(id, {
      action: 'review',
      note: 'Reviewed via audit log detail',
    })
    if (ok) toast.success('Marked as reviewed')
  }

  function openNoteDialog() {
    setNoteText('')
    setNoteDialogOpen(true)
  }

  async function submitNote(id: string) {
    const note = noteText.trim()
    if (!note) {
      toast.error('Note text is required')
      return
    }
    const ok = await patchLog(id, { action: 'note', note })
    if (ok) {
      toast.success('Note added')
      setNoteDialogOpen(false)
      setNoteText('')
    }
  }

  async function handleIncidentReport(id: string) {
    try {
      const r = await fetch(
        `/api/audit-logs/incident-report?logIds=${encodeURIComponent(id)}`,
        { credentials: 'include' }
      )
      if (!r.ok) throw new Error(`Failed (${r.status})`)
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      // Pull filename from Content-Disposition if present.
      const cd = r.headers.get('content-disposition') || ''
      const m = cd.match(/filename="?([^"]+)"?/)
      a.download = m ? m[1] : `incident-report-${id}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Incident report downloaded')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Incident report failed')
    }
  }

  async function handleBlockIp(log: AuditLog) {
    if (!log.ipAddress) {
      toast.error('No IP address on this log entry')
      return
    }
    setActing(`block:${log.id}`)
    try {
      const r = await fetch('/api/audit-logs/block-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ipAddress: log.ipAddress,
          reason: `Blocked from audit log: ${log.action}`,
          duration: '24h',
        }),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j?.error || `Failed (${r.status})`)
      }
      mutateGlobal('/api/audit-logs/block-ip').catch(() => {})
      toast.success('IP blocked for 24h', {
        description: log.ipAddress,
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to block IP')
    } finally {
      setActing(null)
    }
  }

  function handleCreateSupportTicket(log: AuditLog) {
    try {
      sessionStorage.setItem(
        'pendingTicketFromAudit',
        JSON.stringify({
          logId: log.id,
          action: log.action,
          entityId: log.entityId,
          entityType: log.entityType,
          actor: log.actor
            ? { id: log.actor.id, name: log.actor.name, email: log.actor.email }
            : null,
          severity: log.severity,
          riskScore: log.riskScore,
          summary: log.summary,
          createdAt: log.createdAt,
        })
      )
      toast.success('Opening support ticket with audit context…')
      window.location.href = '/support'
    } catch {
      toast.error('Could not stash audit context')
    }
  }

  // -------------------------------------------------------------------------
  // Clear ALL audit logs — SUPER_ADMIN only. The API deletes every row,
  // then writes a single AUDIT_LOGS_CLEARED entry as the only surviving
  // record. We broadcast a global revalidation so every audit-related SWR
  // cache (stats, flagged queue, this list) refreshes.
  // -------------------------------------------------------------------------
  async function handleClearAll() {
    if (clearing) return
    setClearing(true)
    const t = toast.loading('Clearing all audit logs…')
    try {
      const r = await fetch('/api/audit-logs/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) {
        throw new Error(j?.error || `Failed (${r.status})`)
      }
      const deleted = typeof j?.deleted === 'number' ? j.deleted : 0
      toast.success(`Cleared ${deleted} audit log entr${deleted === 1 ? 'y' : 'ies'}`, { id: t })
      setClearDialogOpen(false)
      setSelected(null)
      await refreshAfterAction()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to clear audit logs', { id: t })
    } finally {
      setClearing(false)
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        {!hideHeader && (
          <PageHeader
            title="Audit Logs"
            description="Every action is recorded. Append-only."
            actions={
              <Button variant="outline" size="sm" disabled>
                <Download className="h-4 w-4 mr-1.5" /> Export CSV
              </Button>
            }
          />
        )}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 m-2" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        {!hideHeader && (
          <PageHeader title="Audit Logs" description="Every action is recorded. Append-only." />
        )}
        <EmptyState
          icon={History}
          title="Couldn't load audit logs"
          description={error.message || 'Please retry in a moment.'}
          action={
            <Button variant="outline" size="sm" onClick={() => mutate()}>
              <RefreshCw className="h-4 w-4 mr-1.5" /> Retry
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <PageHeader
          title="Audit Logs"
          description="Every action is recorded. Append-only."
          actions={
            <>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RefreshCw className="h-4 w-4 mr-1.5" /> Reset
              </Button>
              <Button size="sm" onClick={handleExport} disabled={logs.length === 0}>
                <Download className="h-4 w-4 mr-1.5" /> Export CSV
              </Button>
              {isSuperAdmin && (
                <AlertDialog open={clearDialogOpen} onOpenChange={(o) => !clearing && setClearDialogOpen(o)}>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive" disabled={logs.length === 0}>
                      <Trash2 className="h-4 w-4 mr-1.5" /> Clear All Logs
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear ALL audit logs?</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <span className="block">
                          This permanently deletes <strong>every</strong> audit log entry in the
                          system. There is no undo — the entire history of actions (logins,
                          payments, allocations, role changes, flags, notes, etc.) will be wiped.
                        </span>
                        <span className="block">
                          A single <code>AUDIT_LOGS_CLEARED</code> entry will be written afterwards
                          so the clear action itself is recorded — that will be the only remaining
                          row in the audit log.
                        </span>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={clearing}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => {
                          e.preventDefault()
                          void handleClearAll()
                        }}
                        disabled={clearing}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {clearing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Clearing…
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-1.5" /> Yes, clear everything
                          </>
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </>
          }
        />
      )}

      {/* Filter bar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Actor / Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Name, email, action, entity ID…"
                  className="pl-8"
                  value={filters.q || filters.actor}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, q: e.target.value, actor: e.target.value }))
                  }
                />
                {filters.q && filters.q !== debouncedQ && (
                  <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Action Type</Label>
              <Select
                value={filters.action}
                onValueChange={(v) => setFilters((f) => ({ ...f, action: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="ALL">All actions</SelectItem>
                  {ACTION_VALUES.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Entity Type</Label>
              <Select
                value={filters.entityType}
                onValueChange={(v) => setFilters((f) => ({ ...f, entityType: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All entities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All entities</SelectItem>
                  {ENTITY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Severity</Label>
              <Select
                value={filters.severity}
                onValueChange={(v) => setFilters((f) => ({ ...f, severity: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All severities</SelectItem>
                  {SEVERITY_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select
                value={filters.category}
                onValueChange={(v) => setFilters((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All categories</SelectItem>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      <span className="capitalize">{c}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">From / To</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={filters.from}
                  onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
                />
                <Input
                  type="date"
                  value={filters.to}
                  onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              Showing <span className="font-semibold text-foreground">{logs.length}</span> of{' '}
              <span className="font-semibold text-foreground">{total}</span> entries
            </span>
            <div className="flex items-center gap-2">
              <Label
                htmlFor="flagged-only"
                className="text-xs flex items-center gap-2 cursor-pointer"
              >
                <Switch
                  id="flagged-only"
                  checked={filters.flagged}
                  onCheckedChange={(v) => setFilters((f) => ({ ...f, flagged: v }))}
                />
                Flagged only
              </Label>
              {(filters.q ||
                filters.action !== 'ALL' ||
                filters.entityType !== 'ALL' ||
                filters.from ||
                filters.to ||
                filters.severity !== 'ALL' ||
                filters.category !== 'ALL' ||
                filters.flagged) && (
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs table */}
      <Card className="relative">
        {isLoading && data ? (
          <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-[1px] grid place-items-center rounded-xl">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating…
            </div>
          </div>
        ) : null}
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No audit logs found"
              description="Try adjusting your filters or check back later."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="">Timestamp</TableHead>
                    <TableHead className="">Actor</TableHead>
                    <TableHead className="">Action</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead className="text-right">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const cat = categorize(log.action)
                    const sev = (log.severity as string) || 'info'
                    return (
                      <TableRow
                        key={log.id}
                        className="cursor-pointer"
                        onClick={() => setSelected(log)}
                      >
                        <TableCell className="text-xs">
                          <div className="font-medium">{fmtDateTime(log.createdAt)}</div>
                          <div className="text-muted-foreground">{fmtRelative(log.createdAt)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              {log.actor?.avatarUrl && (
                                <AvatarImage src={log.actor.avatarUrl} alt={log.actor.name || ''} />
                              )}
                              <AvatarFallback className="text-[10px]">
                                {initials(log.actor?.name || log.actor?.email || 'SYS')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate max-w-[140px]">
                                {log.actor?.name || log.actor?.email || 'System'}
                              </div>
                              {log.actor?.role && (
                                <Badge
                                  variant="outline"
                                  className={cn('text-[9px] mt-0.5', ROLE_BADGE[log.actor.role])}
                                >
                                  {ROLE_LABEL[log.actor.role] || log.actor.role}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={cn('text-[10px] font-semibold', CATEGORY_BADGE[cat])}
                            >
                              {log.action.replace(/_/g, ' ')}
                            </Badge>
                            {log.isFlagged && (
                              <Flag className="h-3 w-3 text-amber-500" />
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">
                            {cat}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn('text-[9px] font-semibold capitalize', SEVERITY_BADGE[sev] || SEVERITY_BADGE.info)}
                          >
                            {SEVERITY_LABEL[sev] || sev}
                          </Badge>
                          {typeof log.riskScore === 'number' && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              risk {log.riskScore}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {log.entityType || '—'}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {log.entityId ? truncate(log.entityId, 10) : '—'}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {log.ipAddress || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelected(log)
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Pagination — server-side. The total/page/pageSize/totalPages
                  come straight from the API response (`pagination` field) so
                  the pager reflects the true filtered set, not just the rows
                  on the current page. The page-size selector lets admins
                  trade latency for fewer round-trips on huge log sets. */}
              {total > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t p-3">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      Showing{' '}
                      <span className="font-semibold text-foreground">
                        {(currentPage - 1) * pageSize + 1}–
                        {Math.min(currentPage * pageSize, total)}
                      </span>{' '}
                      of <span className="font-semibold text-foreground">{total}</span>
                    </span>
                    <span className="hidden sm:inline">·</span>
                    <span className="hidden sm:inline">
                      Page <span className="font-semibold text-foreground">{currentPage}</span> of{' '}
                      <span className="font-semibold text-foreground">{totalPages}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="hidden sm:inline">Rows</span>
                      <Select
                        value={String(pageSize)}
                        onValueChange={(v) => {
                          setPageSize(Number(v))
                          setPage(1)
                        }}
                      >
                        <SelectTrigger className="h-8 w-[72px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[25, 50, 100, 200, 500].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" /> Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 flex-wrap">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Audit Log Entry
              {selected?.isFlagged && (
                <Badge
                  variant="outline"
                  className="ml-1 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]"
                >
                  <Flag className="h-3 w-3 mr-1" /> Flagged
                </Badge>
              )}
            </SheetTitle>
            <SheetDescription>
              Recorded at {selected ? fmtDateTime(selected.createdAt) : ''}
            </SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="space-y-4 px-4 pb-6">
              {/* Summary callout */}
              {selected.summary && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Summary
                  </div>
                  <div className="text-foreground">{selected.summary}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <DetailField label="Action" value={selected.action.replace(/_/g, ' ')} />
                <DetailField label="Category" value={selected.category || categorize(selected.action)} />
                <DetailField label="Entity Type" value={selected.entityType} />
                <DetailField
                  label="Entity ID"
                  value={selected.entityId || '—'}
                  mono
                />
                <DetailField
                  label="IP Address"
                  value={selected.ipAddress || '—'}
                  mono
                />
                <DetailField label="Timestamp" value={fmtDateTime(selected.createdAt)} />
              </div>

              {/* Severity + Risk Score */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    Severity
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-semibold capitalize',
                      SEVERITY_BADGE[(selected.severity as string) || 'info'] || SEVERITY_BADGE.info
                    )}
                  >
                    {SEVERITY_LABEL[(selected.severity as string) || 'info'] || selected.severity || 'info'}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    Risk Score {typeof selected.riskScore === 'number' ? `(${selected.riskScore}/100)` : ''}
                  </div>
                  {typeof selected.riskScore === 'number' ? (
                    <RiskBar score={selected.riskScore} />
                  ) : (
                    <div className="text-xs text-muted-foreground">—</div>
                  )}
                </div>
              </div>

              {/* Tags */}
              {selected.tags && (
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Tags
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.tags
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean)
                      .map((t, i) => (
                        <Badge
                          key={`${t}-${i}`}
                          variant="outline"
                          className="text-[10px] bg-muted/50"
                        >
                          {t}
                        </Badge>
                      ))}
                  </div>
                </div>
              )}

              {/* Flag reason */}
              {selected.isFlagged && selected.flagReason && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm">
                  <div className="text-[10px] font-medium text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Flag className="h-3 w-3" /> Flag Reason
                  </div>
                  <div className="text-amber-900 dark:text-amber-200">{selected.flagReason}</div>
                </div>
              )}

              {/* Actor */}
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actor
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg border bg-card">
                  <Avatar className="h-9 w-9">
                    {selected.actor?.avatarUrl && (
                      <AvatarImage src={selected.actor.avatarUrl} alt={selected.actor.name || ''} />
                    )}
                    <AvatarFallback className="text-xs">
                      {initials(selected.actor?.name || selected.actor?.email || 'SYS')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {selected.actor?.name || 'System'}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {selected.actor?.email || '—'}
                    </div>
                  </div>
                  {selected.actor?.role && (
                    <Badge variant="outline" className={cn('text-[10px]', ROLE_BADGE[selected.actor.role])}>
                      {ROLE_LABEL[selected.actor.role] || selected.actor.role}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Before / After state diff */}
              {(selected.beforeState || selected.afterState) && (
                <BeforeAfterDiff
                  before={selected.beforeState}
                  after={selected.afterState}
                />
              )}

              {selected.userAgent && (
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    User Agent
                  </div>
                  <pre className="bg-muted p-3 rounded text-xs whitespace-pre-wrap break-all">
                    {selected.userAgent}
                  </pre>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Metadata
                </div>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                  {JSON.stringify(safeParseJson(selected.metadata) ?? null, null, 2)}
                </pre>
              </div>

              {/* Admin note */}
              {selected.adminNote && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm">
                  <div className="text-[10px] font-medium text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <StickyNote className="h-3 w-3" /> Admin Note
                  </div>
                  <pre className="text-amber-900 dark:text-amber-200 whitespace-pre-wrap font-sans text-xs">
                    {selected.adminNote}
                  </pre>
                </div>
              )}

              {/* Reviewed by / at */}
              {selected.reviewedAt && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>
                    Reviewed by{' '}
                    <span className="font-medium text-foreground">
                      {selected.reviewer?.name || selected.reviewer?.email || selected.reviewedBy || 'admin'}
                    </span>{' '}
                    on {fmtDateTime(selected.reviewedAt)}
                  </span>
                </div>
              )}

              {/* ── Support Actions ── */}
              <div className="border-t pt-4 space-y-2">
                <div className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <LifeBuoy className="h-3.5 w-3.5" /> Support Actions
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                    disabled={!!acting || selected.isFlagged === true || !canManageSettings}
                    onClick={() => handleFlag(selected.id)}
                  >
                    <Flag className="h-3.5 w-3.5 mr-1.5" />
                    {acting === `flag:${selected.id}` ? 'Flagging…' : 'Flag for Review'}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    disabled={!!acting || !!selected.reviewedAt || !canManageSettings}
                    onClick={() => handleReview(selected.id)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                    {acting === `review:${selected.id}` ? 'Reviewing…' : 'Mark Reviewed'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!!acting || !canManageSettings}
                    onClick={openNoteDialog}
                  >
                    <StickyNote className="h-3.5 w-3.5 mr-1.5" />
                    Add Note
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!!acting}
                    onClick={() => handleIncidentReport(selected.id)}
                  >
                    <FileJson className="h-3.5 w-3.5 mr-1.5" />
                    Incident Report
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={!!acting || !selected.ipAddress || !canManageSettings}
                    onClick={() => handleBlockIp(selected)}
                  >
                    <ShieldBan className="h-3.5 w-3.5 mr-1.5" />
                    {acting === `block:${selected.id}` ? 'Blocking…' : 'Block IP'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!!acting}
                    onClick={() => handleCreateSupportTicket(selected)}
                  >
                    <LifeBuoy className="h-3.5 w-3.5 mr-1.5" />
                    Support Ticket
                  </Button>
                </div>
                {!canManageSettings && (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300 mt-1">
                    <AlertTriangle className="h-3 w-3" />
                    You have view-only access — flag / review / note / block actions are disabled.
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Note dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-primary" /> Add Admin Note
            </DialogTitle>
            <DialogDescription>
              The note is appended to the audit log entry with a timestamp. Visible to every admin who opens this entry.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              rows={5}
              placeholder="e.g. Verified with the user via phone — this was a legitimate password reset."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
              Max 1000 characters. Each note is prefixed with the current timestamp.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNoteDialogOpen(false)}
              disabled={!!acting}
            >
              Cancel
            </Button>
            <Button
              onClick={() => selected && submitNote(selected.id)}
              disabled={!!acting || !noteText.trim()}
            >
              {acting === `note:${selected?.id}` ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Adding…
                </>
              ) : (
                'Add Note'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// RiskBar — mini progress bar coloured by risk tier (green/amber/red).
// ---------------------------------------------------------------------------

function RiskBar({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score))
  const tier =
    clamped >= 60 ? 'bg-red-500' : clamped >= 30 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="space-y-1">
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', tier)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <div className="text-[10px] text-muted-foreground">
        {clamped >= 60 ? 'High risk' : clamped >= 30 ? 'Moderate risk' : 'Low risk'}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// BeforeAfterDiff — side-by-side JSON snapshots with added/removed tinting.
// ---------------------------------------------------------------------------

function BeforeAfterDiff({
  before,
  after,
}: {
  before: string | null | undefined
  after: string | null | undefined
}) {
  const { added, removed } = diffState(before, after)
  const beforeStr = before
    ? JSON.stringify(safeParseJson(before), null, 2)
    : '(empty)'
  const afterStr = after
    ? JSON.stringify(safeParseJson(after), null, 2)
    : '(empty)'

  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        State Diff
      </div>
      {(added.length > 0 || removed.length > 0) && (
        <div className="flex flex-wrap gap-1.5 text-[10px]">
          {added.map((k) => (
            <Badge
              key={`a-${k}`}
              variant="outline"
              className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
            >
              + {k}
            </Badge>
          ))}
          {removed.map((k) => (
            <Badge
              key={`r-${k}`}
              variant="outline"
              className="bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30"
            >
              − {k}
            </Badge>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <div className="text-[10px] font-medium text-red-600 dark:text-red-400 uppercase tracking-wider">
            Before
          </div>
          <pre className="bg-red-500/5 border border-red-500/20 p-2 rounded text-[10px] overflow-x-auto max-h-48">
            {beforeStr}
          </pre>
        </div>
        <div className="space-y-1">
          <div className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            After
          </div>
          <pre className="bg-emerald-500/5 border border-emerald-500/20 p-2 rounded text-[10px] overflow-x-auto max-h-48">
            {afterStr}
          </pre>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Detail Field
// ---------------------------------------------------------------------------

function DetailField({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </div>
      <div className={cn('text-sm font-medium', mono && 'font-mono text-xs')}>{value}</div>
    </div>
  )
}
