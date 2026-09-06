'use client'

/**
 * Versioning & Change Lock — standalone admin page.
 *
 * Replaces the embedded "Version History" card that used to live inside the
 * Security Center. The user explicitly asked for a dedicated page with its
 * own sidebar menu item, a dropdown-style version picker on mobile, and a
 * full change-lock control surface.
 *
 * Data sources:
 *   - GET  /api/versioning  → { currentVersion, currentEntry, changelog, lock }
 *   - POST /api/versioning  → { active, reason?, duration? }  (super-admin)
 *
 * Lock state is persisted server-side in SystemSetting (key: version_change_lock)
 * so a refresh restores the live lock; toggling it writes an audit log entry.
 */

import * as React from 'react'
import useSWR, { mutate as mutateGlobal } from 'swr'
import { toast } from 'sonner'
import {
  History,
  Lock,
  Unlock,
  GitBranch,
  GitCommit,
  Tag,
  Calendar,
  Shield,
  RefreshCw,
  Download,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react'

import { PageHeader, LoadingState } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn, fmtRelative, fmtDateTime } from '@/lib/utils'
import { useAuthStore } from '@/lib/store'
import { useRolePermissions } from '@/lib/use-role-permissions'
import type { VersionEntry } from '@/lib/versioning'

// ---------------------------------------------------------------------------
// Types (mirror the API response)
// ---------------------------------------------------------------------------

type LockDuration = '1h' | '6h' | '24h' | 'manual'

interface ChangeLockState {
  active: boolean
  reason?: string
  duration?: LockDuration
  lockedBy?: string
  lockedByName?: string
  lockedAt?: string
  expiresAt?: string | null
}

