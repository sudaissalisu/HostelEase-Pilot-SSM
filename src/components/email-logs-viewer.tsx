'use client'

import * as React from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import {
  Mail,
  MailCheck,
  MailX,
  Download,
  Eye,
  Loader2,
  RefreshCw,
  Clock,
  Send,
  CircleCheck,
  CircleAlert,
  Search,
  ChevronLeft,
  ChevronRight,
  RotateCw,
} from 'lucide-react'

import { PageHeader, StatCard, EmptyState } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import { cn, fmtDateTime, fmtRelative, truncate } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EmailStatus = 'QUEUED' | 'SENT' | 'FAILED'

interface EmailLog {
  id: string
  toEmail: string
  subject: string
  body: string
  status: EmailStatus
  error?: string | null
  createdAt: string
  sentAt?: string | null
  retryCount?: number
  lastRetriedAt?: string | null
  retriedFromId?: string | null
}

interface EmailResponse {
  logs: EmailLog[]
  total?: number
  failedCount?: number
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

const STATUS_BADGE: Record<EmailStatus, string> = {
  QUEUED: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  SENT: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  FAILED: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30',
}

const STATUS_ICON: Record<EmailStatus, React.ElementType> = {
  QUEUED: Clock,
  SENT: CircleCheck,
  FAILED: CircleAlert,
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
// Main Component
// ---------------------------------------------------------------------------

export function EmailLogsViewer() {
  const [status, setStatus] = React.useState<string>('ALL')
  const [search, setSearch] = React.useState('')
  // Debounced search string — the input updates `search` immediately so the
  // UI feels responsive, but we only fire an API request 500ms after the user
  // stops typing. This avoids hammering the email_logs table on every
  // keystroke.
  const [debouncedSearch, setDebouncedSearch] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(50)
  const [selected, setSelected] = React.useState<EmailLog | null>(null)
  // ── Retry state ──
  const [retryingId, setRetryingId] = React.useState<string | null>(null)
  const [retryingAll, setRetryingAll] = React.useState(false)

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [search])

  // Reset to page 1 whenever the filters change so the user doesn't end up
  // stranded on a page that no longer exists after filtering.
  React.useEffect(() => {
    setPage(1)
  }, [status, debouncedSearch])

  // Build the API URL from the current filters + pagination state. We use
  // the debounced search (not the live input value) so the URL only changes
  // 500ms after the user stops typing — that's what SWR keys on.
  const url = React.useMemo(() => {
    const p = new URLSearchParams()
    if (status !== 'ALL') p.set('status', status)
    if (debouncedSearch.trim()) p.set('q', debouncedSearch.trim())
    p.set('page', String(page))
    p.set('pageSize', String(pageSize))
    return `/api/email-logs?${p.toString()}`
  }, [status, debouncedSearch, page, pageSize])

  const { data, isLoading, error, mutate } = useSWR<EmailResponse>(url, fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 60_000,
    keepPreviousData: true,
  })

  const logs = data?.logs ?? []
  const total = data?.pagination?.total ?? data?.total ?? 0
  const totalPages = data?.pagination?.totalPages ?? Math.max(1, Math.ceil(total / pageSize))
  const currentPage = data?.pagination?.page ?? page

  // The dashboard's StatCards previously derived their counts from the page
  // slice. With server-side pagination that's wrong (the page only contains
  // up to `pageSize` rows). We now compute them from `total` (the full
  // filtered count) when status filter is 'ALL', and otherwise show a
  // best-effort count derived from the current page. The detailed per-status
  // totals are available in the pager footer for any curious admin.
  const stats = React.useMemo(() => {
    const onPageSent = logs.filter((l) => l.status === 'SENT').length
    const onPageFailed = logs.filter((l) => l.status === 'FAILED').length
    const onPageQueued = logs.filter((l) => l.status === 'QUEUED').length
    // When the status filter is 'ALL', `total` is the true total sent count.
    // When filtered, it's the count for that status — we use it as the
    // headline number and the on-page counts as hints.
    const totalSent = status === 'ALL' ? total : status === 'SENT' ? total : onPageSent
    const totalFailed = status === 'ALL' ? 0 : status === 'FAILED' ? total : onPageFailed
    const totalQueued = status === 'ALL' ? 0 : status === 'QUEUED' ? total : onPageQueued
    const successRate =
      totalSent + totalFailed > 0 ? Math.round((totalSent / (totalSent + totalFailed)) * 100) : 0
    return {
      total: totalSent,
      sent: totalSent,
      failed: totalFailed,
      queued: totalQueued,
      successRate,
    }
  }, [logs, total, status])

