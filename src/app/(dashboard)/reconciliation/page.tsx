'use client'
import { useState, useEffect } from 'react'
import { PageHeader, StatCard } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { BarChart3, Loader2, RefreshCw, CheckCircle2, XCircle } from 'lucide-react'
import { fmtMoney, fmtDateTime } from '@/lib/utils'

export default function ReconciliationPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    fetch('/api/tenant-data?type=overview').then(r => r.json()).then(d => setData(d)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  if (loading) return <div><PageHeader title="Reconciliation" description="Payment settlement reconciliation." /><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></div>

  const stats = data?.stats
  return (
    <div>
      <PageHeader title="Reconciliation" description="Payment settlement reconciliation from AUSU."
        actions={<Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" /> Refresh</Button>} />
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-6">
        <StatCard label="Successful Payments" value={stats?.successfulPayments || 0} icon={CheckCircle2} accent="primary" />
        <StatCard label="Pending Payments" value={stats?.pendingPayments || 0} icon={BarChart3} accent="amber" />
        <StatCard label="Total Revenue" value={fmtMoney(stats?.totalRevenue || 0)} icon={BarChart3} accent="primary" />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Payment Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Active Bursary Codes</span><span className="font-medium">{stats?.activeBursaryCodes || 0}</span></div>
            <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Active Allocations</span><span className="font-medium">{stats?.activeAllocations || 0}</span></div>
            <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Total Students</span><span className="font-medium">{stats?.studentCount?.toLocaleString() || 0}</span></div>
            <div className="flex justify-between py-2"><span className="text-muted-foreground">Active Session</span><span className="font-medium">{stats?.activeSession || 'None'}</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
