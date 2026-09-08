'use client'

import * as React from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import {
  Receipt, Plus, RefreshCw, Download, Eye, Edit, Trash2, Search,
  FileText, X, Image as ImageIcon, Upload,
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) =>
    r.ok ? r.json() : Promise.reject(new Error('Failed to fetch'))
  )

interface LineItem { description: string; quantity: number; unitPrice: number }
interface Tenant { id: string; name: string; shortName: string }
interface Invoice {
  id: string
  invoiceNo: string
  tenantId: string
  tenant: Tenant & { contactName?: string | null; contactEmail?: string | null; contactPhone?: string | null; addressLine?: string | null; city?: string | null; state?: string | null; country?: string }
  description: string | null
  lineItems: string | null
  amount: number
  taxRate: number
  taxAmount: number
  discountAmount: number
  total: number
  status: string
  period: string
  issuedAt: string
  dueAt: string | null
  paidAt: string | null
  method: string | null
  reference: string | null
  notes: string | null
  signatureUrl: string | null
  createdBy: { name: string } | null
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-300',
  pending: 'bg-amber-50 text-amber-700 border-amber-300',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  overdue: 'bg-red-50 text-red-700 border-red-300',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-300',
}

function fmtMoney(n: number) {
  return `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function InvoiceManager() {
  const { mutate } = useSWRConfig()
  const { data, isLoading } = useSWR<{ invoices: Invoice[] }>('/api/invoices', fetcher)
  const { data: tenantsData } = useSWR<{ tenants: Tenant[] }>('/api/tenants', fetcher)

  const [statusFilter, setStatusFilter] = React.useState('ALL')
  const [search, setSearch] = React.useState('')
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Invoice | null>(null)
  const [viewing, setViewing] = React.useState<Invoice | null>(null)
  const [deleting, setDeleting] = React.useState<Invoice | null>(null)
  const [markPaid, setMarkPaid] = React.useState<Invoice | null>(null)

  const invoices = data?.invoices || []
  const tenants = tenantsData?.tenants || []

  const filtered = invoices.filter((inv) => {
    if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        inv.invoiceNo.toLowerCase().includes(q) ||
        inv.tenant?.name?.toLowerCase().includes(q) ||
        inv.period?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const stats = {
    total: invoices.length,
    pending: invoices.filter((i) => i.status === 'pending').length,
    paid: invoices.filter((i) => i.status === 'paid').length,
    overdue: invoices.filter((i) => i.status === 'overdue').length,
  }

  function refresh() { mutate('/api/invoices') }

  function handleDownloadPDF(invoice: Invoice) {
    toast.promise(
      fetch(`/api/invoices/${invoice.id}/pdf`, { credentials: 'include' })
        .then((r) => r.blob())
        .then((blob) => {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `Invoice-${invoice.invoiceNo}.pdf`
          a.click()
          URL.revokeObjectURL(url)
        }),
      { loading: 'Generating PDF...', success: 'Downloaded', error: 'Failed' }
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
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
          <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Create Invoice
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Total Invoices</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
          <div className="text-xs text-muted-foreground">Pending</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-emerald-600">{stats.paid}</div>
          <div className="text-xs text-muted-foreground">Paid</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
          <div className="text-xs text-muted-foreground">Overdue</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by invoice no, tenant, or period..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No invoices found. Create your first invoice to get started.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono font-medium">{inv.invoiceNo}</TableCell>
                  <TableCell>{inv.tenant?.shortName || inv.tenant?.name || '—'}</TableCell>
                  <TableCell className="text-sm">{inv.period}</TableCell>
                  <TableCell className="text-right font-medium">{fmtMoney(inv.total)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_COLORS[inv.status] || STATUS_COLORS.draft}>
                      {inv.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{fmtDate(inv.issuedAt)}</TableCell>
                  <TableCell className="text-sm">{fmtDate(inv.dueAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewing(inv)} title="View">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownloadPDF(inv)} title="Download PDF">
                        <Download className="h-4 w-4" />
                      </Button>
                      {inv.status === 'draft' && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(inv)} title="Edit">
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {(inv.status === 'draft' || inv.status === 'cancelled') && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setDeleting(inv)} title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Create / Edit Dialog */}
      {(createOpen || editing) && (
        <InvoiceFormDialog
          invoice={editing}
          tenants={tenants}
          onClose={() => { setCreateOpen(false); setEditing(null) }}
          onSaved={() => { refresh(); setCreateOpen(false); setEditing(null) }}
        />
      )}

      {/* View Sheet */}
      {viewing && (
        <InvoiceViewSheet
          invoice={viewing}
          onClose={() => setViewing(null)}
          onDownload={() => handleDownloadPDF(viewing)}
          onMarkPaid={() => { setMarkPaid(viewing); setViewing(null) }}
          onRefresh={refresh}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete invoice {deleting?.invoiceNo}?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The invoice will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                try {
                  const r = await fetch(`/api/invoices/${deleting!.id}`, { method: 'DELETE', credentials: 'include' })
                  if (!r.ok) throw new Error('Failed')
                  toast.success('Invoice deleted')
                  refresh()
                } catch { toast.error('Failed to delete') }
                setDeleting(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mark Paid dialog */}
      {markPaid && (
        <MarkPaidDialog
          invoice={markPaid}
          onClose={() => setMarkPaid(null)}
          onSaved={() => { refresh(); setMarkPaid(null) }}
        />
      )}
    </div>
  )
}

// ─── Invoice Form Dialog (Create / Edit) ───────────────────────────────────
function InvoiceFormDialog({
  invoice, tenants, onClose, onSaved,
}: {
  invoice: Invoice | null
  tenants: Tenant[]
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!invoice

  const [tenantId, setTenantId] = React.useState(invoice?.tenantId || '')
  const [period, setPeriod] = React.useState(invoice?.period || '')
  const [description, setDescription] = React.useState(invoice?.description || '')
  const [dueAt, setDueAt] = React.useState(invoice?.dueAt?.split('T')[0] || '')
  const [notes, setNotes] = React.useState(invoice?.notes || '')
  const [taxRate, setTaxRate] = React.useState(String(invoice?.taxRate || 0))
  const [discountAmount, setDiscountAmount] = React.useState(String(invoice?.discountAmount || 0))
  const [lineItems, setLineItems] = React.useState<LineItem[]>(() => {
    try { return JSON.parse(invoice?.lineItems || '[]') } catch { return [{ description: '', quantity: 1, unitPrice: 0 }] }
  })
  const [saving, setSaving] = React.useState(false)
  const [signatureUrl, setSignatureUrl] = React.useState(invoice?.signatureUrl || '')
  const [uploading, setUploading] = React.useState(false)

  const amount = lineItems.reduce((s, i) => s + (Number(i.quantity) * Number(i.unitPrice)), 0)
  const discount = Number(discountAmount) || 0
  const tax = Number(taxRate) || 0
  const taxAmount = (amount - discount) * (tax / 100)
  const total = amount - discount + taxAmount

  function updateItem(idx: number, field: keyof LineItem, value: string) {
    setLineItems((items) => items.map((it, i) =>
      i === idx ? { ...it, [field]: field === 'description' ? value : Number(value) } : it
    ))
  }
  function addItem() { setLineItems((items) => [...items, { description: '', quantity: 1, unitPrice: 0 }]) }
  function removeItem(idx: number) { setLineItems((items) => items.filter((_, i) => i !== idx)) }

  async function uploadSignature(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'include' })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Upload failed')
      setSignatureUrl(data.url)
      toast.success('Signature uploaded')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    } finally { setUploading(false) }
  }

  async function handleSave() {
    if (!tenantId) { toast.error('Select a tenant'); return }
    if (!period) { toast.error('Enter a period'); return }
    if (lineItems.length === 0 || lineItems.every((i) => !i.description)) { toast.error('Add at least one line item'); return }

    setSaving(true)
    try {
      const payload = {
        tenantId, period, description, dueAt: dueAt || null, notes,
        taxRate: Number(taxRate) || 0, discountAmount: Number(discountAmount) || 0,
        lineItems: lineItems.filter((i) => i.description),
        signatureUrl: signatureUrl || null,
      }
      const r = await fetch(
        isEdit ? `/api/invoices/${invoice!.id}` : '/api/invoices',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'include',
        }
      )
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Failed')
      toast.success(isEdit ? 'Invoice updated' : 'Invoice created')
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally { setSaving(false) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${invoice?.invoiceNo}` : 'Create Invoice'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Tenant + Period */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tenant *</Label>
              <Select value={tenantId} onValueChange={setTenantId} disabled={isEdit}>
                <SelectTrigger><SelectValue placeholder="Select tenant" /></SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.shortName} — {t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Period *</Label>
              <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="e.g. 2026 Annual License" />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Invoice description..." rows={2} />
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Line Items</Label>
              <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Add</Button>
            </div>
            <div className="space-y-2">
              {lineItems.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <Input className="col-span-6" placeholder="Description" value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} />
                  <Input className="col-span-2" type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} />
                  <Input className="col-span-3" type="number" placeholder="Unit Price" value={item.unitPrice} onChange={(e) => updateItem(i, 'unitPrice', e.target.value)} />
                  <Button variant="ghost" size="icon" className="col-span-1 text-red-500" onClick={() => removeItem(i)}><X className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          </div>

          {/* Tax + Discount + Due Date */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Tax Rate (%)</Label>
              <Input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>Discount (₦)</Label>
              <Input type="number" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            </div>
          </div>

          {/* Totals */}
          <Card className="p-4 bg-muted/30">
            <div className="flex justify-between text-sm"><span>Subtotal:</span><span>{fmtMoney(amount)}</span></div>
            {discount > 0 && <div className="flex justify-between text-sm"><span>Discount:</span><span>- {fmtMoney(discount)}</span></div>}
            {taxAmount > 0 && <div className="flex justify-between text-sm"><span>Tax ({tax}%):</span><span>{fmtMoney(taxAmount)}</span></div>}
            <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2"><span>Total:</span><span>{fmtMoney(total)}</span></div>
          </Card>

          {/* Signature upload */}
          <div>
            <Label>Authorized Signature</Label>
            <div className="flex items-center gap-3">
              {signatureUrl && <img src={signatureUrl} alt="signature" className="h-12 w-auto border rounded" />}
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" asChild disabled={uploading}>
                  <span><Upload className="h-3 w-3 mr-1" /> {uploading ? 'Uploading...' : 'Upload'}</span>
                </Button>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadSignature(f); e.target.value = '' }} />
              </label>
              {signatureUrl && <Button variant="ghost" size="sm" onClick={() => setSignatureUrl('')}>Remove</Button>}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes..." rows={2} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Invoice View Sheet ────────────────────────────────────────────────────
