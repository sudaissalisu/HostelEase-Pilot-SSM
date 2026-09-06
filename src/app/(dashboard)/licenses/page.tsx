'use client'
import { useState, useEffect } from 'react'
import { PageHeader, StatCard, EmptyState } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { FileText, Loader2, RefreshCw, Calendar, CheckCircle2, AlertTriangle } from 'lucide-react'
import { fmtMoney, fmtDate, daysUntil } from '@/lib/utils'

export default function LicensesPage() {
  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    fetch('/api/overview').then(r => r.json()).then(d => setTenants(d.tenants || [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const active = tenants.filter(t => t.status === 'active').length
  const expiring = tenants.filter(t => { const d = daysUntil(t.expiresAt); return d !== null && d <= 60 && d >= 0 }).length
  const expired = tenants.filter(t => { const d = daysUntil(t.expiresAt); return d !== null && d < 0 }).length

  return (
    <div>
      <PageHeader title="Licenses" description="Manage HostelEase licenses for all tenants."
        actions={<Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" /> Refresh</Button>} />
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-4 mb-6">
        <StatCard label="Total" value={tenants.length} icon={FileText} accent="primary" />
        <StatCard label="Active" value={active} icon={CheckCircle2} accent="primary" />
        <StatCard label="Expiring" value={expiring} icon={Calendar} accent="amber" />
        <StatCard label="Expired" value={expired} icon={AlertTriangle} accent="destructive" />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">License Details</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          : tenants.length === 0 ? <EmptyState icon={FileText} title="No licenses" />
          : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="font-semibold">Tenant</TableHead>
                  <TableHead className="font-semibold">Plan</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">Fee</TableHead>
                  <TableHead className="font-semibold">Started</TableHead>
                  <TableHead className="font-semibold">Expires</TableHead>
                  <TableHead className="font-semibold">Auto-Renew</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {tenants.map((t: any) => {
                    const d = daysUntil(t.expiresAt)
                    return (
                      <TableRow key={t.id} className="hover:bg-muted/30">
                        <TableCell><div className="font-medium">{t.name}</div><div className="text-xs text-muted-foreground">{t.shortName}</div></TableCell>
                        <TableCell><Badge variant="secondary" className="capitalize">{t.plan}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className={t.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}>{t.status}</Badge></TableCell>
                        <TableCell className="text-right font-semibold">{fmtMoney(t.licenseFee)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtDate(t.startedAt)}</TableCell>
                        <TableCell className="text-xs">
                          {t.expiresAt ? (
                            <span className={d !== null && d < 0 ? 'text-destructive font-medium' : d !== null && d <= 60 ? 'text-amber-600 font-medium' : ''}>
                              {fmtDate(t.expiresAt)}
                              {d !== null && d <= 60 && d >= 0 && <span className="block text-[10px] text-amber-500">in {d} days</span>}
                              {d !== null && d < 0 && <span className="block text-[10px] text-destructive">{Math.abs(d)} days ago</span>}
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell><Badge variant="outline" className={t.autoRenew ? 'bg-emerald-50 text-emerald-700' : 'bg-muted'}>{t.autoRenew ? 'Yes' : 'No'}</Badge></TableCell>
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
