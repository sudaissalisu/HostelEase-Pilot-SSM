'use client'
import { useState, useEffect } from 'react'
import { PageHeader, StatCard } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LifeBuoy, ExternalLink, Activity, Database, Server, ShieldCheck } from 'lucide-react'
import { fmtMoney } from '@/lib/utils'

export default function SupportPage() {
  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/overview').then(r => r.json()).then(d => setTenants(d.tenants || [])).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <PageHeader title="Support" description="Access tenant portals and monitor system health." />
      {tenants.map((t: any) => (
        <Card key={t.id} className="mb-4">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>{t.name}</span>
              <Badge variant="outline" className={t.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}>{t.status}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-4 mb-4">
              <div><div className="text-xs text-muted-foreground">Students</div><div className="text-lg font-bold">{(t.realStats?.studentCount ?? t.studentCount)?.toLocaleString() || 0}</div></div>
              <div><div className="text-xs text-muted-foreground">Beds</div><div className="text-lg font-bold">{(t.realStats?.bedCount ?? t.bedCount)?.toLocaleString() || 0}</div></div>
              <div><div className="text-xs text-muted-foreground">Revenue</div><div className="text-lg font-bold">{fmtMoney(t.realStats?.totalRevenue ?? 0)}</div></div>
              <div><div className="text-xs text-muted-foreground">Session</div><div className="text-sm font-bold">{t.realStats?.activeSession || '—'}</div></div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {t.portalUrl && (
                <a href={t.portalUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="default"><ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open Portal</Button>
                </a>
              )}
              <Button size="sm" variant="outline" onClick={() => window.location.href = '/audit-logs'}><ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Audit Logs</Button>
              <Button size="sm" variant="outline" onClick={() => window.location.href = '/email-logs'}><Activity className="h-3.5 w-3.5 mr-1.5" /> Email Logs</Button>
              <Button size="sm" variant="outline" onClick={() => window.location.href = '/system-health'}><Server className="h-3.5 w-3.5 mr-1.5" /> System Health</Button>
              <Button size="sm" variant="outline" onClick={() => window.location.href = '/settings'}><Database className="h-3.5 w-3.5 mr-1.5" /> Settings</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