function InvoiceViewSheet({
  invoice, onClose, onDownload, onMarkPaid, onRefresh,
}: {
  invoice: Invoice
  onClose: () => void
  onDownload: () => void
  onMarkPaid: () => void
  onRefresh: () => void
}) {
  const [signatureUrl, setSignatureUrl] = React.useState(invoice.signatureUrl || '')
  const [uploading, setUploading] = React.useState(false)

  let lineItems: LineItem[] = []
  try { lineItems = JSON.parse(invoice.lineItems || '[]') } catch { lineItems = [] }

  async function uploadSignature(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'include' })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Upload failed')
      // Save to invoice
      const patchR = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureUrl: data.url }),
        credentials: 'include',
      })
      if (!patchR.ok) throw new Error('Failed to save')
      setSignatureUrl(data.url)
      toast.success('Signature uploaded')
      onRefresh()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Upload failed') }
    finally { setUploading(false) }
  }

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Invoice {invoice.invoiceNo}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          {/* Status badge */}
          <div className="flex items-center justify-between">
            <Badge variant="outline" className={STATUS_COLORS[invoice.status] || STATUS_COLORS.draft}>
              {invoice.status.toUpperCase()}
            </Badge>
            <Button variant="outline" size="sm" onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" /> Download PDF
            </Button>
          </div>

          {/* Tenant info */}
          <Card className="p-4">
            <div className="text-xs text-muted-foreground mb-1">BILL TO</div>
            <div className="font-semibold">{invoice.tenant?.name}</div>
            {invoice.tenant?.contactName && <div className="text-sm">{invoice.tenant.contactName}</div>}
            {invoice.tenant?.contactEmail && <div className="text-sm">{invoice.tenant.contactEmail}</div>}
            {invoice.tenant?.addressLine && <div className="text-sm">{invoice.tenant.addressLine}</div>}
            {(invoice.tenant?.city || invoice.tenant?.state) && (
              <div className="text-sm">{[invoice.tenant?.city, invoice.tenant?.state].filter(Boolean).join(', ')}</div>
            )}
          </Card>

          {/* Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Period:</span> {invoice.period}</div>
            <div><span className="text-muted-foreground">Issued:</span> {fmtDate(invoice.issuedAt)}</div>
            <div><span className="text-muted-foreground">Due:</span> {fmtDate(invoice.dueAt)}</div>
            <div><span className="text-muted-foreground">Paid:</span> {fmtDate(invoice.paidAt)}</div>
          </div>

          {invoice.description && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">DESCRIPTION</div>
              <div className="text-sm">{invoice.description}</div>
            </div>
          )}

          {/* Line items */}
          {lineItems.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{item.description}</TableCell>
                    <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                    <TableCell className="text-right text-sm">{fmtMoney(item.unitPrice)}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{fmtMoney(item.quantity * item.unitPrice)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Totals */}
          <Card className="p-4 bg-muted/30 space-y-1">
            <div className="flex justify-between text-sm"><span>Subtotal:</span><span>{fmtMoney(invoice.amount)}</span></div>
            {invoice.discountAmount > 0 && <div className="flex justify-between text-sm"><span>Discount:</span><span>- {fmtMoney(invoice.discountAmount)}</span></div>}
            {invoice.taxAmount > 0 && <div className="flex justify-between text-sm"><span>Tax ({invoice.taxRate}%):</span><span>{fmtMoney(invoice.taxAmount)}</span></div>}
            <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>Total:</span><span>{fmtMoney(invoice.total)}</span></div>
          </Card>

          {/* Payment info */}
          {invoice.status === 'paid' && (
            <Card className="p-4 bg-emerald-50 border-emerald-200">
              <div className="text-sm font-medium text-emerald-800">Payment Received</div>
              <div className="text-sm">Method: {invoice.method || '—'}</div>
              {invoice.reference && <div className="text-sm">Reference: {invoice.reference}</div>}
              <div className="text-sm">Paid on: {fmtDate(invoice.paidAt)}</div>
            </Card>
          )}

          {/* Signature */}
          <div>
            <Label>Authorized Signature</Label>
            <div className="flex items-center gap-3 mt-1">
              {signatureUrl ? (
                <img src={signatureUrl} alt="signature" className="h-14 w-auto border rounded p-1" />
              ) : (
                <div className="h-14 w-32 border-2 border-dashed rounded flex items-center justify-center text-xs text-muted-foreground">
                  No signature
                </div>
              )}
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" asChild disabled={uploading}>
                  <span><Upload className="h-3 w-3 mr-1" /> {uploading ? 'Uploading...' : 'Upload'}</span>
                </Button>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadSignature(f); e.target.value = '' }} />
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {invoice.status === 'pending' && (
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={onMarkPaid}>
                Mark as Paid
              </Button>
            )}
            {invoice.status === 'draft' && (
              <Button size="sm" onClick={async () => {
                await fetch(`/api/invoices/${invoice.id}`, {
                  method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'pending' }), credentials: 'include',
                })
                toast.success('Invoice sent'); onRefresh(); onClose()
              }}>Send Invoice</Button>
            )}
            {(invoice.status === 'pending' || invoice.status === 'overdue') && (
              <Button variant="outline" size="sm" onClick={async () => {
                await fetch(`/api/invoices/${invoice.id}`, {
                  method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'cancelled' }), credentials: 'include',
                })
                toast.success('Invoice cancelled'); onRefresh(); onClose()
              }}>Cancel Invoice</Button>
            )}
          </div>

          {invoice.notes && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">NOTES</div>
              <div className="text-sm">{invoice.notes}</div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Mark Paid Dialog ──────────────────────────────────────────────────────
function MarkPaidDialog({
  invoice, onClose, onSaved,
}: {
  invoice: Invoice
  onClose: () => void
  onSaved: () => void
}) {
  const [method, setMethod] = React.useState('bank_transfer')
  const [reference, setReference] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const r = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid', method, reference: reference || null }),
        credentials: 'include',
      })
      if (!r.ok) throw new Error('Failed')
      toast.success('Invoice marked as paid')
      onSaved()
    } catch { toast.error('Failed') }
    finally { setSaving(false) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark {invoice.invoiceNo} as Paid</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Payment Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="paystack">Paystack</SelectItem>
                <SelectItem value="flutterwave">Flutterwave</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Payment Reference (optional)</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transaction ID / receipt no" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? 'Saving...' : 'Mark as Paid'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
