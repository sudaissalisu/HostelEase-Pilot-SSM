import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const tenantId = url.searchParams.get('tenantId') || 'ausu'
  const status = url.searchParams.get('status')
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(10, parseInt(url.searchParams.get('pageSize') || '50', 10)))

  // Get the tenant's database URL
  const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { databaseUrl: true } })
  if (!tenant?.databaseUrl) {
    return NextResponse.json({ logs: [], total: 0, message: 'Tenant database not configured' })
  }

  // Connect to the tenant's database and query EmailLog
  const tenantDb = new PrismaClient({ datasources: { db: { url: tenant.databaseUrl } }, log: ['error'] })

  try {
    const where = status ? `WHERE status = '${status.replace(/'/g, "''")}'` : ''
    const [countResult, logs] = await Promise.all([
      tenantDb.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*)::int as count FROM "EmailLog" ${status ? tenantDb.$queryRaw`WHERE status = ${status}` : tenantDb.$queryRaw``}`.catch(() => [{ count: 0 }]),
      tenantDb.$queryRaw`
        SELECT id, "toEmail", subject, status, error, "createdAt", "sentAt"
        FROM "EmailLog"
        ${status ? tenantDb.$queryRaw`WHERE status = ${status}` : tenantDb.$queryRaw``}
        ORDER BY "createdAt" DESC
        LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
      `.catch(() => []),
    ])

    const total = Number((countResult as any)[0]?.count || 0)
    return NextResponse.json({ logs, total, pagination: { page, pageSize, totalPages: Math.ceil(total / pageSize) } })
  } catch (err) {
    console.error('[email-logs] Failed:', err)
    return NextResponse.json({ logs: [], total: 0, error: 'Failed to fetch email logs' })
  } finally {
    await tenantDb.$disconnect()
  }
}
