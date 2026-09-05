'use client'

import { useState, useEffect } from 'react'
import { Building2, Users, BedDouble, TrendingUp, Receipt, AlertTriangle, Clock, ExternalLink } from 'lucide-react'
import { PageHeader, StatCard, EmptyState } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { fmtMoney, fmtDate, daysUntil } from '@/lib/utils'

interface Tenant {
  id: string; name: string; shortName: string; plan: string; status: string;
  licenseFee: number; startedAt: string; expiresAt: string | null;
  studentCount: number; bedCount: number; staffCount: number;
  domain: string; portalUrl: string; realStats: any;
}

interface Stats {
  totalTenants: number; activeTenants: number; totalStudents: number;
  totalBeds: number; totalRevenue: number; totalTenantRevenue: number;
  pendingInvoices: number; overdueInvoices: number; expiringLicenses: number;
}

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/overview').then(r => r.json()).then(d => {
      if (d.stats) setStats(d.stats)
      if (d.tenants) setTenants(d.tenants)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div>
        <PageHeader title="Overview" description="Aggregate metrics across all HostelEase tenants." />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><div className="h-16 rounded bg-muted animate-pulse" /></CardContent></Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Aggregate metrics across all HostelEase tenants."
        actions={<Button variant="outline" size="sm" onClick={() => window.location.reload()}>Refresh</Button>}
      />

      {/* Stats grid — uses StatCard from hostel platform */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Active Tenants" value={stats?.activeTenants ?? 0} icon={Building2} hint={`of ${stats?.totalTenants ?? 0} total`} accent="primary" />
        <StatCard label="Total Students" value={(stats?.totalStudents ?? 0).toLocaleString()} icon={Users} hint="Across all tenants" accent="blue" />
        <StatCard label="Managed Beds" value={(stats?.totalBeds ?? 0).toLocaleString()} icon={BedDouble} hint="Total bed capacity" accent="purple" />
        <StatCard label="SSM Revenue" value={fmtMoney(stats?.totalRevenue ?? 0)} icon={TrendingUp} hint="Licensing fees collected" accent="amber" />
      </div>

      {/* Alerts */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-6">
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-900/10">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 grid place-items-center shrink-0">
              <Receipt className="h-5 w-5" />
            </div>
            <div><div className="text-xl font-bold">{stats?.pendingInvoices ?? 0}</div><div className="text-xs text-muted-foreground">Pending Invoices</div></div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-900/10">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 text-destructive grid place-items-center shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div><div className="text-xl font-bold">{stats?.overdueInvoices ?? 0}</div><div className="text-xs text-muted-foreground">Overdue Invoices</div></div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-900/10">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-500/10 text-orange-600 grid place-items-center shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div><div className="text-xl font-bold">{stats?.expiringLicenses ?? 0}</div><div className="text-xs text-muted-foreground">Expiring Licenses</div></div>
          </CardContent>
        </Card>
      </div>

      {/* Tenant table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Licensed Tenants</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Schools currently using HostelEase</p>
            </div>
            <Badge variant="secondary">{tenants.length} total</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {tenants.length === 0 ? (
            <EmptyState icon={Building2} title="No tenants yet" description="Add your first school to get started." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-semibold">Tenant</TableHead>
                    <TableHead className="font-semibold">Plan</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Students</TableHead>
                    <TableHead className="font-semibold text-right">License Fee</TableHead>
                    <TableHead className="font-semibold">Expires</TableHead>
                    <TableHead className="font-semibold"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map(t => {
                    const days = daysUntil(t.expiresAt)
                    const expiringSoon = days !== null && days <= 60 && days >= 0
                    const expired = days !== null && days < 0
                    const students = t.realStats?.studentCount ?? t.studentCount
                    return (
                      <TableRow key={t.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="font-medium">{t.name}</div>
                          <div className="text-xs text-muted-foreground">{t.shortName}</div>
                        </TableCell>
                        <TableCell><Badge variant="secondary" className="capitalize">{t.plan}</Badge></TableCell>
                        <TableCell>
                          <Badge variant="outline" className={t.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}>
                            {t.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{students.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold">{fmtMoney(t.licenseFee)}</TableCell>
                        <TableCell className="text-xs">
                          {t.expiresAt ? (
                            <span className={expired ? 'text-destructive font-medium' : expiringSoon ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>
                              {fmtDate(t.expiresAt)}
                              {expiringSoon && <span className="block text-[10px] text-amber-500">in {days} days</span>}
                              {expired && <span className="block text-[10px] text-destructive">{Math.abs(days)} days ago</span>}
                            </span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {t.portalUrl && (
                            <a href={t.portalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium">
                              Portal <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
