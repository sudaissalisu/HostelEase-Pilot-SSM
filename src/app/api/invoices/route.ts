import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const invoices = await db.invoice.findMany({ orderBy: { issuedAt: 'desc' }, include: { tenant: { select: { name: true, shortName: true } } } })
  return NextResponse.json({ invoices })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { tenantId, amount, period, dueAt } = body
  if (!tenantId || !amount || !period) return NextResponse.json({ error: 'tenantId, amount, period required' }, { status: 400 })

  const count = await db.invoice.count()
  const invoiceNo = `INV-2026-${String(count + 1).padStart(3, '0')}`

  const invoice = await db.invoice.create({
    data: {
      tenantId, invoiceNo, amount: parseFloat(amount), period,
      status: 'pending',
      dueAt: dueAt ? new Date(dueAt) : null,
      createdById: session.userId,
    },
  })
  return NextResponse.json({ invoice })
}
