'use client'

import * as React from 'react'
import useSWR from 'swr'
import {
  Activity,
  RefreshCw,
  Database as DatabaseIcon,
  Users,
  Building2,
  BedDouble,
  CircleDollarSign,
  Ticket,
  Megaphone,
  LifeBuoy,
  Wrench,
  Server,
  Mail,
  Bot,
  CreditCard,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  ArrowRight,
  ArrowDown,
  ShieldCheck,
  TrendingUp,
  FileText,
  CircleDot,
  Eye,
  Lock,
  KeyRound,
  ShieldAlert,
  UserCheck,
  History,
  type LucideIcon,
} from 'lucide-react'
import { PageHeader, LoadingState } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, fmtMoney, fmtRelative, fmtDateTime } from '@/lib/utils'

import { useRolePermissions } from '@/lib/use-role-permissions'
import { getCurrentVersion, getCurrentVersionEntry } from '@/lib/versioning'

// ---------------------------------------------------------------------------
// Types (mirror the API response)
// ---------------------------------------------------------------------------
type HealthStatus = 'ok' | 'warning' | 'error' | 'info'

interface HealthCheck {
  key: string
  label: string
  status: HealthStatus
  message: string
  action?: { label: string; view: string }
}

interface SystemStatusData {
  generatedAt: string
  health: {
    overall: { pct: number; status: HealthStatus }
    checks: HealthCheck[]
  }
  dbStats: {
    users: {
      total: number
      byRole: Record<'SUPER_ADMIN' | 'ADMIN' | 'BURSARY' | 'MODERATOR' | 'STUDENT', number>
    }
    blocks: number
    rooms: number
    beds: {
      total: number
      occupied: number
      available: number
      maintenance: number
      locked: number
      occupancyRate: number
    }
    allocations: {
      total: number
      active: number
      provisional: number
      checkedIn: number
      vacated: number
    }
    payments: {
      total: number
      success: number
      pending: number
      failed: number
      refunded: number
      totalRevenue: number
    }
    bursaryCodes: {
      total: number
      active: number
      used: number
      revoked: number
      expired: number
    }
    announcements: number
    supportTickets: { total: number; open: number }
    maintenanceTickets: { total: number; open: number }
  }
  pipelines: {
    allocations: {
      applied: number
      approved: number
      allocated: number
      paid: number
      checkedIn: number
      conversionRates: {
        appliedToApproved: number
        approvedToAllocated: number
        allocatedToPaid: number
        paidToCheckedIn: number
      }
    }
    verifications: { pending: number; approved: number; rejected: number }
    payments: {
      initiated: number
      success: number
      failed: number
      pending: number
      refunded: number
      successRate: number
    }
    revenue: { total: number; thisMonth: number; average: number }
  }
  services: {
    database: { status: 'ok' | 'error'; message: string }
    smtp: { status: 'ok' | 'warning' | 'error'; message: string; host?: string }
    ai: {
      provider: string
      effectiveProvider: string
      deepseekConfigured: boolean
      agentEnabled: boolean
    }
    paymentGateways: Array<{
      provider: string
      displayName: string
      isEnabled: boolean
      isSandbox: boolean
      hasCredentials: boolean
    }>
    fileUpload: { status: 'ok' | 'error'; message: string }
  }
  recentActivity: {
    auditLogs: Array<{
      id: string
      action: string
      entityType: string
      entityId: string | null
      ipAddress: string | null
      createdAt: string
      actor: { id: string; name: string | null; email: string; role: string } | null
    }>
    errors: Array<{
      id: string
      type: 'email' | 'payment' | 'audit'
      title: string
      detail: string
      createdAt: string
    }>
  }
}

// ---------------------------------------------------------------------------
// Helpers — color/icon maps shared across sections
// ---------------------------------------------------------------------------
const STATUS_COLORS: Record<HealthStatus, { text: string; bg: string; border: string; ring: string; hex: string }> = {
  ok: {
    text: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    ring: 'text-emerald-500',
    hex: '#10b981',
  },
  warning: {
    text: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    ring: 'text-amber-500',
    hex: '#f59e0b',
  },
  error: {
    text: 'text-red-700 dark:text-red-300',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    ring: 'text-red-500',
    hex: '#ef4444',
  },
  info: {
    text: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    ring: 'text-blue-500',
    hex: '#3b82f6',
  },
}

