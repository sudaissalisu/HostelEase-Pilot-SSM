'use client'
import { useState, useEffect } from 'react'
import { PageHeader, StatCard } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Activity, Loader2, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react'
import { fmtMoney } from '@/lib/utils'

export default function SystemHealthPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    fetch('/api/tenant-data?type=system-health').then(r => r.json()).then(d => setData(d)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  if (loading) return <div><PageHeader title="System Health" description="Real-time system health from AUSU." /><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></div>

  const stats = data?.stats
  const checks = data?.healthChecks || {}

  return (
    <div>
      <PageHeader title="System Health" description="Real-time system health from AUSU's database."
        actions={<Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" /> Refresh</Button>} />
      {stats && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <StatCard label="Students" value={stats.studentCount?.toLocaleString() || 0} icon={Activity} accent="primary" />
          <StatCard label="Active Allocations" value={stats.activeAllocations || 0} icon={CheckCircle2} accent="blue" />
          <StatCard label="Revenue" value={fmtMoney(stats.totalRevenue || 0)} icon={Activity} accent="amber" />
          <StatCard label="Session" value={stats.activeSession || 'None'} icon={Activity} accent="purple" />
        </div>
      )}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(checks).map(([key, check]: any) => (
          <Card key={key}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${check.status === 'ok' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                {check.status === 'ok' ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              </div>
              <div>
                <div className="font-medium text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                <div className="text-xs text-muted-foreground">{check.label || check.name || check.status}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