interface VersioningResponse {
  currentVersion: string
  currentEntry: VersionEntry
  changelog: VersionEntry[]
  lock: ChangeLockState
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

const fetcher = async (url: string) => {
  const r = await fetch(url, { credentials: 'include' })
  if (!r.ok) throw new Error(`Failed to load versioning data (${r.status})`)
  return r.json() as Promise<VersioningResponse>
}

const DURATION_LABELS: Record<LockDuration, string> = {
  '1h': '1 hour',
  '6h': '6 hours',
  '24h': '24 hours',
  manual: 'Until manually unlocked',
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function VersionManager() {
  const { data, error, isLoading, mutate } = useSWR<VersioningResponse>(
    '/api/versioning',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  )

  // Role-permission gating — page is reachable by ADMIN+, but only
  // SUPER_ADMIN can toggle the lock (the API enforces this too).
  const { canManage } = useRolePermissions()
  const canEdit = canManage('canManageSettings')
  const user = useAuthStore((s) => s.user)
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'

  // The currently-selected version (defaults to the latest). Stored as the
  // version string so it survives SWR revalidation; we look up the entry.
  const [selectedVersion, setSelectedVersion] = React.useState<string | null>(null)
  // Version-comparison picks — default: A = oldest, B = current.
  const [compareA, setCompareA] = React.useState<string | null>(null)
  const [compareB, setCompareB] = React.useState<string | null>(null)

  // Lock dialog state (the "Lock Version" header button).
  const [lockDialogOpen, setLockDialogOpen] = React.useState(false)
  const [lockReasonInput, setLockReasonInput] = React.useState('')
  const [lockDurationInput, setLockDurationInput] = React.useState<LockDuration>('manual')
  const [togglingLock, setTogglingLock] = React.useState(false)

  // Initialise defaults once data arrives.
  React.useEffect(() => {
    if (!data) return
    if (!selectedVersion) setSelectedVersion(data.currentVersion)
    if (!compareA) setCompareA(data.changelog[0]?.version || data.currentVersion)
    if (!compareB) setCompareB(data.currentVersion)
  }, [data, selectedVersion, compareA, compareB])

  const changelog = data?.changelog || []
  const currentVersion = data?.currentVersion || ''
  const currentEntry = data?.currentEntry
  const lock = data?.lock || { active: false }

  // Reverse (newest first) for the sidebar list.
  const changelogNewestFirst = React.useMemo(
    () => [...changelog].reverse(),
    [changelog]
  )

  const selectedEntry = React.useMemo(
    () => changelog.find((e) => e.version === selectedVersion) || currentEntry,
    [changelog, selectedVersion, currentEntry]
  )

  const entryA = React.useMemo(
    () => changelog.find((e) => e.version === compareA),
    [changelog, compareA]
  )
  const entryB = React.useMemo(
    () => changelog.find((e) => e.version === compareB),
    [changelog, compareB]
  )

  // Diff: changes in B that are NOT in A (added), and changes in A that are
  // NOT in B (removed). Pure string-set comparison — entries are bullet lists.
  const diff = React.useMemo(() => {
    if (!entryA || !entryB) return { added: [], removed: [] as string[] }
    const setA = new Set(entryA.changes)
    const setB = new Set(entryB.changes)
    const added = entryB.changes.filter((c) => !setA.has(c))
    const removed = entryA.changes.filter((c) => !setB.has(c))
    return { added, removed }
  }, [entryA, entryB])

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  function handleRefresh() {
    mutate()
    toast.success('Version data refreshed')
  }

  function handleExportChangelog() {
    if (!changelog.length) {
      toast.error('No changelog to export')
      return
    }
    // Build a plain-text changelog file the user can download.
    const lines: string[] = [
      '# AUSU Hostel Allocation System — Changelog',
      `# Exported: ${new Date().toISOString()}`,
      `# Current version: v${currentVersion}`,
      '',
    ]
    for (const entry of changelog) {
      lines.push(`## v${entry.version} — ${entry.title}`)
      lines.push(`Released: ${new Date(entry.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`)
      lines.push('')
      for (const change of entry.changes) {
        lines.push(`  - ${change}`)
      }
      lines.push('')
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `changelog-v${currentVersion}-${Date.now()}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Changelog exported')
  }

  function openLockDialog() {
    // Pre-fill with whatever the current lock reason is (if any).
    setLockReasonInput(lock.reason || '')
    setLockDurationInput(lock.duration || 'manual')
    setLockDialogOpen(true)
  }

  /**
   * Toggle the change-lock. Called from BOTH:
   *   - the Switch in the Change Lock card (no dialog — flips directly)
   *   - the "Lock Version" header button (opens dialog first, then this runs)
   *
   * When enabling via the Switch, we use the dialog's current reason/duration
   * inputs (or fall back to whatever's already persisted). When enabling via
   * the dialog's confirm button, we use the inputs the user just typed.
   */
  async function toggleLock(activate: boolean, opts?: { reason?: string; duration?: LockDuration }) {
    if (!isSuperAdmin) {
      toast.error('Only super admins can toggle the change-lock.')
      return
    }
    if (activate) {
      const reason = (opts?.reason ?? lockReasonInput).trim()
      if (!reason) {
        toast.error('A lock reason is required.')
        return
      }
      const duration = opts?.duration ?? lockDurationInput
      setTogglingLock(true)
      try {
        const r = await fetch('/api/versioning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ active: true, reason, duration }),
        })
        if (!r.ok) {
          const body = await r.json().catch(() => ({}))
          throw new Error(body.error || `Failed (${r.status})`)
        }
        await mutate()
        mutateGlobal('/api/audit-logs').catch(() => {})
        setLockDialogOpen(false)
        toast.success('Change-lock enabled', {
          description: `Locked for ${DURATION_LABELS[duration]}.`,
        })
      } catch (e) {
        toast.error('Failed to enable lock', { description: e instanceof Error ? e.message : undefined })
      } finally {
        setTogglingLock(false)
      }
    } else {
      // Disabling — no reason needed.
      setTogglingLock(true)
      try {
        const r = await fetch('/api/versioning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ active: false }),
        })
        if (!r.ok) {
          const body = await r.json().catch(() => ({}))
          throw new Error(body.error || `Failed (${r.status})`)
        }
        await mutate()
        mutateGlobal('/api/audit-logs').catch(() => {})
        toast.success('Change-lock disabled', {
          description: 'Admins can make changes again.',
        })
      } catch (e) {
        toast.error('Failed to disable lock', { description: e instanceof Error ? e.message : undefined })
      } finally {
        setTogglingLock(false)
      }
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="space-y-6 pb-8">
        <PageHeader
          title="Versioning & Change Lock"
          description="Track deployments, lock the active version, and review every change ever shipped."
        />
        <LoadingState label="Loading version data…" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6 pb-8">
        <PageHeader
          title="Versioning & Change Lock"
          description="Track deployments, lock the active version, and review every change ever shipped."
          actions={
            <Button variant="outline" size="sm" onClick={() => mutate()}>
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          }
        />
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto text-amber-500 mb-2" />
            <p className="text-sm text-muted-foreground">
              Could not load version data. Check your connection and try again.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Versioning & Change Lock"
        description="Track deployments, lock the active version, and review every change ever shipped."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportChangelog}>
              <Download className="h-4 w-4 mr-2" /> Export Changelog
            </Button>
            <Button
              size="sm"
              onClick={openLockDialog}
              disabled={!isSuperAdmin || lock.active || !canEdit}
              title={!isSuperAdmin ? 'Only super admins can lock the version' : lock.active ? 'Lock is already active' : undefined}
            >
              <Lock className="h-4 w-4 mr-2" /> Lock Version
            </Button>
          </>
        }
      />

      {!canEdit && (
        <div className="rounded-md border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 shrink-0" />
          <span>You have view-only access to this page. Lock controls are disabled.</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* ── Sidebar access menu (desktop) / dropdown (mobile) ──────────── */}
        <VersionSidebar
          entries={changelogNewestFirst}
          currentVersion={currentVersion}
          selectedVersion={selectedVersion || currentVersion}
          onSelect={setSelectedVersion}
        />

        {/* ── Main column ────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Mobile dropdown — replaces the sidebar on small screens */}
          <div className="md:hidden">
            <Label htmlFor="version-jump" className="text-xs text-muted-foreground mb-1.5 block">
              Jump to version
            </Label>
            <Select
              value={selectedVersion || currentVersion}
              onValueChange={setSelectedVersion}
            >
              <SelectTrigger id="version-jump" className="w-full">
                <SelectValue placeholder="Pick a version…" />
              </SelectTrigger>
              <SelectContent>
                {changelogNewestFirst.map((entry) => (
                  <SelectItem key={entry.version} value={entry.version}>
                    v{entry.version} — {entry.title}
                    {entry.version === currentVersion ? '  (current)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Current Version hero card */}
          {currentEntry && (
            <CurrentVersionHero
              entry={currentEntry}
              lock={lock}
            />
          )}

          {/* Selected version detail card */}
          {selectedEntry && (
            <VersionDetailCard entry={selectedEntry} isCurrent={selectedEntry.version === currentVersion} />
          )}

          {/* Version Comparison card */}
          <VersionComparisonCard
            entries={changelog}
            compareA={compareA || ''}
            compareB={compareB || ''}
            onChangeA={setCompareA}
            onChangeB={setCompareB}
            added={diff.added}
            removed={diff.removed}
            entryA={entryA}
            entryB={entryB}
          />

          {/* Change Lock control card */}
          <ChangeLockCard
            lock={lock}
            canToggle={isSuperAdmin && canEdit}
            toggling={togglingLock}
            lockReasonInput={lockReasonInput}
            lockDurationInput={lockDurationInput}
            onReasonChange={setLockReasonInput}
            onDurationChange={setLockDurationInput}
            onToggle={(next) => toggleLock(next)}
            onOpenDialog={openLockDialog}
          />
        </div>
      </div>

      {/* Lock-version dialog (opened from the header "Lock Version" button) */}
      <Dialog open={lockDialogOpen} onOpenChange={setLockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" /> Enable Change Lock
            </DialogTitle>
            <DialogDescription>
              While the lock is active, admins cannot edit hostel structure, sessions,
              or payment settings until it is released.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="lock-reason">Lock reason <span className="text-destructive">*</span></Label>
              <Textarea
                id="lock-reason"
                placeholder="e.g. End-of-session reconciliation in progress — no structural changes allowed until cleared."
                value={lockReasonInput}
                onChange={(e) => setLockReasonInput(e.target.value)}
                rows={3}
              />
              <p className="text-[10px] text-muted-foreground">
                This reason is persisted with the lock and shown to every admin who views this page.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lock-duration">Lock duration</Label>
              <Select
                value={lockDurationInput}
                onValueChange={(v) => setLockDurationInput(v as LockDuration)}
              >
                <SelectTrigger id="lock-duration" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 hour</SelectItem>
                  <SelectItem value="6h">6 hours</SelectItem>
                  <SelectItem value="24h">24 hours</SelectItem>
                  <SelectItem value="manual">Until manually unlocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLockDialogOpen(false)}
              disabled={togglingLock}
            >
              Cancel
            </Button>
            <Button
              onClick={() => toggleLock(true)}
              disabled={togglingLock || !lockReasonInput.trim()}
            >
              {togglingLock ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Locking…
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" /> Enable Lock
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// VersionSidebar — left rail (desktop) + hidden on mobile (a dropdown is used
// in the main column instead).
// ---------------------------------------------------------------------------

function VersionSidebar({
  entries,
  currentVersion,
  selectedVersion,
  onSelect,
}: {
  entries: VersionEntry[]
  currentVersion: string
  selectedVersion: string
  onSelect: (v: string) => void
}) {
  return (
    <aside className="w-56 shrink-0 hidden md:block">
      <div className="lg:sticky lg:top-20">
        <div className="rounded-xl border bg-card">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b">
            <History className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Versions
            </span>
            <Badge variant="outline" className="ml-auto text-[9px]">{entries.length}</Badge>
          </div>
          <div className="max-h-[calc(100vh-12rem)] overflow-y-auto p-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-track]:bg-transparent">
            <ul className="space-y-1">
              {entries.map((entry) => {
                const isCurrent = entry.version === currentVersion
                const isSelected = entry.version === selectedVersion
                return (
                  <li key={entry.version}>
                    <button
                      type="button"
                      onClick={() => onSelect(entry.version)}
                      className={cn(
                        'w-full text-left rounded-lg border px-2.5 py-2 transition-colors',
                        'hover:bg-accent/60',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent'
                      )}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Badge variant="outline" className="font-mono text-[10px] py-0 px-1.5">
                          v{entry.version}
                        </Badge>
                        {isCurrent && (
                          <Badge className="text-[8px] py-0 px-1.5 h-4 bg-primary text-primary-foreground">
                            CURRENT
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs font-medium leading-snug line-clamp-2">
                        {entry.title}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5" />
                        {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    </aside>
  )
}

// ---------------------------------------------------------------------------
// CurrentVersionHero — gradient hero card with the live version + lock status.
// ---------------------------------------------------------------------------

function CurrentVersionHero({
  entry,
  lock,
}: {
  entry: VersionEntry
  lock: ChangeLockState
}) {
  const isLocked = lock.active
  return (
    <Card className="relative overflow-hidden border-primary/20">
      {/* Top accent bar */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary via-primary/40 to-transparent" />
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

      <CardContent className="relative p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="font-mono text-xs">v{entry.version}</Badge>
              <Badge
                className={cn(
                  'text-[10px]',
                  isLocked
                    ? 'bg-amber-500 text-amber-950 hover:bg-amber-500'
                    : 'bg-emerald-500 text-emerald-950 hover:bg-emerald-500'
                )}
              >
                {isLocked ? (
                  <>
                    <Lock className="h-3 w-3 mr-1" /> LOCKED
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-1" /> ACTIVE
                  </>
                )}
              </Badge>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              {entry.title}
            </h2>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(entry.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              <span className="flex items-center gap-1">
                <GitCommit className="h-3 w-3" />
                {entry.changes.length} change{entry.changes.length === 1 ? '' : 's'}
              </span>
              <span className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                Released {fmtRelative(entry.date)}
              </span>
            </div>
          </div>

          <div className="shrink-0 grid place-items-center h-16 w-16 rounded-2xl bg-primary/10">
            <GitBranch className="h-8 w-8 text-primary" />
          </div>
        </div>

        {isLocked && (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
            <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-semibold">Change lock is active</div>
              <div>
                Admins cannot edit hostel structure, sessions, or payment settings until unlocked.
              </div>
              {lock.reason && (
                <div className="text-[11px] italic">
                  Reason: &ldquo;{lock.reason}&rdquo;
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// VersionDetailCard — full changelog for the selected version.
// ---------------------------------------------------------------------------

function VersionDetailCard({
  entry,
  isCurrent,
}: {
  entry: VersionEntry
  isCurrent: boolean
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary via-primary/40 to-transparent" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <GitCommit className="h-4 w-4 text-primary" />
          <Badge variant="outline" className="font-mono text-xs">v{entry.version}</Badge>
          <span className="truncate">{entry.title}</span>
          {isCurrent && (
            <Badge className="text-[9px] bg-primary text-primary-foreground">CURRENT</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Released on{' '}
          {new Date(entry.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          {' · '}{entry.changes.length} change{entry.changes.length === 1 ? '' : 's'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {entry.changes.map((change, i) => (
            <li key={i} className="text-sm text-foreground/90 flex items-start gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              <span className="leading-relaxed">{change}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 pt-3 border-t text-[11px] text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Released {fmtRelative(entry.date)}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// VersionComparisonCard — two side-by-side dropdowns + diff view.
// ---------------------------------------------------------------------------

function VersionComparisonCard({
  entries,
  compareA,
  compareB,
  onChangeA,
  onChangeB,
  added,
  removed,
  entryA,
  entryB,
}: {
  entries: VersionEntry[]
  compareA: string
  compareB: string
  onChangeA: (v: string) => void
  onChangeB: (v: string) => void
  added: string[]
  removed: string[]
  entryA?: VersionEntry
  entryB?: VersionEntry
}) {
  const noDiff =
    added.length === 0 &&
    removed.length === 0 &&
    entryA?.version === entryB?.version

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <GitBranch className="h-4 w-4 text-primary" /> Version Comparison
        </CardTitle>
        <CardDescription>
          Pick two versions to see what changed between them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Version A (older)</Label>
            <Select value={compareA} onValueChange={onChangeA}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pick version A…" />
              </SelectTrigger>
              <SelectContent>
                {entries.map((e) => (
                  <SelectItem key={e.version} value={e.version}>
                    v{e.version} — {e.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Version B (newer)</Label>
            <Select value={compareB} onValueChange={onChangeB}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pick version B…" />
              </SelectTrigger>
              <SelectContent>
                {entries.map((e) => (
                  <SelectItem key={e.version} value={e.version}>
                    v{e.version} — {e.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {noDiff ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Pick two different versions to see what changed.
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {/* Added in B */}
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/15 p-3">
              <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Added in v{entryB?.version || 'B'}
                <Badge variant="outline" className="ml-auto text-[9px] border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
                  {added.length}
                </Badge>
              </div>
              {added.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No new changes.</p>
              ) : (
                <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-track]:bg-transparent">
                  {added.map((c, i) => (
                    <li key={i} className="text-xs flex items-start gap-1.5">
                      <CheckCircle2 className="h-3 w-3 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="leading-relaxed">{c}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Removed in B */}
            <div className="rounded-lg border border-rose-500/30 bg-rose-50 dark:bg-rose-950/15 p-3">
              <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
                <XCircle className="h-3.5 w-3.5" />
                Removed in v{entryB?.version || 'B'}
                <Badge variant="outline" className="ml-auto text-[9px] border-rose-500/40 text-rose-700 dark:text-rose-300">
                  {removed.length}
                </Badge>
              </div>
              {removed.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Nothing removed.</p>
              ) : (
                <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-track]:bg-transparent">
                  {removed.map((c, i) => (
                    <li key={i} className="text-xs flex items-start gap-1.5">
                      <XCircle className="h-3 w-3 mt-0.5 text-rose-600 dark:text-rose-400 shrink-0" />
                      <span className="leading-relaxed line-through decoration-rose-400/60">{c}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// ChangeLockCard — switch + reason textarea + duration select + history.
// ---------------------------------------------------------------------------

function ChangeLockCard({
  lock,
  canToggle,
  toggling,
  lockReasonInput,
  lockDurationInput,
  onReasonChange,
  onDurationChange,
  onToggle,
  onOpenDialog,
}: {
  lock: ChangeLockState
  canToggle: boolean
  toggling: boolean
  lockReasonInput: string
  lockDurationInput: LockDuration
  onReasonChange: (v: string) => void
  onDurationChange: (v: LockDuration) => void
  onToggle: (next: boolean) => void
  onOpenDialog: () => void
}) {
  const isLocked = lock.active
  const showHistory = Boolean(lock.lockedByName || lock.lockedAt)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4 text-primary" /> Change Lock
        </CardTitle>
        <CardDescription>
          Temporarily block admins from editing hostel structure, sessions, or payment settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Switch row */}
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn(
              'grid place-items-center h-9 w-9 rounded-lg shrink-0',
              isLocked
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            )}>
              {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold flex items-center gap-2">
                {isLocked ? 'Change lock is ON' : 'No active lock'}
                {toggling && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              </div>
              <div className="text-xs text-muted-foreground">
                {isLocked
                  ? 'Admins are blocked from making structural changes.'
                  : 'Admins can make changes freely.'}
              </div>
            </div>
          </div>
          <Switch
            checked={isLocked}
            disabled={!canToggle || toggling}
            onCheckedChange={(checked) => {
              if (checked) {
                // Open the dialog so the admin can enter a reason + duration
                // first, rather than locking with stale/empty values.
                onOpenDialog()
              } else {
                onToggle(false)
              }
            }}
            aria-label="Toggle change lock"
          />
        </div>

        {/* Active-lock config (only when locked) */}
        {isLocked ? (
          <div className="space-y-4">
            {/* Amber banner */}
            <div className="rounded-lg border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-semibold">Lock is active</div>
                <div>
                  While active, the following are read-only for non-super-admins: hostel
                  structure (blocks/rooms/beds), academic sessions, payment gateway settings,
                  and allocation overrides. Super admins can still make changes.
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="lock-reason-active" className="text-xs">Lock reason</Label>
                <Textarea
                  id="lock-reason-active"
                  value={lock.reason || ''}
                  readOnly
                  rows={3}
                  className="bg-muted/40 resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Lock duration</Label>
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                  {lock.duration ? DURATION_LABELS[lock.duration] : '—'}
                </div>
                {lock.expiresAt && (
                  <div className="text-[10px] text-muted-foreground">
                    Auto-releases at {fmtDateTime(lock.expiresAt)}
                  </div>
                )}
                {lock.duration === 'manual' && (
                  <div className="text-[10px] text-muted-foreground">
                    Stays active until a super admin disables it.
                  </div>
                )}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggle(false)}
              disabled={!canToggle || toggling}
            >
              {toggling ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Unlock className="h-4 w-4 mr-2" />
              )}
              Release lock
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/15 px-3 py-2.5 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>No active lock — admins can make changes.</span>
          </div>
        )}

        {/* History (last lock) — only shown when we have a record */}
        {showHistory && (
          <div className="rounded-lg border bg-muted/30 px-3 py-2.5 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <History className="h-3 w-3" />
              <span className="font-semibold uppercase tracking-wider text-[10px]">Last lock</span>
            </div>
            <div className="text-foreground/80">
              {lock.lockedByName && (
                <span>By <span className="font-medium">{lock.lockedByName}</span></span>
              )}
              {lock.lockedAt && (
                <span className="text-muted-foreground"> · {fmtDateTime(lock.lockedAt)}</span>
              )}
              {!isLocked && lock.reason && (
                <span className="text-muted-foreground"> · &ldquo;{lock.reason}&rdquo;</span>
              )}
            </div>
          </div>
        )}

        {/* Disabled hint */}
        {!canToggle && (
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Lock className="h-3 w-3" />
            Only super admins can toggle the change-lock.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
