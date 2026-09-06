import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getTenantDb } from '@/lib/tenant-db'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tdb = await getTenantDb()
    const url = new URL(req.url)
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
    const pageSize = Math.min(100, Math.max(10, parseInt(url.searchParams.get('pageSize') || '50', 10)))
    const severity = url.searchParams.get('severity')

    let whereClause = ''
    const params: any[] = []
    let paramIdx = 1

    if (severity) {
      whereClause = `WHERE severity = $${paramIdx}`
      params.push(severity)
      paramIdx++
    }

    const countResult = await tdb.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "AuditLog" ${whereClause}`, ...params)
    const total = (countResult as any[])[0]?.count || 0

    const logs = await tdb.$queryRawUnsafe(
      `SELECT a.id, a.action, a."entityType", a."entityId", a.summary, a."ipAddress", a."createdAt", a.severity, a.metadata,
       u.name as "actorName", u.email as "actorEmail"
       FROM "AuditLog" a LEFT JOIN "User" u ON a."actorId" = u.id
       ${whereClause}
       ORDER BY a."createdAt" DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      ...params, pageSize, (page - 1) * pageSize
    )

    return NextResponse.json({ logs, total, pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } })
  } catch (err) {
    console.error('[audit-logs] GET failed:', err)
    return NextResponse.json({ logs: [], total: 0 })
  }
}
