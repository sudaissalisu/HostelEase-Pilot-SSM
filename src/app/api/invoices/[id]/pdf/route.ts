import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { generateInvoicePdf } from '@/lib/invoice-pdf'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(
  req: Request,
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

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generateInvoicePdf(
      { invoice },
      { appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001' }
    )
  } catch (err) {
    console.error('[invoices/pdf] generation failed:', err)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Invoice-${invoice.invoiceNo}.pdf"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Length': String(pdfBuffer.length),
    },
  })
}