const STATUS_ICON: Record<HealthStatus, LucideIcon> = {
  ok: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
}

const fetcher = async (url: string) => {
  const r = await fetch(url)
  if (!r.ok) {
    throw new Error(`Failed to load system status (${r.status})`)
  }
  return r.json() as Promise<SystemStatusData>
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function SystemStatus() {
  
  const { data, isLoading, error, mutate } = useSWR<SystemStatusData>(
    '/api/system-status',
    fetcher,
    { refreshInterval: 60_000 }
  )

  const { isViewOnly } = useRolePermissions()
  const viewOnly = isViewOnly('canManageSettings', 'canViewSystemHealth')

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Status & Health"
        description="Comprehensive monitoring of database, services, pipelines and recent activity."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => mutate()}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Button size="sm" onClick={() => window.location.href = '/overview'}>
              <Activity className="h-4 w-4 mr-2" /> Back to dashboard
            </Button>
          </>
        }
      />

      {viewOnly && (
        <div className="rounded-md border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
          <Eye className="h-3.5 w-3.5 shrink-0" />
          <span>You have view-only access. This dashboard is read-only by nature — no edit actions to disable.</span>
        </div>
      )}

      {isLoading && !data && <LoadingState label="Loading system status…" />}

      {error && !data && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive mb-3">Couldn&apos;t load system status.</p>
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            Retry
          </Button>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <SectionAHealth health={data.health} onNavigate={(v) => { if (v) window.location.href = '/' + String(v).replace('admin:', '') }} />
          <SectionBDbStats stats={data.dbStats} />
          <SectionCPipelines pipelines={data.pipelines} />
          <SectionDServices services={data.services} />
          <SectionERecentActivity recentActivity={data.recentActivity} />

          <div className="text-xs text-muted-foreground text-center pt-2">
            Last updated {fmtDateTime(data.generatedAt)} · Auto-refreshes every 60s
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section A — System Health Overview
// ---------------------------------------------------------------------------
function SectionAHealth({
  health,
  onNavigate,
}: {
  health: SystemStatusData['health']
  onNavigate: (view: string) => void
}) {
  const { pct, status } = health.overall
  const color = STATUS_COLORS[status]

  // Large ring geometry
  const size = 160
  const stroke = 12
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference

  return (
    <Card className={cn('overflow-hidden border-l-4', color.border)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Activity className={cn('h-4 w-4', color.ring)} />
          <div>
            <CardTitle className="text-base">System Health Overview</CardTitle>
            <CardDescription className="text-xs">
              Live configuration, registration, and operations checks across the platform.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row items-start gap-6">
          {/* Large SVG ring */}
          <div className="flex flex-col items-center gap-3 mx-auto lg:mx-0 shrink-0">
            <div className="relative" style={{ width: size, height: size }}>
              <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={stroke}
                  className="text-muted/40"
                />
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={color.hex}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  className="transition-[stroke-dashoffset] duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <div className={cn('text-4xl font-bold leading-none', color.text)}>
                    {pct}%
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-1.5">
                    Overall Health
                  </div>
                </div>
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn('text-xs font-semibold capitalize', color.bg, color.text, color.border)}
            >
              {status === 'ok' && 'All systems go'}
              {status === 'warning' && 'Needs attention'}
              {status === 'error' && 'Action required'}
              {status === 'info' && 'Informational'}
            </Badge>
          </div>

          {/* 6 health checks — 3-column grid */}
          <div className="flex-1 min-w-0 w-full grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {health.checks.map((c) => {
              const cfg = STATUS_COLORS[c.status]
              const Icon = STATUS_ICON[c.status]
              return (
                <div
                  key={c.key}
                  className={cn(
                    'rounded-lg border p-3 flex items-start gap-2.5 transition-colors',
                    cfg.border,
                    cfg.bg
                  )}
                >
                  <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', cfg.text)} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold leading-tight">{c.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{c.message}</div>
                    {c.action && (
                      <button
                        onClick={() => onNavigate(c.action!.view)}
                        className={cn(
                          'text-xs font-semibold mt-1.5 inline-flex items-center gap-1 hover:underline',
                          cfg.text
                        )}
                      >
                        {c.action.label}
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Section B — Database Statistics
// ---------------------------------------------------------------------------
interface StatBoxProps {
  label: string
  value: React.ReactNode
  icon: LucideIcon
  accent?: 'primary' | 'amber' | 'blue' | 'purple' | 'emerald' | 'rose'
  rows?: Array<{ label: string; value: React.ReactNode; tone?: 'ok' | 'warn' | 'err' | 'info' }>
}

const STAT_ACCENTS: Record<NonNullable<StatBoxProps['accent']>, string> = {
  primary: 'bg-primary/10 text-primary',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
}

const TONE_TEXT: Record<'ok' | 'warn' | 'err' | 'info', string> = {
  ok: 'text-emerald-600 dark:text-emerald-400',
  warn: 'text-amber-600 dark:text-amber-400',
  err: 'text-red-600 dark:text-red-400',
  info: 'text-muted-foreground',
}

function StatBox({ label, value, icon: Icon, accent = 'primary', rows }: StatBoxProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardDescription className="text-[10px] uppercase tracking-wider">
              {label}
            </CardDescription>
            <CardTitle className="text-2xl mt-1">{value}</CardTitle>
          </div>
          <div className={cn('h-9 w-9 rounded-lg grid place-items-center', STAT_ACCENTS[accent])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
      {rows && rows.length > 0 && (
        <CardContent className="pt-0">
          <div className="space-y-1 text-xs">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-muted-foreground">{r.label}</span>
                <span className={cn('font-semibold', r.tone ? TONE_TEXT[r.tone] : '')}>
                  {r.value}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

function SectionBDbStats({ stats }: { stats: SystemStatusData['dbStats'] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <DatabaseIcon className="h-4 w-4 text-primary" />
        <h2 className="text-base font-semibold">Database Statistics</h2>
      </div>
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <StatBox
          label="Total Users"
          value={stats.users.total}
          icon={Users}
          accent="primary"
          rows={[
            { label: 'Super Admin', value: stats.users.byRole.SUPER_ADMIN, tone: 'info' },
            { label: 'Admin', value: stats.users.byRole.ADMIN, tone: 'info' },
            { label: 'Bursary', value: stats.users.byRole.BURSARY, tone: 'info' },
            { label: 'Moderator', value: stats.users.byRole.MODERATOR, tone: 'info' },
            { label: 'Student', value: stats.users.byRole.STUDENT, tone: 'info' },
          ]}
        />
        <StatBox
          label="Hostel Inventory"
          value={`${stats.blocks}/${stats.rooms}/${stats.beds.total}`}
          icon={Building2}
          accent="blue"
          rows={[
            { label: 'Blocks', value: stats.blocks, tone: 'info' },
            { label: 'Rooms', value: stats.rooms, tone: 'info' },
            { label: 'Beds', value: stats.beds.total, tone: 'info' },
            {
              label: 'Occupancy',
              value: `${stats.beds.occupancyRate}%`,
              tone: stats.beds.occupancyRate > 80 ? 'warn' : 'ok',
            },
          ]}
        />
        <StatBox
          label="Bed Status"
          value={stats.beds.total}
          icon={BedDouble}
          accent="purple"
          rows={[
            { label: 'Available', value: stats.beds.available, tone: 'ok' },
            { label: 'Occupied', value: stats.beds.occupied, tone: 'info' },
            { label: 'Maintenance', value: stats.beds.maintenance, tone: 'warn' },
            { label: 'Locked', value: stats.beds.locked, tone: 'err' },
          ]}
        />
        <StatBox
          label="Allocations"
          value={stats.allocations.total}
          icon={CircleDot}
          accent="emerald"
          rows={[
            { label: 'Active', value: stats.allocations.active, tone: 'ok' },
            { label: 'Provisional', value: stats.allocations.provisional, tone: 'info' },
            { label: 'Checked In', value: stats.allocations.checkedIn, tone: 'ok' },
            { label: 'Vacated', value: stats.allocations.vacated, tone: 'info' },
          ]}
        />
        <StatBox
          label="Payments"
          value={stats.payments.total}
          icon={CircleDollarSign}
          accent="amber"
          rows={[
            { label: 'Success', value: stats.payments.success, tone: 'ok' },
            { label: 'Pending', value: stats.payments.pending, tone: 'warn' },
            { label: 'Failed', value: stats.payments.failed, tone: 'err' },
            {
              label: 'Revenue',
              value: fmtMoney(stats.payments.totalRevenue),
              tone: 'ok',
            },
          ]}
        />
        <StatBox
          label="Bursary Codes"
          value={stats.bursaryCodes.total}
          icon={Ticket}
          accent="rose"
          rows={[
            { label: 'Active', value: stats.bursaryCodes.active, tone: 'ok' },
            { label: 'Used', value: stats.bursaryCodes.used, tone: 'info' },
            { label: 'Revoked', value: stats.bursaryCodes.revoked, tone: 'err' },
            { label: 'Expired', value: stats.bursaryCodes.expired, tone: 'warn' },
          ]}
        />
      </div>

      {/* Secondary row: announcements / support / maintenance */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
        <StatBox
          label="Announcements"
          value={stats.announcements}
          icon={Megaphone}
          accent="blue"
        />
        <StatBox
          label="Support Tickets"
          value={stats.supportTickets.total}
          icon={LifeBuoy}
          accent="amber"
          rows={[
            { label: 'Open', value: stats.supportTickets.open, tone: 'warn' },
            { label: 'Total', value: stats.supportTickets.total, tone: 'info' },
          ]}
        />
        <StatBox
          label="Maintenance Tickets"
          value={stats.maintenanceTickets.total}
          icon={Wrench}
          accent="rose"
          rows={[
            { label: 'Open', value: stats.maintenanceTickets.open, tone: 'warn' },
            { label: 'Total', value: stats.maintenanceTickets.total, tone: 'info' },
          ]}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section C — Pipeline Performance
// ---------------------------------------------------------------------------
interface FunnelStep {
  label: string
  value: number
  icon: LucideIcon
}

function FunnelPipeline({
  title,
  description,
  steps,
  conversionRates,
}: {
  title: string
  description: string
  steps: FunnelStep[]
  conversionRates?: Array<{ label: string; pct: number }>
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="space-y-1.5">
          {steps.map((s, i) => {
            const max = steps[0].value || 1
            const width = Math.max(8, Math.round((s.value / max) * 100))
            return (
              <div key={s.label} className="space-y-0.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <s.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{s.label}</span>
                  </div>
                  <span className="font-bold tabular-nums">{s.value.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
                  <div
                    className="h-full bg-primary/70 rounded-full transition-all duration-700"
                    style={{ width: `${width}%` }}
                  />
                </div>
                {i < steps.length - 1 && (
                  <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground/70">
                    {conversionRates && conversionRates[i] && (
                      <span>
                        → {conversionRates[i].pct}% conversion
                      </span>
                    )}
                    <ArrowDown className="h-3 w-3" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function SectionCPipelines({ pipelines }: { pipelines: SystemStatusData['pipelines'] }) {
  const a = pipelines.allocations
  const c = a.conversionRates

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h2 className="text-base font-semibold">Pipeline Performance</h2>
      </div>
      <div className="grid gap-3 grid-cols-1 lg:grid-cols-2 xl:grid-cols-4">
        <FunnelPipeline
          title="Allocations Pipeline"
          description="Applied → Approved → Allocated → Paid → Checked In"
          steps={[
            { label: 'Applied', value: a.applied, icon: FileText },
            { label: 'Approved', value: a.approved, icon: CheckCircle2 },
            { label: 'Allocated', value: a.allocated, icon: CircleDot },
            { label: 'Paid', value: a.paid, icon: CircleDollarSign },
            { label: 'Checked In', value: a.checkedIn, icon: BedDouble },
          ]}
          conversionRates={[
            { label: 'applied→approved', pct: c.appliedToApproved },
            { label: 'approved→allocated', pct: c.approvedToAllocated },
            { label: 'allocated→paid', pct: c.allocatedToPaid },
            { label: 'paid→checked-in', pct: c.paidToCheckedIn },
          ]}
        />
        <FunnelPipeline
          title="Verification Pipeline"
          description="Pending → Approved / Rejected"
          steps={[
            { label: 'Pending', value: pipelines.verifications.pending, icon: AlertTriangle },
            { label: 'Approved', value: pipelines.verifications.approved, icon: CheckCircle2 },
            { label: 'Rejected', value: pipelines.verifications.rejected, icon: XCircle },
          ]}
        />
        <FunnelPipeline
          title="Payment Pipeline"
          description={`Initiated → Success/Failed (success rate ${pipelines.payments.successRate}%)`}
          steps={[
            { label: 'Initiated', value: pipelines.payments.initiated, icon: CreditCard },
            { label: 'Success', value: pipelines.payments.success, icon: CheckCircle2 },
            { label: 'Pending', value: pipelines.payments.pending, icon: Info },
            { label: 'Failed', value: pipelines.payments.failed, icon: XCircle },
            { label: 'Refunded', value: pipelines.payments.refunded, icon: ArrowRight },
          ]}
        />
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Revenue Metrics</CardTitle>
            <CardDescription className="text-xs">
              Lifetime + this month + average ticket
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <RevenueRow
              label="Total Revenue"
              value={fmtMoney(pipelines.revenue.total)}
              hint="All successful payments"
              accent="text-emerald-600 dark:text-emerald-400"
            />
            <RevenueRow
              label="This Month"
              value={fmtMoney(pipelines.revenue.thisMonth)}
              hint="Since 1st of this month"
              accent="text-primary"
            />
            <RevenueRow
              label="Average Payment"
              value={fmtMoney(pipelines.revenue.average)}
              hint="Per successful payment"
              accent="text-muted-foreground"
            />
            <div className="pt-2 border-t">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Success Rate
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-2 rounded-full bg-muted/60 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: `${pipelines.payments.successRate}%` }}
                  />
                </div>
                <span className="text-sm font-bold tabular-nums">
                  {pipelines.payments.successRate}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function RevenueRow({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: string
  hint: string
  accent: string
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-[10px] text-muted-foreground/70">{hint}</div>
      </div>
      <div className={cn('text-lg font-bold tabular-nums', accent)}>{value}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section D — API / Service Status
// ---------------------------------------------------------------------------
function ServiceRow({
  icon: Icon,
  name,
  status,
  message,
}: {
  icon: LucideIcon
  name: string
  status: 'ok' | 'warning' | 'error'
  message: string
}) {
  const color = STATUS_COLORS[status]
  const StatusIcon = STATUS_ICON[status]
  return (
    <div className={cn('flex items-start gap-3 rounded-lg border p-3', color.border, color.bg)}>
      <div className={cn('h-9 w-9 rounded-md grid place-items-center shrink-0', color.bg, color.text)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold">{name}</div>
          <StatusIcon className={cn('h-3.5 w-3.5', color.text)} />
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">{message}</div>
      </div>
    </div>
  )
}

function SectionDServices({ services }: { services: SystemStatusData['services'] }) {
  const aiProviderLabel = services.ai.effectiveProvider === 'deepseek'
    ? 'DeepSeek'
    : 'Built-in LLM'

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Server className="h-4 w-4 text-primary" />
        <h2 className="text-base font-semibold">API / Service Status</h2>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Core Services</CardTitle>
            <CardDescription className="text-xs">
              Infrastructure backing the platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <ServiceRow
              icon={DatabaseIcon}
              name="Database Connection"
              status={services.database.status}
              message={services.database.message}
            />
            <ServiceRow
              icon={Mail}
              name="Email (SMTP)"
              status={services.smtp.status}
              message={services.smtp.message}
            />
            <ServiceRow
              icon={Bot}
              name={`AI Provider — ${aiProviderLabel}`}
              status={services.ai.agentEnabled ? 'ok' : 'warning'}
              message={
                services.ai.provider === 'deepseek' && !services.ai.deepseekConfigured
                  ? 'DeepSeek selected but API key missing — falling back to built-in LLM.'
                  : services.ai.agentEnabled
                    ? `Agent enabled · effective provider: ${aiProviderLabel}`
                    : 'AI agent is currently disabled in settings.'
              }
            />
            <ServiceRow
              icon={Upload}
              name="File Upload"
              status={services.fileUpload.status}
              message={services.fileUpload.message}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Payment Gateways</CardTitle>
            <CardDescription className="text-xs">
              Provider configuration status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {services.paymentGateways.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">
                No payment gateways configured.
              </div>
            ) : (
              <div className="space-y-2">
                {services.paymentGateways.map((g) => {
                  const status: 'ok' | 'warning' | 'error' = g.isEnabled
                    ? g.hasCredentials
                      ? 'ok'
                      : 'warning'
                    : 'info' as 'warning'
                  const cfg = STATUS_COLORS[status as HealthStatus]
                  const Icon = g.isEnabled ? CheckCircle2 : Info
                  return (
                    <div
                      key={g.provider}
                      className={cn(
                        'flex items-center justify-between rounded-lg border p-2.5',
                        cfg.border,
                        cfg.bg
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={cn('h-4 w-4 shrink-0', cfg.text)} />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">
                            {g.displayName || g.provider}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {g.provider}
                            {g.isSandbox && ' · sandbox'}
                            {!g.hasCredentials && ' · no credentials'}
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] font-semibold',
                          g.isEnabled
                            ? 'border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10'
                            : 'border-muted-foreground/20 text-muted-foreground'
                        )}
                      >
                        {g.isEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section E — Recent Activity Summary
// ---------------------------------------------------------------------------
const ERROR_TYPE_META: Record<SystemStatusData['recentActivity']['errors'][number]['type'], { icon: LucideIcon; label: string }> = {
  email: { icon: Mail, label: 'Email' },
  payment: { icon: CircleDollarSign, label: 'Payment' },
  audit: { icon: ShieldCheck, label: 'Security' },
}

function SectionERecentActivity({
  recentActivity,
}: {
  recentActivity: SystemStatusData['recentActivity']
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <h2 className="text-base font-semibold">Recent Activity Summary</h2>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Last 10 audit logs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> System-wide Audit Log
            </CardTitle>
            <CardDescription className="text-xs">Last 10 entries across all users.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
            {recentActivity.auditLogs.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                No activity recorded yet.
              </div>
            ) : (
              recentActivity.auditLogs.map((log) => (
                <div key={log.id} className="flex gap-2.5 p-2 rounded-md hover:bg-accent/50">
                  <div className="h-7 w-7 rounded-full bg-primary/10 text-primary grid place-items-center shrink-0">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs">
                      <span className="font-semibold">
                        {log.actor?.name || 'System'}
                      </span>
                      <span className="text-muted-foreground"> · {log.action}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground/70">
                      {log.entityType}
                      {log.entityId ? ` · ${log.entityId.slice(-6)}` : ''}
                      {log.ipAddress ? ` · ${log.ipAddress}` : ''} · {fmtRelative(log.createdAt)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Last 5 errors / failed actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Recent Errors & Failures
            </CardTitle>
            <CardDescription className="text-xs">Last 5 failed emails, payments, security events.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
            {recentActivity.errors.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8 flex flex-col items-center gap-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                No recent errors — all good!
              </div>
            ) : (
              recentActivity.errors.map((err) => {
                const meta = ERROR_TYPE_META[err.type]
                const Icon = meta.icon
                return (
                  <div
                    key={`${err.type}-${err.id}`}
                    className="flex gap-2.5 p-2 rounded-md border border-red-500/20 bg-red-500/5"
                  >
                    <div className="h-7 w-7 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 grid place-items-center shrink-0">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate">{err.title}</div>
                      <div className="text-[11px] text-muted-foreground line-clamp-2">
                        {err.detail}
                      </div>
                      <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                        {meta.label} · {fmtRelative(err.createdAt)}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Security Dashboard ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" /> Security Dashboard
          </CardTitle>
          <CardDescription>
            Active security measures protecting the system. All measures are enforced server-side.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SecurityTile
              icon={Lock}
              title="Password Hashing"
              status="Argon2id"
              detail="Memory-hard, GPU-resistant (19MB RAM/hash). Auto-upgrades legacy PBKDF2 on login."
              tone="success"
            />
            <SecurityTile
              icon={KeyRound}
              title="Session Management"
              status="Signed JWT"
              detail="sessionVersion revocation + concurrent session limits"
              tone="success"
            />
            <SecurityTile
              icon={ShieldCheck}
              title="2FA (TOTP)"
              status="Optional"
              detail="Available for staff — NOT enforced. Uses otplib verifySync."
              tone="info"
            />
            <SecurityTile
              icon={ShieldAlert}
              title="Webhook Signatures"
              status="Always Verified"
              detail="HMAC-SHA512 for Paystack/Kora. Hash compare for Flutterwave/OPay/Remita/Zainpay. No sandbox bypass."
              tone="success"
            />
            <SecurityTile
              icon={Activity}
              title="Rate Limiting"
              status="Active"
              detail="Login: 10/min · Payment: 5/min · Password change: 5/hr per IP"
              tone="success"
            />
            <SecurityTile
              icon={Lock}
              title="Security Headers"
              status="6 headers"
              detail="X-Frame-Options: DENY · HSTS · nosniff · XSS Protection · Referrer-Policy · Permissions-Policy"
              tone="success"
            />
            <SecurityTile
              icon={UserCheck}
              title="Super Admin Protection"
              status="Enforced"
              detail="Only SUPER_ADMIN can edit SUPER_ADMIN. API returns 403 for non-super-admins."
              tone="success"
            />
            <SecurityTile
              icon={ShieldCheck}
              title="RBAC Gating"
              status="27/35 components"
              detail="313 permission guards. View-only banners + disabled inputs on all gated pages."
              tone="success"
            />
            <SecurityTile
              icon={Eye}
              title="Audit Logging"
              status="All actions"
              detail="Every create/update/delete is logged with actor, IP, user-agent, and metadata."
              tone="success"
            />
          </div>
        </CardContent>
      </Card>

      {/* Version History → moved to its own standalone page (admin:versions).
          This card is now a compact cross-link instead of a duplicate changelog. */}
      <Card className="border-dashed">
        <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center shrink-0">
              <History className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm font-semibold">Versioning & Change Lock</div>
              <div className="text-xs text-muted-foreground">
                Current: <span className="font-mono font-bold text-primary">v{getCurrentVersion()}</span>
                {' — '}{getCurrentVersionEntry().title}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/versioning'}
          >
            <History className="h-3.5 w-3.5 mr-1.5" /> Open Versioning
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton (used by the SWR isLoading path while the first fetch runs)
// ---------------------------------------------------------------------------
export function SystemStatusSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-48 w-full" />
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SecurityTile — small card showing a security measure + status
// ---------------------------------------------------------------------------
function SecurityTile({
  icon: Icon,
  title,
  status,
  detail,
  tone = 'success',
}: {
  icon: LucideIcon
  title: string
  status: string
  detail: string
  tone?: 'success' | 'info' | 'warning'
}) {
  const toneClasses = {
    success: 'border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20',
    info: 'border-blue-500/30 bg-blue-50 dark:bg-blue-950/20',
    warning: 'border-amber-500/30 bg-amber-50 dark:bg-amber-950/20',
  }
  const iconClasses = {
    success: 'text-emerald-600 dark:text-emerald-400',
    info: 'text-blue-600 dark:text-blue-400',
    warning: 'text-amber-600 dark:text-amber-400',
  }
  const badgeClasses = {
    success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    info: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
    warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  }
  return (
    <div className={`rounded-lg border p-3 ${toneClasses[tone]}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={`h-4 w-4 ${iconClasses[tone]} shrink-0`} />
        <span className="text-xs font-bold">{title}</span>
      </div>
      <Badge variant="outline" className={`text-[9px] mb-1 ${badgeClasses[tone]}`}>
        {status}
      </Badge>
      <p className="text-[10px] text-muted-foreground leading-snug">{detail}</p>
    </div>
  )
}
