'use client'
import { useState, useEffect } from 'react'
import { PageHeader, StatCard } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Loader2, RefreshCw, Power, ShieldAlert, Activity } from 'lucide-react'
import { toast } from 'sonner'

export default function MaintenancePage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [togglingKill, setTogglingKill] = useState(false)
  const [auditLogs, setAuditLogs] = useState<any[]>([])

  function load() {
    setLoading(true)
    Promise.all([
      fetch('/api/tenant-data?type=settings').then(r => r.json()),
      fetch('/api/tenant-data?type=audit-logs').then(r => r.json())
    ]).then(([settingsData, auditData]) => {
      setSettings(settingsData.settings?.MAINTENANCE || {})
      setAuditLogs((auditData.logs || []).filter((l: any) => l.severity === 'HIGH').slice(0, 10))
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const killSwitch = settings.kill_switch === 'true'

  async function toggleKillSwitch() {
    setTogglingKill(true)
    try {
      const res = await fetch('/api/tenant-data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle-maintenance', enabled: !killSwitch }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(`Kill switch ${!killSwitch ? 'ACTIVATED' : 'deactivated'}`)
      setSettings(prev => ({ ...prev, kill_switch: String(!killSwitch) }))
    } catch { toast.error('Failed to toggle kill switch') }
    finally { setTogglingKill(false) }
  }

  if (loading) return <div><PageHeader title="Maintenance & Alerts" description="Maintenance mode, kill switch, and security alerts." /><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></div>

  return (
    <div>
      <PageHeader title="Maintenance & Alerts" description="Maintenance mode, kill switch, and security alerts for AUSU."
        actions={<Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" /> Refresh</Button>} />

      {/* Kill Switch */}
      <Card className={`mb-4 ${killSwitch ? 'border-destructive bg-destructive/5' : ''}`}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className={`h-5 w-5 ${killSwitch ? 'text-destructive' : 'text-muted-foreground'}`} />
            Kill Switch
          </CardTitle>
          <CardDescription>Instantly block ALL student access to AUSU's portal</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Badge variant="outline" className={killSwitch ? 'bg-destructive/10 text-destructive' : 'bg-emerald-50 text-emerald-700'}>
                {killSwitch ? 'ACTIVATED — Portal blocked' : 'Inactive — Portal running normally'}
              </Badge>
            </div>
            <Button variant={killSwitch ? 'default' : 'destructive'} disabled={togglingKill} onClick={toggleKillSwitch}>
              {togglingKill ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4 mr-1.5" />}
              {killSwitch ? 'Deactivate Kill Switch' : 'Activate Kill Switch'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* High-severity audit logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Recent Security Alerts</CardTitle>
          <CardDescription>High-severity audit events from AUSU</CardDescription>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8"><Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />No security alerts.</div>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((log: any) => (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30">
                  <div className="h-8 w-8 rounded-lg bg-red-500/10 text-red-600 grid place-items-center shrink-0">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{log.action}</div>
                    <div className="text-xs text-muted-foreground truncate">{log.summary || '—'}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{log.ipAddress || '—'} · {new Date(log.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
