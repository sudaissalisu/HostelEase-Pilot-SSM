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

    const where: any = {}
    if (severity) where.severity = severity

    const [total, logs] = await Promise.all([
      tdb.auditLog.count({ where }),
      tdb.auditLog.findMany({
        where,
        include: { actor: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return NextResponse.json({ logs, total, pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}
