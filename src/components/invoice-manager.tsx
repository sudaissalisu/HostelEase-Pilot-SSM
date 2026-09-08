'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import useSWR, { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import {
  Receipt, Plus, RefreshCw, Download, Edit, Trash2, Search, FileText,
  ArrowLeft, Save, X, Upload, Eye, Building2, Mail, Phone, MapPin,
  Calendar, DollarSign, FileText as FileTextIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) =>
    r.ok ? r.json() : Promise.reject(new Error('Failed to fetch'))
  )

interface LineItem { description: string; quantity: number; unitPrice: number }
interface Tenant { id: string; name: string; shortName: string; contactName?: string | null; contactEmail?: string | null; contactPhone?: string | null; addressLine?: string | null; city?: string | null; state?: string | null; country?: string }
interface Invoice {
  id: string; invoiceNo: string; tenantId: string; tenant: Tenant
  description: string | null; contactPerson: string | null; contactRole: string | null
  clientAddress: string | null; clientEmail: string | null
  lineItems: string | null; amount: number; currency: string
  taxRate: number; taxAmount: number; discountAmount: number; total: number
  status: string; period: string; issuedAt: string; dueAt: string | null
  paidAt: string | null; method: string | null; reference: string | null
  notes: string | null; paymentInstructions: string | null; signatureUrl: string | null
  createdBy: { name: string } | null
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-300',
  sent: 'bg-blue-50 text-blue-700 border-blue-300',
  pending: 'bg-amber-50 text-amber-700 border-amber-300',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  overdue: 'bg-red-50 text-red-700 border-red-300',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-300',
}

