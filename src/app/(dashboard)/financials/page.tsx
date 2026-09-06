'use client'
import { useState, useEffect } from 'react'
import { PageHeader, StatCard, EmptyState } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { FileText, Loader2, RefreshCw, Plus, CheckCircle2, Clock, AlertCircle, TrendingUp, Receipt, Calendar } from 'lucide-react'
import { fmtMoney, fmtDate, daysUntil } from '@/lib/utils'
import { toast } from 'sonner'

export default function FinancialsPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ tenantId: 'ausu', amount: '', period: '', dueAt: '' })

  function load() {
    setLoading(true)
    Promise.all([
      fetch('/api/invoices').then(r => r.json()),
      fetch('/api/overview').then(r => r.json())
    ]).then(([invData, tenantData]) => {
      setInvoices(invData.invoices || [])
      setTenants(tenantData.tenants || [])
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  async function createInvoice() {
    setCreating(true)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: form.tenantId, amount: parseFloat(form.amount), period: form.period, dueAt: form.dueAt || undefined }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success('Invoice created')
      setShowCreate(false)
      setForm({ tenantId: 'ausu', amount: '', period: '', dueAt: '' })
      load()
    } catch { toast.error('Failed to create invoice') }
    finally { setCreating(false) }
  }

  const paid = invoices.filter(i => i.status === 'paid')
  const pending = invoices.filter(i => i.status === 'pending')
  const overdue = invoices.filter(i => i.status === 'overdue')
  const totalPaid = paid.reduce((s, i) => s + i.amount, 0)
  const totalPending = pending.reduce((s, i) => s + i.amount, 0)
  const totalOverdue = overdue.reduce((s, i) => s + i.amount, 0)
  const tenantRevenue = tenants.reduce((s, t) => s + (t.realStats?.totalRevenue ?? 0), 0)
  const activeLicenses = tenants.filter(t => t.status === 'active').length
  const expiringLicenses = tenants.filter(t => { const d = daysUntil(t.expiresAt); return d !== null && d <= 60 && d >= 0 }).length

  if (loading) return <div><PageHeader title="Financials" description="Licenses, invoices, and revenue." /><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></div>

  return (
    <div>
      <PageHeader title="Financials" description="Licenses, invoices, and revenue across all tenants."
        actions={<Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1.5" /> Create Invoice</Button>} />

      {/* Revenue overview */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="SSM Revenue" value={fmtMoney(totalPaid)} icon={TrendingUp} accent="primary" hint="Licensing fees collected" />
        <StatCard label="Pending" value={fmtMoney(totalPending)} icon={Clock} accent="amber" hint={`${pending.length} invoices`} />
        <StatCard label="Overdue" value={fmtMoney(totalOverdue)} icon={AlertCircle} accent="destructive" hint={`${overdue.length} invoices`} />
        <StatCard label="Tenant Revenue" value={fmtMoney(tenantRevenue)} icon={Receipt} accent="purple" hint="Processed by tenants" />
      </div>

      <Tabs defaultValue="licenses">
        <TabsList className="mb-4">
          <TabsTrigger value="licenses">Licenses</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        {/* Licenses tab */}
        <TabsContent value="licenses">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-4">
            <StatCard label="Active Licenses" value={activeLicenses} icon={CheckCircle2} accent="primary" />
            <StatCard label="Expiring (≤60d)" value={expiringLicenses} icon={Calendar} accent="amber" />
            <StatCard label="Total Tenants" value={tenants.length} icon={FileText} accent="purple" />
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">License Details</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-semibold">Tenant</TableHead>
                    <TableHead className="font-semibold">Plan</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Fee/Year</TableHead>
                    <TableHead className="font-semibold">Started</TableHead>
                    <TableHead className="font-semibold">Expires</TableHead>
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
                              <span className={d !== null && d < 0 ? 'text-destructive font-medium' : d !== null && d <= 60 ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>
                                {fmtDate(t.expiresAt)}
                                {d !== null && d <= 60 && d >= 0 && <span className="block text-[10px] text-amber-500">in {d} days</span>}
                              </span>
                            ) : '—'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader><CardTitle className="text-base">Invoice History ({invoices.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              {invoices.length === 0 ? (
                <EmptyState icon={Receipt} title="No invoices yet" description="Click 'Create Invoice' to get started." />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="font-semibold">Invoice #</TableHead>
                      <TableHead className="font-semibold">Period</TableHead>
                      <TableHead className="font-semibold text-right">Amount</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Issued</TableHead>
                      <TableHead className="font-semibold">Due</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {invoices.map((inv: any) => (
                        <TableRow key={inv.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono text-xs font-medium">{inv.invoiceNo}</TableCell>
                          <TableCell className="text-sm">{inv.period}</TableCell>
                          <TableCell className="text-right font-semibold">{fmtMoney(inv.amount)}</TableCell>
                          <TableCell><Badge variant="outline" className={inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : inv.status === 'overdue' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}>{inv.status}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{fmtDate(inv.issuedAt)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{inv.dueAt ? fmtDate(inv.dueAt) : '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Invoice Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Tenant</Label><Input value={form.tenantId} onChange={(e) => setForm(prev => ({ ...prev, tenantId: e.target.value }))} placeholder="ausu" className="h-8" /></div>
            <div><Label className="text-xs">Amount (NGN)</Label><Input type="number" value={form.amount} onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))} placeholder="500000" className="h-8" /></div>
            <div><Label className="text-xs">Period</Label><Input value={form.period} onChange={(e) => setForm(prev => ({ ...prev, period: e.target.value }))} placeholder="2026 Annual License" className="h-8" /></div>
            <div><Label className="text-xs">Due Date (optional)</Label><Input type="date" value={form.dueAt} onChange={(e) => setForm(prev => ({ ...prev, dueAt: e.target.value }))} className="h-8" /></div>
          </div>
          <DialogFooter><Button onClick={createInvoice} disabled={creating}>{creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
