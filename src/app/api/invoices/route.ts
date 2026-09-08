import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { logAction } from '@/lib/audit'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const where = status ? { status } : {}
  const invoices = await db.invoice.findMany({
    where,
    orderBy: { issuedAt: 'desc' },
    include: {
      tenant: { select: { name: true, shortName: true, contactName: true, contactEmail: true, contactPhone: true, addressLine: true, city: true, state: true, country: true } },
      createdBy: { select: { name: true } },
    },
  })
  return NextResponse.json({ invoices })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    tenantId, description, contactPerson, contactRole, clientAddress, clientEmail,
    lineItems, taxRate, discountAmount, currency, period, dueAt, notes,
    paymentInstructions, signatureUrl, status,
  } = body

  if (!tenantId || !period) {
    return NextResponse.json({ error: 'tenantId and period are required' }, { status: 400 })
  }

  // Parse + compute line items
  const items: Array<{ description: string; quantity: number; unitPrice: number }> = Array.isArray(lineItems) ? lineItems : []
  const amount = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0)
  const discount = Number(discountAmount) || 0
  const tax = Number(taxRate) || 0
  const taxAmount = (amount - discount) * (tax / 100)
  const total = amount - discount + taxAmount

  // Generate invoice number
  const count = await db.invoice.count()
  const year = new Date().getFullYear()
  const invoiceNo = `INV-${year}-${String(count + 1).padStart(3, '0')}`

  const invoice = await db.invoice.create({
    data: {
      tenantId,
      invoiceNo,
      description: description || null,
      contactPerson: contactPerson || null,
      contactRole: contactRole || null,
      clientAddress: clientAddress || null,
      clientEmail: clientEmail || null,
      lineItems: JSON.stringify(items),
      amount,
      currency: currency || 'NGN',
      taxRate: tax,
      taxAmount,
      discountAmount: discount,
      total,
      status: status || 'draft',
      period,
      dueAt: dueAt ? new Date(dueAt) : null,
      notes: notes || null,
      paymentInstructions: paymentInstructions || null,
      signatureUrl: signatureUrl || null,
      createdById: session.userId,
    },
    include: { tenant: { select: { name: true, shortName: true } } },
  })

  await logAction({
    actorId: session.userId,
    action: 'INVOICE_CREATED',
    entityType: 'INVOICE',
    entityId: invoice.id,
    summary: `Invoice ${invoiceNo} created for ${invoice.tenant?.name || tenantId} — ${period} — ${currency || 'NGN'} ${total.toLocaleString()}`,
  })

  return NextResponse.json({ invoice })
}
