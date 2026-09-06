'use client'

import * as React from 'react'
import useSWR from 'swr'
import { swrHeavy } from '@/lib/swr-config'
import { toast } from 'sonner'
import {
  BarChart3,
  Building2,
  Users,
  CircleDollarSign,
  Download,
  FileSpreadsheet,
  TrendingUp,
  Loader2,
  RefreshCw,
  Activity,
  Bot,
  Clock,
  AlertCircle,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip,
  Area,
  AreaChart,
} from 'recharts'
import { PageHeader, StatCard, LoadingState } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { fmtMoney, fmtDate } from '@/lib/utils'

const fetcher = async (url: string) => {
  const r = await fetch(url)
  if (!r.ok) {
    const body = await r.json().catch(() => ({}))
    throw new Error(body?.error || `Request failed: ${r.status}`)
  }
  return r.json()
}

interface SummaryData {
  generatedAt: string
  blocks: { total: number }
  rooms: { total: number }
  beds: { total: number; occupied: number; available: number; maintenance: number; occupancyRate: number }
  students: { total: number; verified: number; pendingVerification: number }
  applications: { total: number; pending: number }
  allocations: { total: number; active: number; checkedIn: number }
  payments: { total: number; success: number; pending: number; revenue: number }
}

export function ReportsCenter() {
  const { data, isLoading, error, mutate } = useSWR<SummaryData>('/api/reports?type=summary', fetcher, { ...swrHeavy, refreshInterval: 60_000 })
  const [exporting, setExporting] = React.useState<string | null>(null)

  async function downloadReport(type: string, filename: string) {
    setExporting(type)
    try {
      const res = await fetch(`/api/reports?type=${type}&format=csv`)
      if (!res.ok) {
        toast.error('Export failed')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`${filename} downloaded`)
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(null)
    }
  }

  const reports = [
    {
      id: 'summary',
      title: 'Summary Report',
      description: 'Key metrics overview: blocks, beds, students, applications, allocations, payments, revenue.',
      icon: BarChart3,
      color: 'bg-primary/10 text-primary',
      filename: `summary-report-${new Date().toISOString().slice(0, 10)}.csv`,
    },
    {
      id: 'blocks',
      title: 'Block Occupancy Report',
      description: 'Every bed across all blocks with status, occupant name, and reg number.',
      icon: Building2,
      color: 'bg-blue-500/10 text-blue-500',
      filename: `block-occupancy-${new Date().toISOString().slice(0, 10)}.csv`,
    },
    {
      id: 'students',
      title: 'Students Report',
      description: 'All students with profile, verification, allocation, and login activity details.',
      icon: Users,
      color: 'bg-purple-500/10 text-purple-500',
      filename: `students-report-${new Date().toISOString().slice(0, 10)}.csv`,
    },
    {
      id: 'payments',
      title: 'Payments Report',
      description: 'All payment records with user, amount, provider, status, and linked allocation.',
      icon: CircleDollarSign,
      color: 'bg-emerald-500/10 text-emerald-500',
      filename: `payments-report-${new Date().toISOString().slice(0, 10)}.csv`,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Export Center"
        description="Generate and download CSV reports for all your hostel data, plus advanced analytics dashboards."
        actions={
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        }
      />

      <Tabs defaultValue="reports" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:w-[420px]">
          <TabsTrigger value="reports" className="text-xs sm:text-sm">
            <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Reports & Export
          </TabsTrigger>
          <TabsTrigger value="advanced" className="text-xs sm:text-sm">
            <BarChart3 className="h-4 w-4 mr-1.5" /> Advanced Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-6 space-y-6">
          <ReportsAndExportTab
            data={data}
            isLoading={isLoading}
            error={error}
            mutate={mutate}
            exporting={exporting}
            downloadReport={downloadReport}
            reports={reports}
          />
        </TabsContent>

        <TabsContent value="advanced" className="mt-6">
          <AdvancedAnalyticsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 1 — Reports & Export (the original content, refactored into a child)
// ---------------------------------------------------------------------------

function ReportsAndExportTab({
  data,
  isLoading,
  error,
  mutate,
  exporting,
  downloadReport,
  reports,
}: {
  data: SummaryData | undefined
  isLoading: boolean
  error: Error | undefined
  mutate: () => void
  exporting: string | null
  downloadReport: (type: string, filename: string) => Promise<void>
  reports: Array<{
    id: string
    title: string
    description: string
    icon: React.ElementType
    color: string
    filename: string
  }>
}) {
  // Error state — API returned 403/500 etc
  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-10 w-10 mx-auto mb-3 text-destructive" />
          <p className="font-semibold text-sm text-destructive mb-1">Failed to load reports</p>
          <p className="text-xs text-muted-foreground mb-4">{error.message}</p>
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            <RefreshCw className="h-4 w-4 mr-1.5" /> Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Summary stat cards */}
      {isLoading || !data ? (
        <LoadingState label="Loading summary…" />
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Occupancy Rate"
              value={`${data.beds.occupancyRate}%`}
              icon={TrendingUp}
              hint={`${data.beds.occupied}/${data.beds.total} beds occupied`}
              accent="primary"
            />
            <StatCard
              label="Total Revenue"
              value={fmtMoney(data.payments.revenue)}
              icon={CircleDollarSign}
              hint={`${data.payments.success} successful payments`}
              accent="primary"
            />
            <StatCard
              label="Active Allocations"
              value={data.allocations.active}
              icon={Building2}
              hint={`${data.allocations.checkedIn} checked in`}
              accent="blue"
            />
            <StatCard
              label="Verified Students"
              value={data.students.verified}
              icon={Users}
              hint={`${data.students.pendingVerification} pending verification`}
              accent="purple"
            />
          </div>

          {/* Summary detail card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Live Summary Metrics</CardTitle>
              <CardDescription className="text-xs">
                Generated {fmtDate(data.generatedAt)} · Auto-refreshes every 60s
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Infrastructure</div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Blocks</span><span className="font-semibold">{data.blocks.total}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Rooms</span><span className="font-semibold">{data.rooms.total}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Total Beds</span><span className="font-semibold">{data.beds.total}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Available</span><span className="font-semibold text-primary">{data.beds.available}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Maintenance</span><span className="font-semibold text-amber-500">{data.beds.maintenance}</span></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Students & Applications</div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Total Students</span><span className="font-semibold">{data.students.total}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Verified</span><span className="font-semibold text-primary">{data.students.verified}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Pending Verification</span><span className="font-semibold text-amber-500">{data.students.pendingVerification}</span></div>
                    <Separator className="my-1.5" />
                    <div className="flex justify-between"><span className="text-muted-foreground">Total Applications</span><span className="font-semibold">{data.applications.total}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Pending Applications</span><span className="font-semibold text-amber-500">{data.applications.pending}</span></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Allocations & Finance</div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Total Allocations</span><span className="font-semibold">{data.allocations.total}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Active</span><span className="font-semibold text-primary">{data.allocations.active}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Checked In</span><span className="font-semibold text-blue-500">{data.allocations.checkedIn}</span></div>
                    <Separator className="my-1.5" />
                    <div className="flex justify-between"><span className="text-muted-foreground">Total Payments</span><span className="font-semibold">{data.payments.total}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Revenue</span><span className="font-semibold text-primary">{fmtMoney(data.payments.revenue)}</span></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Export cards */}
      <div>
        <div className="text-sm font-semibold mb-3 flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-primary" /> Download Reports (CSV)
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {reports.map((r) => (
            <Card key={r.id} className="hover:shadow-md transition-shadow group">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 rounded-xl grid place-items-center shrink-0 ${r.color}`}>
                    <r.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-base">{r.title}</div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{r.description}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                      disabled={exporting === r.id}
                      onClick={() => downloadReport(r.id, r.filename)}
                    >
                      {exporting === r.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Download CSV
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Related exports */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Other Exports</CardTitle>
          <CardDescription className="text-xs">Audit logs and email logs can also be exported as CSV.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open('/api/audit-logs?format=csv', '_blank')}>
            <Download className="h-4 w-4 mr-2" /> Audit Logs CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open('/api/email-logs?format=csv', '_blank')}>
            <Download className="h-4 w-4 mr-2" /> Email Logs CSV
          </Button>
        </CardContent>
      </Card>
    </>
  )
}

// ---------------------------------------------------------------------------
// Tab 2 — Advanced Analytics (charts from /api/reports/advanced)
// ---------------------------------------------------------------------------

interface AdvancedReport {
  generatedAt: string
  revenue: {
    total: number
    byProvider: Array<{ provider: string; total: number; count: number }>
    byMonth: Array<{ month: string; total: number; count: number }>
  }
  occupancyByBlock: {
    byBlock: Array<{
      blockId: string
      blockName: string
      blockCode: string
      genderType: string
      total: number
      occupied: number
      available: number
      maintenance: number
      occupancyRate: number
    }>
    trend: Array<{ label: string; count: number }>
  }
  paymentMethods: {
    total: number
    methods: Array<{ provider: string; count: number; total: number; percent: number }>
  }
  supportChat: {
    total: number
    resolved: number
    aiResolutionRate: number
    escalated: number
    avgHandleTimeMin: number
    byCategory: Record<string, number>
  }
  applicationFunnel: {
    funnel: Array<{ stage: string; value: number; conversionFromPrev: number }>
  }
}

// Distinct colours per payment provider so the donut chart is readable.
const PROVIDER_COLORS: Record<string, string> = {
  PAYSTACK: '#16a34a',
  FLUTTERWAVE: '#f59e0b',
  OPAY: '#10b981',
  REMITA: '#8b5cf6',
  KORA: '#ec4899',
  ZAINPAY: '#06b6d4',
  MANUAL_TRANSFER: '#71717a',
}

function AdvancedAnalyticsTab() {
  const { data, isLoading, error, mutate } = useSWR<AdvancedReport>(
    '/api/reports/advanced',
    fetcher,
    { ...swrHeavy, refreshInterval: 120_000, revalidateOnFocus: false }
  )

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-destructive">
          Failed to load advanced analytics: {error.message}
        </CardContent>
      </Card>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top-level KPIs */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={fmtMoney(data.revenue.total)}
          icon={CircleDollarSign}
          hint="all successful payments"
          accent="primary"
        />
        <StatCard
          label="Avg Support Handle Time"
          value={`${data.supportChat.avgHandleTimeMin}m`}
          icon={Clock}
          hint={`${data.supportChat.resolved} resolved`}
          accent="amber"
        />
        <StatCard
          label="AI Resolution Rate"
          value={`${data.supportChat.aiResolutionRate}%`}
          icon={Bot}
          hint={`${data.supportChat.total} total sessions`}
          accent="purple"
        />
        <StatCard
          label="Payment Providers"
          value={data.paymentMethods.methods.length}
          icon={Activity}
          hint={`${data.paymentMethods.total} successful payments`}
          accent="blue"
        />
      </div>

      {/* Revenue by month */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Revenue — Last 12 Months</span>
            <Badge variant="outline" className="text-[10px]">
              {fmtMoney(data.revenue.total)} total
            </Badge>
          </CardTitle>
          <CardDescription className="text-xs">
            Monthly successful payment amounts (NGN).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.revenue.byMonth} margin={{ left: 4, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="fillAdvRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `₦${(Number(v) / 1000).toFixed(0)}k`} />
              <RechartsTooltip
                formatter={(v: any) => fmtMoney(Number(v))}
                contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', fontSize: 12 }}
              />
              <Area type="monotone" dataKey="total" stroke="#16a34a" strokeWidth={2} fill="url(#fillAdvRevenue)" name="Revenue" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Payment methods donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Payment Method Distribution</CardTitle>
            <CardDescription className="text-xs">
              Share of successful payments by provider.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.paymentMethods.methods.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
                No successful payments yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={data.paymentMethods.methods}
                    dataKey="count"
                    nameKey="provider"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {data.paymentMethods.methods.map((m) => (
                      <Cell key={m.provider} fill={PROVIDER_COLORS[m.provider] || '#3b82f6'} />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    height={28}
                    iconType="circle"
                    formatter={(value) => <span className="text-xs">{value}</span>}
                  />
                  <RechartsTooltip
                    formatter={(v: number | string, n: string) => [`${v} payments`, n]}
                    contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            {/* Provider breakdown table */}
            <div className="mt-2 space-y-1.5">
              {data.paymentMethods.methods.map((m) => (
                <div key={m.provider} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: PROVIDER_COLORS[m.provider] || '#3b82f6' }}
                    />
                    <span className="font-medium">{m.provider}</span>
                  </span>
                  <span className="text-muted-foreground">
                    {m.count} · {m.percent}% · {fmtMoney(m.total)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Application funnel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Application Funnel</CardTitle>
            <CardDescription className="text-xs">
              Applied → Approved → Paid → Allocated → Checked in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.applicationFunnel.funnel} layout="vertical" margin={{ left: 8, right: 16, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="stage" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={90} />
                <RechartsTooltip
                  formatter={(v: number | string) => [`${v} students`, 'Count']}
                  contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} minPointSize={4}>
                  {data.applicationFunnel.funnel.map((_, i) => (
                    <Cell key={i} fill={['#3b82f6', '#06b6d4', '#10b981', '#16a34a', '#15803d'][i] || '#16a34a'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2 space-y-1">
              {data.applicationFunnel.funnel.map((s, i) => (
                <div key={s.stage} className="flex items-center justify-between text-xs">
                  <span className="font-medium">{s.stage}</span>
                  <span className="text-muted-foreground">
                    {s.value} {i > 0 && `(${s.conversionFromPrev}%)`}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Occupancy by block + trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Block Occupancy — Current</CardTitle>
          <CardDescription className="text-xs">
            Beds per block by status (occupied / available / maintenance).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.occupancyByBlock.byBlock.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
              No blocks defined yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(220, data.occupancyByBlock.byBlock.length * 40)}>
              <BarChart data={data.occupancyByBlock.byBlock} layout="vertical" margin={{ left: 8, right: 16, top: 8 }} stackOffset="expand">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="blockName" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={90} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', fontSize: 12 }}
                />
                <Bar dataKey="occupied" stackId="a" fill="#ef4444" name="Occupied" minPointSize={2} />
                <Bar dataKey="available" stackId="a" fill="#10b981" name="Available" minPointSize={2} />
                <Bar dataKey="maintenance" stackId="a" fill="#71717a" name="Maintenance" radius={[0, 4, 4, 0]} minPointSize={2} />
                <Legend verticalAlign="bottom" height={28} iconType="circle" formatter={(value) => <span className="text-xs">{value}</span>} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Allocation trend + support chat summary */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Allocation Trend — Last 30 Days</CardTitle>
            <CardDescription className="text-xs">
              New allocations per ~5-day window.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.occupancyByBlock.trend} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                <RechartsTooltip
                  formatter={(v: number | string) => [`${v} allocations`, 'Count']}
                  contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', fontSize: 12 }}
                />
                <Bar dataKey="count" fill="#16a34a" radius={[4, 4, 0, 0]} minPointSize={2} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Support Chat Analytics</CardTitle>
            <CardDescription className="text-xs">
              All-time support chat session metrics.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Sessions</div>
                <div className="text-2xl font-bold mt-1">{data.supportChat.total}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Resolved by AI</div>
                <div className="text-2xl font-bold mt-1 text-primary">{data.supportChat.aiResolutionRate}%</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Escalated</div>
                <div className="text-2xl font-bold mt-1 text-amber-600">{data.supportChat.escalated}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg Handle Time</div>
                <div className="text-2xl font-bold mt-1">{data.supportChat.avgHandleTimeMin}m</div>
              </div>
            </div>
            <Separator />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                By Category
              </div>
              <div className="space-y-1.5">
                {Object.entries(data.supportChat.byCategory).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No data yet.</p>
                ) : (
                  Object.entries(data.supportChat.byCategory).map(([cat, count]) => (
                    <div key={cat} className="flex items-center justify-between text-xs">
                      <span>{cat}</span>
                      <span className="font-semibold tabular-nums">{count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by provider breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Revenue by Provider</CardTitle>
          <CardDescription className="text-xs">
            Successful payments grouped by gateway.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.revenue.byProvider.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No successful payments yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.revenue.byProvider.map((p) => (
                <div key={p.provider} className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">{p.provider}</div>
                  <div className="text-lg font-bold mt-0.5">{fmtMoney(p.total)}</div>
                  <div className="text-[11px] text-muted-foreground">{p.count} payments</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-center text-[11px] text-muted-foreground">
        Advanced analytics generated {fmtDate(data.generatedAt)}. Auto-refreshes every 2 minutes.
      </div>
    </div>
  )
}
