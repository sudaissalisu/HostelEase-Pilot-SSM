/**
 * SSM Invoice PDF Generator
 *
 * Generates branded invoices for SSM Limited → tenants (schools).
 * SSM branding at top (logo, email, Kano Nigeria address).
 * Supports line items, tax, discount, signature image.
 */
import PDFDocument from 'pdfkit'
import type { Invoice } from '@prisma/client'

// Softened emerald palette
const C = {
  emerald900: '#14543e',
  emerald800: '#1a6b50',
  emerald700: '#2d8a6a',
  emerald600: '#4aa884',
  emerald500: '#6cc0a0',
  emerald400: '#9dd6bd',
  emerald200: '#c8e8d8',
  emerald100: '#e0f2ea',
  emerald50: '#f0f8f4',
  amber700: '#9a6b1a',
  amber500: '#d4a843',
  amber50: '#fefbf3',
  amberBorder: '#f0deb0',
  red700: '#a04040',
  red100: '#fce8e8',
  textDark: '#1a2530',
  textBody: '#2d3845',
  textMuted: '#6b7785',
  textSubtle: '#9ca5b0',
  borderGrey: '#e8ecee',
  rowTint: '#fafcfb',
  white: '#ffffff',
}

interface LineItem {
  description: string
  quantity: number
  unitPrice: number
}

interface InvoicePdfData {
  invoice: Invoice & {
    tenant?: {
      name: string
      shortName: string
      contactName?: string | null
      contactEmail?: string | null
      contactPhone?: string | null
      addressLine?: string | null
      city?: string | null
      state?: string | null
      country?: string
    }
    createdBy?: { name: string } | null
  }
}

async function fetchImageBuffer(url: string, appUrl?: string): Promise<Buffer | null> {
  if (!url) return null
  if (url.startsWith('data:')) {
    const commaIdx = url.indexOf(',')
    if (commaIdx === -1) return null
    const meta = url.slice(0, commaIdx)
    const data = url.slice(commaIdx + 1)
    if (!meta.includes('base64')) return null
    try { return Buffer.from(data, 'base64') } catch { return null }
  }
  let fullUrl = url
  if (!/^https?:\/\//i.test(url)) {
    fullUrl = `${appUrl || 'http://localhost:3001'}${url.startsWith('/') ? '' : '/'}${url}`
  }
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    try {
      const res = await fetch(fullUrl, { signal: controller.signal })
      if (!res.ok) return null
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length < 16) return null
      return buf
    } finally { clearTimeout(timeout) }
  } catch { return null }
}

