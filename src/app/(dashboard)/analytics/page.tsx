'use client'
import { useState, useEffect } from 'react'
import { PageHeader, StatCard } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, BedDouble, TrendingUp, Receipt, Loader2, RefreshCw } from 'lucide-react'
import { fmtMoney } from '@/lib/utils'

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    fetch('/api/tenant-data?type=overview').then(r => r.json()).then(d => setData(d)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  if (loading) return <div><PageHeader title="Analytics" description="Real-time analytics from AUSU." /><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></div>

  const stats = data?.stats
  if (!stats) return <div><PageHeader title="Analytics" description="Real-time analytics from AUSU." /><Card><CardContent className="p-12 text-center text-sm text-muted-foreground">Could not fetch stats from AUSU's database.</CardContent></Card></div>

  const occupancyRate = stats.bedCount > 0 ? Math.round((stats.occupiedBeds / stats.bedCount) * 100) : 0

  return (
    <div>
      <PageHeader title="Analytics" description="Real-time analytics from AUSU's hostel database."
        actions={<Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" /> Refresh</Button>} />
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Students" value={stats.studentCount?.toLocaleString() || 0} icon={Users} accent="primary" />
        <StatCard label="Total Beds" value={stats.bedCount?.toLocaleString() || 0} icon={BedDouble} accent="blue" />
        <StatCard label="Active Allocations" value={stats.activeAllocations || 0} icon={Receipt} accent="purple" />
        <StatCard label="Revenue Processed" value={fmtMoney(stats.totalRevenue || 0)} icon={TrendingUp} accent="amber" />
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Available Beds" value={stats.availableBeds || 0} icon={BedDouble} accent="primary" />
        <StatCard label="Occupied Beds" value={stats.occupiedBeds || 0} icon={BedDouble} accent="blue" />
        <StatCard label="Successful Payments" value={stats.successfulPayments || 0} icon={Receipt} accent="purple" />
        <StatCard label="Pending Payments" value={stats.pendingPayments || 0} icon={Receipt} accent="amber" />
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Active Bursary Codes" value={stats.activeBursaryCodes || 0} icon={Receipt} accent="primary" />
        <StatCard label="Pending Applications" value={stats.pendingApplications || 0} icon={Users} accent="amber" />
        <StatCard label="Total Users" value={stats.totalUsers?.toLocaleString() || 0} icon={Users} accent="blue" />
        <StatCard label="Active Session" value={stats.activeSession || 'None'} icon={TrendingUp} accent="purple" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Occupancy Rate</CardTitle>
          <CardDescription>Bed utilization at AUSU</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold">{occupancyRate}%</div>
            <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${occupancyRate}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
