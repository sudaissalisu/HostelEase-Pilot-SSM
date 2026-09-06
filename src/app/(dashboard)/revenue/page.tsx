'use client'
import { useState, useEffect } from 'react'
import { PageHeader, StatCard } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from "@/components/ui/button"
import { TrendingUp, Loader2, RefreshCw, Receipt } from 'lucide-react'
import { fmtMoney, fmtDate } from '@/lib/utils'

export default function RevenuePage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

  const paid = invoices.filter(i => i.status === 'paid')
  const pending = invoices.filter(i => i.status === 'pending')
  const overdue = invoices.filter(i => i.status === 'overdue')
  const totalPaid = paid.reduce((s, i) => s + i.amount, 0)
  const totalPending = pending.reduce((s, i) => s + i.amount, 0)
  const totalOverdue = overdue.reduce((s, i) => s + i.amount, 0)
  const tenantRevenue = tenants.reduce((s, t) => s + (t.realStats?.totalRevenue ?? 0), 0)

  if (loading) return <div><PageHeader title="Revenue" description="SSM licensing revenue." /><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></div>

  return (
    <div>
      <PageHeader title="Revenue" description="SSM licensing revenue + tenant revenue overview."
        actions={<Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" /> Refresh</Button>} />
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="SSM Revenue" value={fmtMoney(totalPaid)} icon={TrendingUp} accent="primary" hint="Licensing fees collected" />
        <StatCard label="Pending" value={fmtMoney(totalPending)} icon={Receipt} accent="amber" hint={`${pending.length} invoices`} />
        <StatCard label="Overdue" value={fmtMoney(totalOverdue)} icon={Receipt} accent="destructive" hint={`${overdue.length} invoices`} />
        <StatCard label="Tenant Revenue" value={fmtMoney(tenantRevenue)} icon={TrendingUp} accent="purple" hint="Processed by tenants" />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Invoice History</CardTitle></CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">No invoices yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="font-semibold">Invoice #</TableHead>
                  <TableHead className="font-semibold">Period</TableHead>
                  <TableHead className="font-semibold text-right">Amount</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Paid</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {invoices.map((inv: any) => (
                    <TableRow key={inv.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs">{inv.invoiceNo}</TableCell>
                      <TableCell className="text-sm">{inv.period}</TableCell>
                      <TableCell className="text-right font-semibold">{fmtMoney(inv.amount)}</TableCell>
                      <TableCell><Badge variant="outline" className={inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : inv.status === 'overdue' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}>{inv.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{inv.paidAt ? fmtDate(inv.paidAt) : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
