'use client'
import { useState, useEffect } from 'react'
import { PageHeader, EmptyState, StatCard } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CreditCard, Loader2, RefreshCw, CheckCircle2, XCircle } from 'lucide-react'

export default function PaymentGatewaysPage() {
  const [gateways, setGateways] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    fetch('/api/tenant-data?type=payment-gateways').then(r => r.json()).then(d => setGateways(d.gateways || [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const enabled = gateways.filter(g => g.isEnabled).length
  const sandbox = gateways.filter(g => g.isSandbox).length

  return (
    <div>
      <PageHeader title="Payment Gateways" description="Payment gateway configuration at AUSU."
        actions={<Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" /> Refresh</Button>} />
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-6">
        <StatCard label="Total Gateways" value={gateways.length} icon={CreditCard} accent="primary" />
        <StatCard label="Enabled" value={enabled} icon={CheckCircle2} accent="primary" />
        <StatCard label="Sandbox Mode" value={sandbox} icon={XCircle} accent="amber" />
      </div>
      {loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      : gateways.length === 0 ? <Card><CardContent className="p-0"><EmptyState icon={CreditCard} title="No gateways" description="No payment gateways configured at AUSU." /></CardContent></Card>
      : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {gateways.map((g: any) => (
            <Card key={g.provider}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{g.displayName || g.provider}</div>
                      <div className="text-xs text-muted-foreground">{g.provider}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className={g.isEnabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}>
                    {g.isEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="secondary" className={g.isSandbox ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}>
                    {g.isSandbox ? 'Sandbox' : 'Live'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
