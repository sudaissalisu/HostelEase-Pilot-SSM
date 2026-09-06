import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getTenantDb } from '@/lib/tenant-db'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tdb = await getTenantDb()
    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const search = url.searchParams.get('q')
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
    const pageSize = Math.min(100, Math.max(10, parseInt(url.searchParams.get('pageSize') || '50', 10)))

    let whereClause = ''
    const params: any[] = []
    let paramIdx = 1

    if (status) {
      whereClause += `WHERE status = $${paramIdx}`
      params.push(status)
      paramIdx++
    }
    if (search) {
      whereClause += whereClause ? ' AND' : 'WHERE'
      whereClause += ` ("toEmail" ILIKE $${paramIdx} OR subject ILIKE $${paramIdx})`
      params.push(`%${search}%`)
      paramIdx++
    }

    const countResult = await tdb.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "EmailLog" ${whereClause}`, ...params)
    const total = (countResult as any[])[0]?.count || 0

    const logs = await tdb.$queryRawUnsafe(
      `SELECT id, "toEmail", subject, status, error, "createdAt", "sentAt", "retryCount", "lastRetriedAt" FROM "EmailLog" ${whereClause} ORDER BY "createdAt" DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      ...params, pageSize, (page - 1) * pageSize
    )

    return NextResponse.json({ logs, total, pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } })
  } catch (err) {
    console.error('[email-logs] GET failed:', err)
    return NextResponse.json({ logs: [], total: 0 })
  }
}