  const handleExport = () => {
    // CSV export pulls ALL matching rows (server ignores page/pageSize when
    // format=csv), so we pass page=1 & pageSize=1 — they're irrelevant.
    const p = new URLSearchParams()
    if (status !== 'ALL') p.set('status', status)
    if (debouncedSearch.trim()) p.set('q', debouncedSearch.trim())
    p.set('page', '1')
    p.set('pageSize', '1')
    p.set('format', 'csv')
    toast.success('Preparing CSV export…')
    window.location.href = `/api/email-logs?${p.toString()}`
  }

  // ── Retry a single failed email ──
  async function handleRetry(log: EmailLog) {
    setRetryingId(log.id)
    try {
      const res = await fetch(`/api/email-logs/${log.id}/retry`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || data?.message || `Request failed (HTTP ${res.status})`)
      }
      if (data?.success) {
        toast.success(`Email re-sent to ${log.toEmail}`)
      } else {
        toast.error(`Retry failed — ${data?.message || 'all providers still down'}`)
      }
      mutate()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to retry email')
    } finally {
      setRetryingId(null)
    }
  }

  // ── Retry ALL failed emails (bulk) ──
  async function handleRetryAll() {
    setRetryingAll(true)
    try {
      const res = await fetch('/api/email-logs/retry-all', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 50 }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || data?.message || `Request failed (HTTP ${res.status})`)
      }
      const { succeeded, attempted, failed } = data
      if (succeeded > 0 && failed === 0) {
        toast.success(`All ${succeeded} failed email(s) re-sent successfully.`)
      } else if (succeeded > 0 && failed > 0) {
        toast.success(`${succeeded}/${attempted} emails re-sent. ${failed} still failing — check logs.`)
      } else {
        toast.error(`All ${failed} retry attempt(s) failed — all providers are still down.`)
      }
      mutate()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to retry all emails')
    } finally {
      setRetryingAll(false)
    }
  }

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Email Logs"
          description="Every outgoing email — queued, sent, or failed."
        />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
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
        <PageHeader title="Email Logs" description="Every outgoing email — queued, sent, or failed." />
        <EmptyState
          icon={MailX}
          title="Couldn't load email logs"
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
      <PageHeader
        title="Email Logs"
        description="Every outgoing email — queued, sent, or failed."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {(data?.failedCount ?? 0) > 0 && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleRetryAll}
                disabled={retryingAll}
                title={`Retry all ${data?.failedCount ?? 0} failed email(s)`}
              >
                {retryingAll ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Retrying…
                  </>
                ) : (
                  <>
                    <RotateCw className="h-4 w-4 mr-1.5" /> Retry All Failed ({data?.failedCount ?? 0})
                  </>
                )}
              </Button>
            )}
            <Button size="sm" onClick={handleExport} disabled={total === 0}>
              <Download className="h-4 w-4 mr-1.5" /> Export CSV
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Sent"
          value={stats.total}
          icon={Send}
          hint={`${stats.queued} queued`}
          accent="primary"
        />
        <StatCard
          label="Failed"
          value={stats.failed}
          icon={MailX}
          hint="Require attention"
          accent="destructive"
        />
        <StatCard
          label="Success Rate"
          value={`${stats.successRate}%`}
          icon={MailCheck}
          hint={`${stats.sent} delivered successfully`}
          accent="blue"
        />
      </div>

      {/* Filter bar — search + status filter */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Recipient email, subject, or status…"
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && search !== debouncedSearch && (
                  <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="QUEUED">Queued</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              Showing{' '}
              <span className="font-semibold text-foreground">
                {total > 0 ? (currentPage - 1) * pageSize + 1 : 0}–
                {Math.min(currentPage * pageSize, total)}
              </span>{' '}
              of <span className="font-semibold text-foreground">{total}</span> emails
            </span>
            {(search || status !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('')
                  setStatus('ALL')
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

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
              icon={Mail}
              title="No emails found"
              description="Try adjusting your filters, or once the system starts sending emails — verifications, notifications, receipts — they'll appear here."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="">Recipient</TableHead>
                    <TableHead className="">Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="">Created</TableHead>
                    <TableHead className="">Sent</TableHead>
                    <TableHead className="text-right">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const StatusIcon = STATUS_ICON[log.status]
                    return (
                      <TableRow
                        key={log.id}
                        className="cursor-pointer"
                        onClick={() => setSelected(log)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary grid place-items-center shrink-0">
                              <Mail className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate max-w-[180px]">
                                {log.toEmail}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {truncate(log.subject, 60)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={cn('text-[10px] font-semibold', STATUS_BADGE[log.status])}
                            >
                              <StatusIcon className="h-3 w-3" />
                              {log.status}
                            </Badge>
                            {log.retryCount !== undefined && log.retryCount > 0 && (
                              <span
                                className="text-[9px] text-amber-600 dark:text-amber-400 font-medium px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 shrink-0"
                                title={`Retried ${log.retryCount}× — last: ${log.lastRetriedAt ? fmtRelative(log.lastRetriedAt) : 'unknown'}`}
                              >
                                ↻{log.retryCount}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-medium">{fmtDateTime(log.createdAt)}</div>
                          <div className="text-muted-foreground">{fmtRelative(log.createdAt)}</div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {log.sentAt ? (
                            <>
                              <div className="font-medium">{fmtDateTime(log.sentAt)}</div>
                              <div className="text-muted-foreground">{fmtRelative(log.sentAt)}</div>
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {(log.status === 'FAILED' || log.status === 'QUEUED') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRetry(log)
                                }}
                                disabled={retryingId === log.id}
                                title="Retry sending this email"
                              >
                                {retryingId === log.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <RotateCw className="h-3.5 w-3.5" />
                                )}
                                <span className="sr-only">Retry</span>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelected(log)
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span className="sr-only">View</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Pagination — server-side */}
              {total > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t p-3">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
                          {[25, 50, 100, 200].map((n) => (
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
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              Email Detail
            </SheetTitle>
            <SheetDescription>
              {selected ? fmtDateTime(selected.createdAt) : ''}
            </SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="space-y-4 px-4 pb-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <DetailField label="To" value={selected.toEmail} />
                <DetailField label="Status" value={selected.status} />
                <DetailField label="Created" value={fmtDateTime(selected.createdAt)} />
                <DetailField
                  label="Sent"
                  value={selected.sentAt ? fmtDateTime(selected.sentAt) : '—'}
                />
                {selected.retryCount !== undefined && selected.retryCount > 0 && (
                  <>
                    <DetailField
                      label="Retry Count"
                      value={`${selected.retryCount}× retried`}
                    />
                    <DetailField
                      label="Last Retried"
                      value={selected.lastRetriedAt ? fmtDateTime(selected.lastRetriedAt) : '—'}
                    />
                  </>
                )}
              </div>

              {/* Retry button in the detail sheet for FAILED/QUEUED emails */}
              {(selected.status === 'FAILED' || selected.status === 'QUEUED') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-900/20"
                  onClick={() => handleRetry(selected)}
                  disabled={retryingId === selected.id}
                >
                  {retryingId === selected.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Retrying…
                    </>
                  ) : (
                    <>
                      <RotateCw className="h-4 w-4 mr-2" /> Retry Sending This Email
                    </>
                  )}
                </Button>
              )}
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Subject
                </div>
                <div className="text-sm font-medium p-3 rounded-lg border bg-card">
                  {selected.subject}
                </div>
              </div>
              {selected.error && (
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-destructive uppercase tracking-wider">
                    Error
                  </div>
                  <pre className="bg-destructive/10 border border-destructive/30 p-3 rounded text-xs whitespace-pre-wrap break-all text-destructive">
                    {selected.error}
                  </pre>
                </div>
              )}
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Body
                </div>
                <pre className="bg-muted p-3 rounded text-xs whitespace-pre-wrap break-words max-h-[60vh] overflow-y-auto">
                  {selected.body}
                </pre>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </div>
      <div className="text-sm font-medium truncate">{value}</div>
    </div>
  )
}