function fmtMoney(n: number, currency: string = 'NGN') {
  if (currency === 'USD') return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ═══════════════════════════════════════════════════════════════════════════
// INVOICE LIST — full page
// ═══════════════════════════════════════════════════════════════════════════
export function InvoiceList() {
  const router = useRouter()
  const { mutate } = useSWRConfig()
  const { data, isLoading } = useSWR<{ invoices: Invoice[] }>('/api/invoices', fetcher)

  const [statusFilter, setStatusFilter] = React.useState('ALL')
  const [search, setSearch] = React.useState('')
  const [deleting, setDeleting] = React.useState<Invoice | null>(null)

  const invoices = data?.invoices || []
  const filtered = invoices.filter((inv) => {
    if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return inv.invoiceNo.toLowerCase().includes(q) || inv.tenant?.name?.toLowerCase().includes(q) || inv.period?.toLowerCase().includes(q)
    }
    return true
  })

  const stats = {
    total: invoices.length,
    pending: invoices.filter((i) => i.status === 'pending' || i.status === 'sent').length,
    paid: invoices.filter((i) => i.status === 'paid').length,
    overdue: invoices.filter((i) => i.status === 'overdue').length,
  }

  function refresh() { mutate('/api/invoices') }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
            <Receipt className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Invoices</h1>
            <p className="text-sm text-muted-foreground">Manage tenant billing invoices</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}><RefreshCw className="h-4 w-4 mr-2" /> Refresh</Button>
          <Button size="sm" onClick={() => router.push('/invoices/new')}><Plus className="h-4 w-4 mr-2" /> Create Invoice</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4"><div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-muted-foreground">Total Invoices</div></Card>
        <Card className="p-4"><div className="text-2xl font-bold text-amber-600">{stats.pending}</div><div className="text-xs text-muted-foreground">Pending</div></Card>
        <Card className="p-4"><div className="text-2xl font-bold text-emerald-600">{stats.paid}</div><div className="text-xs text-muted-foreground">Paid</div></Card>
        <Card className="p-4"><div className="text-2xl font-bold text-red-600">{stats.overdue}</div><div className="text-xs text-muted-foreground">Overdue</div></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by invoice no, tenant, or period..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No invoices found. Create your first invoice to get started.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead><TableHead>Tenant</TableHead><TableHead>Period</TableHead>
                <TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead>
                <TableHead>Issue Date</TableHead><TableHead>Due Date</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inv) => (
                <TableRow key={inv.id} className="cursor-pointer" onClick={() => router.push(`/invoices/${inv.id}`)}>
                  <TableCell className="font-mono font-medium">{inv.invoiceNo}</TableCell>
                  <TableCell>{inv.tenant?.shortName || inv.tenant?.name || '—'}</TableCell>
                  <TableCell className="text-sm">{inv.period}</TableCell>
                  <TableCell className="text-right font-medium">{fmtMoney(inv.total, inv.currency)}</TableCell>
                  <TableCell><Badge variant="outline" className={STATUS_COLORS[inv.status] || STATUS_COLORS.draft}>{inv.status.toUpperCase()}</Badge></TableCell>
                  <TableCell className="text-sm">{fmtDate(inv.issuedAt)}</TableCell>
                  <TableCell className="text-sm">{fmtDate(inv.dueAt)}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/invoices/${inv.id}`)} title="View"><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(`/api/invoices/${inv.id}/pdf`, '_blank')} title="Download PDF"><Download className="h-4 w-4" /></Button>
                      {inv.status === 'draft' && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/invoices/${inv.id}/edit`)} title="Edit"><Edit className="h-4 w-4" /></Button>}
                      {(inv.status === 'draft' || inv.status === 'cancelled') && <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setDeleting(inv)} title="Delete"><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete invoice {deleting?.invoiceNo}?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={async () => {
              try { await fetch(`/api/invoices/${deleting!.id}`, { method: 'DELETE', credentials: 'include' }); toast.success('Invoice deleted'); refresh() }
              catch { toast.error('Failed to delete') }
              setDeleting(null)
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// INVOICE FORM — full page (create + edit)
// ═══════════════════════════════════════════════════════════════════════════
export function InvoiceForm({ mode, invoiceId }: { mode: 'create' | 'edit'; invoiceId?: string }) {
  const router = useRouter()
  const { mutate } = useSWRConfig()
  const { data: tenantsData } = useSWR<{ tenants: Tenant[] }>('/api/tenants', fetcher)
  const { data: invoiceData } = useSWR<{ invoice: Invoice }>(invoiceId ? `/api/invoices/${invoiceId}` : null, fetcher)
  const tenants = tenantsData?.tenants || []
  const existing = invoiceData?.invoice

  const [form, setForm] = React.useState({
    tenantId: '', period: '', description: '', contactPerson: '', contactRole: '',
    clientAddress: '', clientEmail: '', currency: 'NGN', taxRate: '0', discountAmount: '0',
    dueAt: '', notes: '', paymentInstructions: '', signatureUrl: '',
  })
  const [lineItems, setLineItems] = React.useState<LineItem[]>([{ description: '', quantity: 1, unitPrice: 0 }])
  const [saving, setSaving] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [loaded, setLoaded] = React.useState(false)

  // Load existing invoice data for edit mode
  React.useEffect(() => {
    if (mode === 'edit' && existing && !loaded) {
      let items: LineItem[] = []
      try { items = JSON.parse(existing.lineItems || '[]') } catch { items = [] }
      if (items.length === 0) items = [{ description: '', quantity: 1, unitPrice: 0 }]
      setLineItems(items)
      setForm({
        tenantId: existing.tenantId, period: existing.period, description: existing.description || '',
        contactPerson: existing.contactPerson || '', contactRole: existing.contactRole || '',
        clientAddress: existing.clientAddress || '', clientEmail: existing.clientEmail || '',
        currency: existing.currency, taxRate: String(existing.taxRate), discountAmount: String(existing.discountAmount),
        dueAt: existing.dueAt?.split('T')[0] || '', notes: existing.notes || '',
        paymentInstructions: existing.paymentInstructions || '', signatureUrl: existing.signatureUrl || '',
      })
      setLoaded(true)
    }
  }, [mode, existing, loaded])

  // Auto-fill client details when tenant is selected (create mode)
  React.useEffect(() => {
    if (mode === 'create' && form.tenantId) {
      const t = tenants.find((t) => t.id === form.tenantId)
      if (t) {
        setForm((f) => ({
          ...f,
          contactPerson: f.contactPerson || t.contactName || '',
          clientEmail: f.clientEmail || t.contactEmail || '',
          clientAddress: f.clientAddress || [t.addressLine, t.city, t.state].filter(Boolean).join(', ') || '',
        }))
      }
    }
  }, [form.tenantId, tenants, mode])

  const amount = lineItems.reduce((s, i) => s + (Number(i.quantity) * Number(i.unitPrice)), 0)
  const discount = Number(form.discountAmount) || 0
  const tax = Number(form.taxRate) || 0
  const taxAmount = (amount - discount) * (tax / 100)
  const total = amount - discount + taxAmount

  function updateItem(idx: number, field: keyof LineItem, value: string) {
    setLineItems((items) => items.map((it, i) => i === idx ? { ...it, [field]: field === 'description' ? value : Number(value) } : it))
  }
  function addItem() { setLineItems((items) => [...items, { description: '', quantity: 1, unitPrice: 0 }]) }
  function removeItem(idx: number) { setLineItems((items) => items.filter((_, i) => i !== idx)) }

  async function uploadSignature(file: File) {
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const r = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'include' })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Upload failed')
      setForm((f) => ({ ...f, signatureUrl: data.url }))
      toast.success('Signature uploaded')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Upload failed') }
    finally { setUploading(false) }
  }

  async function handleSave(status?: string) {
    if (!form.tenantId) { toast.error('Select a tenant'); return }
    if (!form.period) { toast.error('Enter a period'); return }
    if (lineItems.length === 0 || lineItems.every((i) => !i.description)) { toast.error('Add at least one line item'); return }
    setSaving(true)
    try {
      const payload = { ...form, lineItems: lineItems.filter((i) => i.description), status: status || 'draft' }
      const r = await fetch(mode === 'edit' ? `/api/invoices/${invoiceId}` : '/api/invoices', {
        method: mode === 'edit' ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Failed')
      toast.success(mode === 'edit' ? 'Invoice updated' : 'Invoice created')
      mutate('/api/invoices')
      router.push(`/invoices/${data.invoice.id}`)
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/invoices')}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
        <div><h1 className="text-xl font-bold">{mode === 'edit' ? 'Edit Invoice' : 'Create Invoice'}</h1></div>
      </div>

      {/* Client Details */}
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Building2 className="h-4 w-4" /> Client Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Institution / Tenant *</Label>
            <Select value={form.tenantId} onValueChange={(v) => setForm((f) => ({ ...f, tenantId: v }))} disabled={mode === 'edit'}>
              <SelectTrigger><SelectValue placeholder="Select tenant" /></SelectTrigger>
              <SelectContent>{tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.shortName} — {t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Contact Person</Label><Input value={form.contactPerson} onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))} placeholder="e.g. Dean, Bursar" /></div>
          <div><Label>Contact Role</Label><Input value={form.contactRole} onChange={(e) => setForm((f) => ({ ...f, contactRole: e.target.value }))} placeholder="e.g. Bursar" /></div>
          <div><Label>Official Email</Label><Input type="email" value={form.clientEmail} onChange={(e) => setForm((f) => ({ ...f, clientEmail: e.target.value }))} placeholder="bursary@university.edu.ng" /></div>
        </div>
        <div><Label>Official Address</Label><Textarea value={form.clientAddress} onChange={(e) => setForm((f) => ({ ...f, clientAddress: e.target.value }))} rows={2} placeholder="Address line, City, State" /></div>
      </Card>

      {/* Invoice Metadata */}
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><FileTextIcon className="h-4 w-4" /> Invoice Metadata</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Period / Description *</Label><Input value={form.period} onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))} placeholder="e.g. 2026 Annual License" /></div>
          <div><Label>Due Date</Label><Input type="date" value={form.dueAt} onChange={(e) => setForm((f) => ({ ...f, dueAt: e.target.value }))} /></div>
        </div>
        <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="Invoice description..." /></div>
      </Card>

      {/* Line Items */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between"><h2 className="font-semibold">Line Items</h2><Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Add</Button></div>
        <div className="space-y-2">
          {lineItems.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <Input className="col-span-6" placeholder="Item description" value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} />
              <Input className="col-span-2" type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} />
              <Input className="col-span-3" type="number" placeholder="Unit Price" value={item.unitPrice} onChange={(e) => updateItem(i, 'unitPrice', e.target.value)} />
              <Button variant="ghost" size="icon" className="col-span-1 text-red-500" onClick={() => removeItem(i)}><X className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Financial Calculations */}
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4" /> Financial Calculations</h2>
        <div className="grid grid-cols-3 gap-4">
          <div><Label>Currency</Label>
            <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="NGN">NGN (₦)</SelectItem><SelectItem value="USD">USD ($)</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Tax Rate (%)</Label><Input type="number" value={form.taxRate} onChange={(e) => setForm((f) => ({ ...f, taxRate: e.target.value }))} placeholder="0" /></div>
          <div><Label>Discount ({form.currency === 'USD' ? '$' : '₦'})</Label><Input type="number" value={form.discountAmount} onChange={(e) => setForm((f) => ({ ...f, discountAmount: e.target.value }))} placeholder="0" /></div>
        </div>
        <div className="bg-muted/30 rounded-lg p-4 space-y-1">
          <div className="flex justify-between text-sm"><span>Subtotal:</span><span>{fmtMoney(amount, form.currency)}</span></div>
          {discount > 0 && <div className="flex justify-between text-sm"><span>Discount:</span><span>- {fmtMoney(discount, form.currency)}</span></div>}
          {taxAmount > 0 && <div className="flex justify-between text-sm"><span>Tax ({tax}%):</span><span>{fmtMoney(taxAmount, form.currency)}</span></div>}
          <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2"><span>Grand Total:</span><span>{fmtMoney(total, form.currency)}</span></div>
        </div>
      </Card>

      {/* Payment Instructions */}
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Payment Instructions</h2>
        <Textarea value={form.paymentInstructions} onChange={(e) => setForm((f) => ({ ...f, paymentInstructions: e.target.value }))} rows={3} placeholder="Bank: SSM Limited, Account: 0123456789, Sort: 123456&#10;Or: Pay via Flutterwave link: https://..." />
      </Card>

      {/* Notes */}
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Notes / Memo</h2>
        <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} placeholder="e.g. Interim infrastructure sustenance prior to formal agreement" />
      </Card>

      {/* Signature */}
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Authorized Signature</h2>
        <div className="flex items-center gap-3">
          {form.signatureUrl && <img src={form.signatureUrl} alt="signature" className="h-12 w-auto border rounded" />}
          <label className="cursor-pointer">
            <Button variant="outline" size="sm" asChild disabled={uploading}><span><Upload className="h-3 w-3 mr-1" /> {uploading ? 'Uploading...' : 'Upload'}</span></Button>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadSignature(f); e.target.value = '' }} />
          </label>
          {form.signatureUrl && <Button variant="ghost" size="sm" onClick={() => setForm((f) => ({ ...f, signatureUrl: '' }))}>Remove</Button>}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => router.push('/invoices')}>Cancel</Button>
        <Button variant="outline" onClick={() => handleSave('draft')} disabled={saving}>Save as Draft</Button>
        <Button onClick={() => handleSave('sent')} disabled={saving}>{saving ? 'Saving...' : mode === 'edit' ? 'Update & Send' : 'Create & Send'}</Button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// INVOICE DETAIL — full page
