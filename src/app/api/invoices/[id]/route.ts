import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { logAction } from '@/lib/audit'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const invoice = await db.invoice.findUnique({
    where: { id },
    include: {
      tenant: { select: { name: true, shortName: true, contactName: true, contactEmail: true, contactPhone: true, addressLine: true, city: true, state: true, country: true } },
      createdBy: { select: { name: true } },
    },
  })
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  return NextResponse.json({ invoice })
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const existing = await db.invoice.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const body = await req.json()
  const {
    description, contactPerson, contactRole, clientAddress, clientEmail,
    lineItems, taxRate, discountAmount, currency, period, dueAt, notes,
    paymentInstructions, signatureUrl, status, paidAt, method, reference,
  } = body

  const data: Record<string, unknown> = {}
  if (description !== undefined) data.description = description || null
  if (contactPerson !== undefined) data.contactPerson = contactPerson || null
  if (contactRole !== undefined) data.contactRole = contactRole || null
  if (clientAddress !== undefined) data.clientAddress = clientAddress || null
  if (clientEmail !== undefined) data.clientEmail = clientEmail || null
  if (currency !== undefined) data.currency = currency || 'NGN'
  if (lineItems !== undefined) {
    const items = Array.isArray(lineItems) ? lineItems : []
    data.lineItems = JSON.stringify(items)
    data.amount = items.reduce((s: number, i: { quantity: number; unitPrice: number }) => s + (Number(i.quantity) * Number(i.unitPrice)), 0)
  }
  if (taxRate !== undefined) data.taxRate = Number(taxRate) || 0
  if (discountAmount !== undefined) data.discountAmount = Number(discountAmount) || 0
  if (period !== undefined) data.period = period
  if (dueAt !== undefined) data.dueAt = dueAt ? new Date(dueAt) : null
  if (notes !== undefined) data.notes = notes || null
  if (paymentInstructions !== undefined) data.paymentInstructions = paymentInstructions || null
  if (signatureUrl !== undefined) data.signatureUrl = signatureUrl || null
  if (status !== undefined) {
    data.status = status
    if (status === 'paid' && !existing.paidAt) data.paidAt = new Date()
  }
  if (paidAt !== undefined) data.paidAt = paidAt ? new Date(paidAt) : null
  if (method !== undefined) data.method = method || null
  if (reference !== undefined) data.reference = reference || null

  // Recompute tax + total if amount/tax/discount changed
  const newAmount = (data.amount as number) ?? existing.amount
  const newDiscount = (data.discountAmount as number) ?? existing.discountAmount
  const newTaxRate = (data.taxRate as number) ?? existing.taxRate
  data.taxAmount = (newAmount - newDiscount) * (newTaxRate / 100)
  data.total = newAmount - newDiscount + (data.taxAmount as number)

  const invoice = await db.invoice.update({ where: { id }, data, include: { tenant: { select: { name: true } } } })

  await logAction({
    actorId: session.userId,
    action: 'INVOICE_UPDATED',
    entityType: 'INVOICE',
    entityId: id,
    summary: `Invoice ${existing.invoiceNo} updated — status: ${status || existing.status}`,
  })

  return NextResponse.json({ invoice })
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const existing = await db.invoice.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  if (!['draft', 'cancelled'].includes(existing.status)) {
    return NextResponse.json({ error: 'Can only delete draft or cancelled invoices' }, { status: 400 })
  }

  await db.invoice.delete({ where: { id } })

  await logAction({
    actorId: session.userId,
    action: 'INVOICE_DELETED',
    entityType: 'INVOICE',
    entityId: id,
    summary: `Invoice ${existing.invoiceNo} deleted`,
  })

  return NextResponse.json({ success: true })
}