function fmtMoney(n: number): string {
  return `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(d: Date | string | null): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function truncate(doc: PDFKit.PDFDocument, text: string, maxWidth: number): string {
  if (doc.widthOfString(text) <= maxWidth) return text
  let t = text
  while (t.length > 0 && doc.widthOfString(t + '…') > maxWidth) t = t.slice(0, -1)
  return t + '…'
}

export async function generateInvoicePdf(
  data: InvoicePdfData,
  options?: { ssmLogoUrl?: string; appUrl?: string }
): Promise<Buffer> {
  const { invoice } = data
  const tenant = invoice.tenant
  const ssmLogoBuf = await fetchImageBuffer(options?.ssmLogoUrl || '', options?.appUrl)
  const signatureBuf = await fetchImageBuffer(invoice.signatureUrl || '', options?.appUrl)

  // Parse line items
  let lineItems: LineItem[] = []
  try { lineItems = JSON.parse(invoice.lineItems || '[]') } catch { lineItems = [] }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      bufferPages: true,
    })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    try {
      const pageWidth = doc.page.width
      const pageHeight = doc.page.height
      const margin = 50
      const contentW = pageWidth - margin * 2

      // ── HEADER: SSM Limited branding (left) + logo (right) ──
      const logoSize = 50
      const logoX = pageWidth - margin - logoSize
      const logoY = 35
      if (ssmLogoBuf) {
        doc.save()
        doc.roundedRect(logoX, logoY, logoSize, logoSize, 6)
        doc.clip()
        try { doc.image(ssmLogoBuf, logoX, logoY, { width: logoSize, height: logoSize }) }
        catch { doc.fillColor(C.emerald100).rect(logoX, logoY, logoSize, logoSize).fill() }
        doc.restore()
      } else {
        // Text logo fallback
        doc.save()
        doc.roundedRect(logoX, logoY, logoSize, logoSize, 6).fillColor(C.emerald700).fill()
        doc.restore()
        doc.fillColor(C.white).font('Helvetica-Bold').fontSize(18)
        doc.text('SSM', logoX, logoY + 14, { width: logoSize, align: 'center' })
      }

      // SSM Limited text (left)
      doc.fillColor(C.emerald900).font('Helvetica-Bold').fontSize(18)
      doc.text('SSM Limited', margin, 35, { width: contentW - logoSize - 20 })
      doc.fillColor(C.textMuted).font('Helvetica').fontSize(9)
      doc.text('support@ssm.com.ng', margin, 58, { width: contentW - logoSize - 20 })
      doc.text('Kano, Nigeria', margin, 70, { width: contentW - logoSize - 20 })

      let y = 100

      // ── INVOICE title + status badge (right) ──
      doc.fillColor(C.emerald900).font('Helvetica-Bold').fontSize(24)
      doc.text('INVOICE', margin, y, { width: contentW, align: 'left' })

      // Status badge
      const statusColors: Record<string, string> = {
        paid: C.emerald600, pending: C.amber500, overdue: C.red700,
        draft: C.textSubtle, cancelled: C.textSubtle,
      }
      const statusLabels: Record<string, string> = {
        paid: 'PAID', pending: 'PENDING', overdue: 'OVERDUE',
        draft: 'DRAFT', cancelled: 'CANCELLED',
      }
      const badgeColor = statusColors[invoice.status] || C.textSubtle
      const badgeLabel = statusLabels[invoice.status] || invoice.status.toUpperCase()
      const badgeW = doc.widthOfString(badgeLabel) + 20
      doc.save()
      doc.roundedRect(pageWidth - margin - badgeW, y + 2, badgeW, 20, 10).fillColor(badgeColor).fill()
      doc.restore()
      doc.fillColor(C.white).font('Helvetica-Bold').fontSize(9)
      doc.text(badgeLabel, pageWidth - margin - badgeW, y + 7, { width: badgeW, align: 'center' })

      y += 32

      // ── Invoice meta (left) + dates (right) ──
      doc.fillColor(C.textMuted).font('Helvetica-Bold').fontSize(8)
      doc.text('INVOICE NO.', margin, y)
      doc.fillColor(C.textDark).font('Helvetica-Bold').fontSize(11)
      doc.text(invoice.invoiceNo, margin, y + 11)

      doc.fillColor(C.textMuted).font('Helvetica-Bold').fontSize(8)
      doc.text('ISSUE DATE', margin + 150, y)
      doc.fillColor(C.textDark).font('Helvetica').fontSize(10)
      doc.text(fmtDate(invoice.issuedAt), margin + 150, y + 11)

      doc.fillColor(C.textMuted).font('Helvetica-Bold').fontSize(8)
      doc.text('DUE DATE', margin + 280, y)
      doc.fillColor(C.textDark).font('Helvetica').fontSize(10)
      doc.text(fmtDate(invoice.dueAt), margin + 280, y + 11)

      // Bill To (right side)
      doc.fillColor(C.textMuted).font('Helvetica-Bold').fontSize(8)
      doc.text('BILL TO', pageWidth - margin - 180, y)
      doc.fillColor(C.textDark).font('Helvetica-Bold').fontSize(10)
      doc.text(tenant?.name || '—', pageWidth - margin - 180, y + 11, { width: 180 })
      if (tenant?.contactName) {
        doc.fillColor(C.textMuted).font('Helvetica').fontSize(8)
        doc.text(tenant.contactName, pageWidth - margin - 180, y + 25, { width: 180 })
      }
      if (tenant?.contactEmail) {
        doc.text(tenant.contactEmail, pageWidth - margin - 180, y + 36, { width: 180 })
      }
      if (tenant?.addressLine) {
        doc.text(tenant.addressLine, pageWidth - margin - 180, y + 47, { width: 180 })
      }
      if (tenant?.city || tenant?.state) {
        doc.text(`${tenant?.city || ''}${tenant?.city && tenant?.state ? ', ' : ''}${tenant?.state || ''}`, pageWidth - margin - 180, y + 58, { width: 180 })
      }

      y += 80

      // ── Description ──
      if (invoice.description) {
        doc.fillColor(C.textMuted).font('Helvetica-Bold').fontSize(8)
        doc.text('DESCRIPTION', margin, y)
        doc.fillColor(C.textBody).font('Helvetica').fontSize(10)
        doc.text(invoice.description, margin, y + 12, { width: contentW })
        y = doc.y + 16
      }

      // ── Line items table ──
      if (lineItems.length > 0) {
        // Table header
        const colX = { desc: margin, qty: margin + contentW * 0.55, price: margin + contentW * 0.70, amt: margin + contentW * 0.85 }
        const colW = { desc: contentW * 0.55, qty: contentW * 0.15, price: contentW * 0.15, amt: contentW * 0.15 }

        doc.save()
        doc.rect(margin, y, contentW, 22).fillColor(C.emerald700).fill()
        doc.restore()
        doc.fillColor(C.white).font('Helvetica-Bold').fontSize(9)
        doc.text('DESCRIPTION', colX.desc + 10, y + 7, { width: colW.desc - 10 })
        doc.text('QTY', colX.qty, y + 7, { width: colW.qty, align: 'center' })
        doc.text('UNIT PRICE', colX.price, y + 7, { width: colW.price, align: 'right' })
        doc.text('AMOUNT', colX.amt, y + 7, { width: colW.amt - 10, align: 'right' })
        y += 22

        // Rows
        lineItems.forEach((item, i) => {
          const rowH = 24
          const ry = y + i * rowH
          if (i % 2 === 0) {
            doc.save()
            doc.rect(margin, ry, contentW, rowH).fillColor(C.rowTint).fill()
            doc.restore()
          }
          doc.fillColor(C.textDark).font('Helvetica').fontSize(9)
          doc.text(truncate(doc, item.description, colW.desc - 15), colX.desc + 10, ry + 7, { width: colW.desc - 15 })
          doc.text(String(item.quantity), colX.qty, ry + 7, { width: colW.qty, align: 'center' })
          doc.text(fmtMoney(item.unitPrice), colX.price, ry + 7, { width: colW.price - 5, align: 'right' })
          doc.font('Helvetica-Bold')
          doc.text(fmtMoney(item.quantity * item.unitPrice), colX.amt, ry + 7, { width: colW.amt - 10, align: 'right' })
        })

        y += lineItems.length * 24 + 10

        // Table border
        doc.save()
        doc.rect(margin, y - lineItems.length * 24 - 10, contentW, lineItems.length * 24 + 22)
        doc.strokeColor(C.borderGrey).lineWidth(0.5).stroke()
        doc.restore()
      }

      // ── Totals (right-aligned) ──
      const totalsX = pageWidth - margin - 220
      const totalsW = 220
      const labelW = 120
      const valueW = totalsW - labelW

      function totalRow(label: string, value: string, isBold?: boolean, isLarge?: boolean) {
        doc.fillColor(C.textMuted).font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(isLarge ? 11 : 9)
        doc.text(label, totalsX, y, { width: labelW, align: 'left' })
        doc.fillColor(isBold ? C.emerald900 : C.textDark).font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(isLarge ? 13 : 9)
        doc.text(value, totalsX + labelW, y, { width: valueW, align: 'right' })
        y += isLarge ? 20 : 16
      }

      totalRow('Subtotal', fmtMoney(invoice.amount))
      if (invoice.discountAmount > 0) totalRow('Discount', `- ${fmtMoney(invoice.discountAmount)}`)
      if (invoice.taxAmount > 0) totalRow(`Tax (${invoice.taxRate}%)`, fmtMoney(invoice.taxAmount))
      y += 4
      // Total line
      doc.save()
      doc.moveTo(totalsX, y)
      doc.lineTo(totalsX + totalsW, y)
      doc.lineWidth(0.5)
      doc.strokeColor(C.borderGrey)
      doc.stroke()
      doc.restore()
      y += 6
      totalRow('TOTAL', fmtMoney(invoice.total), true, true)

      y += 16

      // ── Payment info (if paid) ──
      if (invoice.status === 'paid' && invoice.method) {
        doc.save()
        doc.roundedRect(margin, y, contentW, 50, 4).fillColor(C.emerald50).fill()
        doc.strokeColor(C.emerald400).lineWidth(0.5).stroke()
        doc.restore()
        doc.fillColor(C.emerald900).font('Helvetica-Bold').fontSize(9)
        doc.text('PAYMENT INFORMATION', margin + 12, y + 8)
        doc.fillColor(C.textBody).font('Helvetica').fontSize(9)
        doc.text(`Method: ${invoice.method}`, margin + 12, y + 22)
        if (invoice.reference) doc.text(`Reference: ${invoice.reference}`, margin + 200, y + 22)
        doc.text(`Paid on: ${fmtDate(invoice.paidAt)}`, margin + 400, y + 22)
        y += 60
      }

      // ── Notes ──
      if (invoice.notes) {
        doc.fillColor(C.textMuted).font('Helvetica-Bold').fontSize(8)
        doc.text('NOTES', margin, y)
        doc.fillColor(C.textBody).font('Helvetica').fontSize(8.5)
        doc.text(invoice.notes, margin, y + 12, { width: contentW })
        y = doc.y + 16
      }

      // ── Signature ──
      const sigY = Math.max(y, pageHeight - 200)
      if (signatureBuf) {
        doc.save()
        doc.roundedRect(margin, sigY, 150, 50, 4).clip()
        try { doc.image(signatureBuf, margin, sigY, { width: 150, height: 50 }) }
        catch { /* ignore */ }
        doc.restore()
      }
      doc.save()
      doc.moveTo(margin, sigY + 55).lineTo(margin + 180, sigY + 55)
      doc.lineWidth(0.5).strokeColor(C.textBody).stroke()
      doc.restore()
      doc.fillColor(C.textDark).font('Helvetica-Bold').fontSize(9)
      doc.text('Authorized Signatory', margin, sigY + 58, { width: 180 })
      doc.fillColor(C.textMuted).font('Helvetica').fontSize(8)
      doc.text('SSM Limited', margin, sigY + 70, { width: 180 })

      // ── Footer ──
      const footerY = pageHeight - 60
      doc.save()
      doc.moveTo(margin, footerY).lineTo(pageWidth - margin, footerY)
      doc.lineWidth(0.4).strokeColor(C.borderGrey).stroke()
      doc.restore()
      doc.fillColor(C.emerald700).font('Helvetica-Bold').fontSize(8)
      doc.text('SSM Limited', margin, footerY + 6, { width: contentW, align: 'center', lineBreak: false })
      doc.fillColor(C.textSubtle).font('Helvetica').fontSize(7)
      doc.text('support@ssm.com.ng  ·  Kano, Nigeria  ·  This is a computer-generated invoice.', margin, footerY + 18, { width: contentW, align: 'center', lineBreak: false })

      doc.end()
    } catch (err) {
      try { doc.end() } catch { /* ignore */ }
      reject(err)
    }
  })
}
