'use client'
import { useState, useEffect } from 'react'
import { PageHeader, StatCard, EmptyState } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Receipt, Loader2, RefreshCw, Plus, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { fmtMoney, fmtDate } from '@/lib/utils'
import { toast } from 'sonner'

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ tenantId: '', amount: '', period: '', dueAt: '' })

  function load() {
    setLoading(true)
    fetch('/api/invoices').then(r => r.json()).then(d => setInvoices(d.invoices || [])).finally(() => setLoading(false))
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
      setForm({ tenantId: '', amount: '', period: '', dueAt: '' })
      load()
    } catch { toast.error('Failed to create invoice') }
    finally { setCreating(false) }
  }

  const paid = invoices.filter(i => i.status === 'paid')
  const pending = invoices.filter(i => i.status === 'pending')
  const overdue = invoices.filter(i => i.status === 'overdue')
  const totalPaid = paid.reduce((s, i) => s + i.amount, 0)

  return (
    <div>
      <PageHeader title="Invoices" description="Create and track licensing invoices."
        actions={<Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1.5" /> Create Invoice</Button>} />
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-4 mb-6">
        <StatCard label="Paid" value={paid.length} icon={CheckCircle2} accent="primary" />
        <StatCard label="Pending" value={pending.length} icon={Clock} accent="amber" />
        <StatCard label="Overdue" value={overdue.length} icon={AlertCircle} accent="destructive" />
        <StatCard label="Total Collected" value={fmtMoney(totalPaid)} icon={Receipt} accent="primary" />
      </div>
      <Card><CardContent className="p-0">
        {loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        : invoices.length === 0 ? <EmptyState icon={Receipt} title="No invoices" description="Create your first invoice." />
        : (
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
      </CardContent></Card>

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
