import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { queryTenantDB, fetchTenantStats } from '@/lib/tenant-stats'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const type = url.searchParams.get('type') || 'overview'
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(10, parseInt(url.searchParams.get('pageSize') || '50', 10)))
  const status = url.searchParams.get('status')

  // Get AUSU's database URL
  const tenant = await db.tenant.findFirst({ where: { status: 'active' }, select: { databaseUrl: true, id: true, name: true } })
  if (!tenant?.databaseUrl) {
    return NextResponse.json({ error: 'No tenant database configured', data: null })
  }
  const dbUrl = tenant.databaseUrl

  switch (type) {
    case 'overview': {
      const stats = await fetchTenantStats(dbUrl)
      return NextResponse.json({ stats, tenantName: tenant.name })
    }

    case 'email-logs': {
      const offset = (page - 1) * pageSize
      const where = status ? `WHERE status = $1` : ''
      const params = status ? [status] : []
      const logs = await queryTenantDB(dbUrl,
        `SELECT id, "toEmail", subject, status, error, "createdAt", "sentAt" FROM "EmailLog" ${where} ORDER BY "createdAt" DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, pageSize, offset]
      )
      const countResult = await queryTenantDB<{ count: number }>(dbUrl,
        `SELECT COUNT(*)::int as count FROM "EmailLog" ${where}`, params
      )
      return NextResponse.json({ logs, total: countResult[0]?.count || 0 })
    }

    case 'audit-logs': {
      const offset = (page - 1) * pageSize
      const logs = await queryTenantDB(dbUrl,
        `SELECT id, action, "entityType", "entityId", summary, "ipAddress", "createdAt", "severity" FROM "AuditLog" ORDER BY "createdAt" DESC LIMIT $1 OFFSET $2`,
        [pageSize, offset]
      )
      const countResult = await queryTenantDB<{ count: number }>(dbUrl, 'SELECT COUNT(*)::int as count FROM "AuditLog"')
      return NextResponse.json({ logs, total: countResult[0]?.count || 0 })
    }

    case 'payment-gateways': {
      const gateways = await queryTenantDB(dbUrl,
        'SELECT provider, "displayName", "isEnabled", "isSandbox", "logoUrl" FROM "PaymentGateway" ORDER BY provider'
      )
      return NextResponse.json({ gateways })
    }

    case 'system-health': {
      const stats = await fetchTenantStats(dbUrl)
      const healthChecks = {
        database: { status: 'ok', label: 'Database Connection' },
        students: { status: 'ok', count: stats?.studentCount || 0 },
        beds: { status: 'ok', total: stats?.bedCount || 0, available: stats?.availableBeds || 0, occupied: stats?.occupiedBeds || 0 },
        payments: { status: 'ok', total: stats?.successfulPayments || 0, revenue: stats?.totalRevenue || 0 },
        allocations: { status: 'ok', active: stats?.activeAllocations || 0 },
        session: { status: stats?.activeSession ? 'ok' : 'warning', name: stats?.activeSession || 'No active session' },
      }
      return NextResponse.json({ healthChecks, stats })
    }

    case 'announcements': {
      const announcements = await queryTenantDB(dbUrl,
        'SELECT id, title, message, type, "isActive", "createdAt" FROM "Announcement" ORDER BY "createdAt" DESC LIMIT $1 OFFSET $2',
        [pageSize, (page - 1) * pageSize]
      )
      return NextResponse.json({ announcements })
    }

    case 'locked-students': {
      const locked = await queryTenantDB(dbUrl,
        `SELECT s.id, s."regNumber", u.name, u.email, s."bedSelectionBlocked", s."profileHoldReason", s."profileHeldAt"
         FROM "Student" s JOIN "User" u ON s."userId" = u.id
         WHERE s."bedSelectionBlocked" = true ORDER BY s."profileHeldAt" DESC`
      )
      return NextResponse.json({ locked })
    }

    case 'notifications': {
      const notifications = await queryTenantDB(dbUrl,
        `SELECT id, title, message, type, category, "isRead", "createdAt" FROM "Notification" ORDER BY "createdAt" DESC LIMIT $1 OFFSET $2`,
        [pageSize, (page - 1) * pageSize]
      )
      return NextResponse.json({ notifications })
    }

    case 'versioning': {
      const versions = await queryTenantDB(dbUrl,
        `SELECT key, value FROM "SystemSetting" WHERE key = 'app_version' OR key = 'app_changelog' LIMIT 2`
      )
      return NextResponse.json({ versions })
    }

    case 'branding': {
      const branding = await queryTenantDB(dbUrl,
        `SELECT key, value FROM "SystemSetting" WHERE category = 'BRANDING' OR key LIKE '%school%' OR key LIKE '%institution%' OR key LIKE '%tagline%' OR key LIKE '%logo%' OR key LIKE '%favicon%'`
      )
      const brandingMap: Record<string, string> = {}
      for (const b of branding) brandingMap[(b as any).key] = (b as any).value
      return NextResponse.json({ branding: brandingMap })
    }

    case 'feedback': {
      const feedback = await queryTenantDB(dbUrl,
        `SELECT f.id, f.rating, f.comment, f."createdAt", u.name, u.email
         FROM "Feedback" f JOIN "User" u ON f."userId" = u.id
         ORDER BY f."createdAt" DESC LIMIT $1 OFFSET $2`,
        [pageSize, (page - 1) * pageSize]
      )
      return NextResponse.json({ feedback })
    }

    case 'support-tickets': {
      const tickets = await queryTenantDB(dbUrl,
        `SELECT id, title, description, status, priority, "createdAt" FROM "SupportTicket" ORDER BY "createdAt" DESC LIMIT $1 OFFSET $2`,
        [pageSize, (page - 1) * pageSize]
      )
      return NextResponse.json({ tickets })
    }

    case 'settings': {
      const settings = await queryTenantDB(dbUrl,
        `SELECT key, value, category FROM "SystemSetting" WHERE category NOT IN ('FILE_UPLOAD','SMTP') ORDER BY category, key`
      )
      const grouped: Record<string, Record<string, string>> = {}
      for (const s of settings) {
        const cat = (s as any).category || 'GENERAL'
        if (!grouped[cat]) grouped[cat] = {}
        grouped[cat][(s as any).key] = (s as any).value
      }
      return NextResponse.json({ settings: grouped })
    }

    default:
      return NextResponse.json({ error: 'Unknown data type' }, { status: 400 })
  }
}