// ═══════════════════════════════════════════════════════════════════════════
export function InvoiceDetail({ invoiceId }: { invoiceId: string }) {
  const router = useRouter()
  const { mutate } = useSWRConfig()
  const { data, isLoading } = useSWR<{ invoice: Invoice }>(`/api/invoices/${invoiceId}`, fetcher)
  const [markPaidOpen, setMarkPaidOpen] = React.useState(false)
  const [method, setMethod] = React.useState('bank_transfer')
  const [reference, setReference] = React.useState('')

  const invoice = data?.invoice
  if (isLoading) return <div className="p-6 space-y-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
  if (!invoice) return <div className="p-6 text-center text-muted-foreground">Invoice not found</div>

  let lineItems: LineItem[] = []
  try { lineItems = JSON.parse(invoice.lineItems || '[]') } catch { lineItems = [] }

  async function updateStatus(status: string, extra?: Record<string, unknown>) {
    try {
      const r = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...extra }), credentials: 'include',
      })
      if (!r.ok) throw new Error('Failed')
      toast.success(`Invoice marked as ${status}`)
      mutate(`/api/invoices/${invoiceId}`); mutate('/api/invoices')
    } catch { toast.error('Failed') }
  }

  async function handleMarkPaid() {
    await updateStatus('paid', { method, reference: reference || null })
    setMarkPaidOpen(false)
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/invoices')}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
          <div><h1 className="text-xl font-bold">{invoice.invoiceNo}</h1></div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open(`/api/invoices/${invoiceId}/pdf`, '_blank')}><Download className="h-4 w-4 mr-2" /> Download PDF</Button>
          {invoice.status === 'draft' && <Button size="sm" onClick={() => router.push(`/invoices/${invoiceId}/edit`)}><Edit className="h-4 w-4 mr-2" /> Edit</Button>}
        </div>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-3">
        <Badge variant="outline" className={STATUS_COLORS[invoice.status] || STATUS_COLORS.draft + ' text-sm'}>{invoice.status.toUpperCase()}</Badge>
        <span className="text-sm text-muted-foreground">Created {fmtDate(invoice.issuedAt)} · Due {fmtDate(invoice.dueAt)}</span>
      </div>

      {/* Status actions */}
      <div className="flex gap-2 flex-wrap">
        {invoice.status === 'draft' && <Button size="sm" onClick={() => updateStatus('sent')}>Send Invoice</Button>}
        {(invoice.status === 'sent' || invoice.status === 'pending' || invoice.status === 'overdue') && <>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setMarkPaidOpen(true)}>Mark as Paid</Button>
          <Button variant="outline" size="sm" onClick={() => updateStatus('overdue')}>Mark Overdue</Button>
        </>}
        {(invoice.status !== 'paid' && invoice.status !== 'cancelled') && <Button variant="outline" size="sm" onClick={() => updateStatus('cancelled')}>Cancel Invoice</Button>}
      </div>

      {/* Client + Invoice info */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-6">
          <div className="text-xs text-muted-foreground mb-2 font-semibold">BILL TO</div>
          <div className="font-semibold text-lg">{invoice.tenant?.name}</div>
          {invoice.contactPerson && <div className="text-sm">{invoice.contactPerson}{invoice.contactRole ? ` (${invoice.contactRole})` : ''}</div>}
          {invoice.clientEmail && <div className="text-sm text-muted-foreground">{invoice.clientEmail}</div>}
          {invoice.clientAddress && <div className="text-sm text-muted-foreground">{invoice.clientAddress}</div>}
        </Card>
        <Card className="p-6 space-y-2">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Invoice #:</span><span className="font-mono font-medium">{invoice.invoiceNo}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Period:</span><span>{invoice.period}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Issue Date:</span><span>{fmtDate(invoice.issuedAt)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Due Date:</span><span>{fmtDate(invoice.dueAt)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Currency:</span><span>{invoice.currency}</span></div>
        </Card>
      </div>

      {invoice.description && <Card className="p-6"><div className="text-xs text-muted-foreground mb-1 font-semibold">DESCRIPTION</div><div className="text-sm">{invoice.description}</div></Card>}

      {/* Line items */}
      {lineItems.length > 0 && (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Description</TableHead><TableHead className="text-center">Qty</TableHead><TableHead className="text-right">Unit Price</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
            <TableBody>
              {lineItems.map((item, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">{item.description}</TableCell>
                  <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                  <TableCell className="text-right text-sm">{fmtMoney(item.unitPrice, invoice.currency)}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{fmtMoney(item.quantity * item.unitPrice, invoice.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Totals */}
      <Card className="p-6 space-y-1">
        <div className="flex justify-between text-sm"><span>Subtotal:</span><span>{fmtMoney(invoice.amount, invoice.currency)}</span></div>
        {invoice.discountAmount > 0 && <div className="flex justify-between text-sm"><span>Discount:</span><span>- {fmtMoney(invoice.discountAmount, invoice.currency)}</span></div>}
        {invoice.taxAmount > 0 && <div className="flex justify-between text-sm"><span>Tax ({invoice.taxRate}%):</span><span>{fmtMoney(invoice.taxAmount, invoice.currency)}</span></div>}
        <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>Grand Total:</span><span>{fmtMoney(invoice.total, invoice.currency)}</span></div>
      </Card>

      {/* Payment instructions */}
      {invoice.paymentInstructions && <Card className="p-6"><div className="text-xs text-muted-foreground mb-1 font-semibold">PAYMENT INSTRUCTIONS</div><div className="text-sm whitespace-pre-wrap">{invoice.paymentInstructions}</div></Card>}

      {/* Payment info (if paid) */}
      {invoice.status === 'paid' && (
        <Card className="p-6 bg-emerald-50 border-emerald-200">
          <div className="text-sm font-medium text-emerald-800">Payment Received</div>
          <div className="text-sm">Method: {invoice.method || '—'}</div>
          {invoice.reference && <div className="text-sm">Reference: {invoice.reference}</div>}
          <div className="text-sm">Paid on: {fmtDate(invoice.paidAt)}</div>
        </Card>
      )}

      {/* Signature */}
      {invoice.signatureUrl && <Card className="p-6"><div className="text-xs text-muted-foreground mb-1 font-semibold">AUTHORIZED SIGNATORY</div><img src={invoice.signatureUrl} alt="signature" className="h-14 w-auto" /><div className="text-xs text-muted-foreground mt-1">SSM Limited</div></Card>}

      {/* Notes */}
      {invoice.notes && <Card className="p-6"><div className="text-xs text-muted-foreground mb-1 font-semibold">NOTES</div><div className="text-sm">{invoice.notes}</div></Card>}

      {/* Mark Paid dialog */}
      <AlertDialog open={markPaidOpen} onOpenChange={setMarkPaidOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Mark {invoice.invoiceNo} as Paid</AlertDialogTitle></AlertDialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Payment Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="flutterwave">Flutterwave</SelectItem>
                  <SelectItem value="paystack">Paystack</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Payment Reference (optional)</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transaction ID / receipt no" /></div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-emerald-600 hover:bg-emerald-700" onClick={handleMarkPaid}>Mark as Paid</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
