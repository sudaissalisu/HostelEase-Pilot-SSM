'use client'
import { useState, useEffect } from 'react'
import { PageHeader, StatCard, EmptyState } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CreditCard, Loader2, RefreshCw, CheckCircle2, XCircle, Power } from 'lucide-react'
import { toast } from 'sonner'

const GATEWAY_INFO: Record<string, { name: string; color: string }> = {
  PAYSTACK: { name: 'Paystack', color: 'bg-teal-500' },
  FLUTTERWAVE: { name: 'Flutterwave', color: 'bg-amber-500' },
  OPAY: { name: 'OPay', color: 'bg-emerald-500' },
  REMITA: { name: 'Remita', color: 'bg-rose-500' },
  KORA: { name: 'Kora', color: 'bg-purple-500' },
  ZAINPAY: { name: 'Zainpay', color: 'bg-green-500' },
  MANUAL_TRANSFER: { name: 'Manual Transfer', color: 'bg-zinc-600' },
}

export default function PaymentGatewaysPage() {
  const [gateways, setGateways] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  function load() {
    setLoading(true)
    fetch('/api/tenant-data?type=payment-gateways').then(r => r.json()).then(d => setGateways(d.gateways || [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  async function toggleGateway(provider: string, currentEnabled: boolean) {
    setToggling(provider)
    try {
      const res = await fetch('/api/tenant-data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle-gateway', provider, isEnabled: !currentEnabled }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(`${provider} ${!currentEnabled ? 'enabled' : 'disabled'}`)
      load()
    } catch { toast.error('Failed to toggle gateway') }
    finally { setToggling(null) }
  }

  const enabled = gateways.filter(g => g.isEnabled).length
  const sandbox = gateways.filter(g => g.isSandbox).length

  return (
    <div>
      <PageHeader title="Payment Gateways" description="Manage payment gateway configuration for AUSU."
        actions={<Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" /> Refresh</Button>} />
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-6">
        <StatCard label="Total Gateways" value={gateways.length} icon={CreditCard} accent="primary" />
        <StatCard label="Enabled" value={enabled} icon={CheckCircle2} accent="primary" />
        <StatCard label="Sandbox Mode" value={sandbox} icon={XCircle} accent="amber" />
      </div>
      {loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      : gateways.length === 0 ? <Card><CardContent className="p-0"><EmptyState icon={CreditCard} title="No gateways" /></CardContent></Card>
      : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {gateways.map((g) => {
            const info = GATEWAY_INFO[g.provider] || { name: g.provider, color: 'bg-zinc-500' }
            return (
              <Card key={g.provider}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`h-10 w-10 rounded-xl ${info.color} text-white grid place-items-center shrink-0`}>
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{g.displayName || info.name}</div>
                        <div className="text-xs text-muted-foreground">{g.provider}</div>
                      </div>
                    </div>
                    <Badge variant="outline" className={g.isEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'}>
                      {g.isEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className={g.isSandbox ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}>
                      {g.isSandbox ? 'Sandbox' : 'Live'}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant={g.isEnabled ? 'outline' : 'default'}
                    className="w-full"
                    disabled={toggling === g.provider}
                    onClick={() => toggleGateway(g.provider, g.isEnabled)}
                  >
                    {toggling === g.provider ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5 mr-1" />}
                    {g.isEnabled ? 'Disable' : 'Enable'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
