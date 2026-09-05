'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Users, BedDouble, TrendingUp, Receipt, Loader2 } from 'lucide-react'
import { fmtMoney } from '@/lib/utils'

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/overview').then(r => r.json()).then(d => setData(d)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

  const stats = data?.stats
  const tenants = data?.tenants || []
  const ausu = tenants.find((t: any) => t.id === 'ausu')
  const realStats = ausu?.realStats

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">Real-time analytics from AUSU's hostel database.</p>
      </div>
      {realStats ? (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Students" value={realStats.studentCount} icon={Users} />
            <StatCard label="Total Beds" value={realStats.bedCount} icon={BedDouble} />
            <StatCard label="Active Allocations" value={realStats.activeAllocations} icon={Receipt} />
            <StatCard label="Revenue Processed" value={fmtMoney(realStats.totalRevenue)} icon={TrendingUp} />
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Available Beds" value={realStats.availableBeds} icon={BedDouble} />
            <StatCard label="Occupied Beds" value={realStats.occupiedBeds} icon={BedDouble} />
            <StatCard label="Successful Payments" value={realStats.successfulPayments} icon={Receipt} />
            <StatCard label="Pending Payments" value={realStats.pendingPayments} icon={Receipt} />
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Active Bursary Codes" value={realStats.activeBursaryCodes} icon={Receipt} />
            <StatCard label="Pending Applications" value={realStats.pendingApplications} icon={Users} />
            <StatCard label="Total Users" value={realStats.totalUsers} icon={Users} />
            <StatCard label="Active Session" value={realStats.activeSession || '—'} icon={TrendingUp} />
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Occupancy Rate</CardTitle><CardDescription>Bed utilization at AUSU</CardDescription></CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="text-3xl font-bold">{realStats.bedCount > 0 ? Math.round((realStats.occupiedBeds / realStats.bedCount) * 100) : 0}%</div>
                <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${realStats.bedCount > 0 ? (realStats.occupiedBeds / realStats.bedCount) * 100 : 0}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card><CardContent className="p-12 text-center text-sm text-slate-500">Could not fetch real-time stats from AUSU's database. Make sure the tenant's databaseUrl is configured.</CardContent></Card>
      )}
    </div>
  )
}

function StatCard({ label, value, icon: Icon }: { label: string; value: any; icon: any }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</div>
            <div className="text-2xl font-bold mt-1.5">{typeof value === 'number' ? value.toLocaleString() : value}</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center"><Icon className="h-5 w-5" /></div>
        </div>
      </CardContent>
    </Card>
  )
}
