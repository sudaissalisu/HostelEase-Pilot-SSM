import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getTenantDb } from '@/lib/tenant-db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tdb = await getTenantDb()
    const [users, students, payments, allocations, session_row] = await Promise.all([
      tdb.$queryRaw`SELECT COUNT(*)::int as count FROM "User" WHERE "isDeleted" = false`,
      tdb.$queryRaw`SELECT COUNT(*)::int as count FROM "Student"`,
      tdb.$queryRaw`SELECT COUNT(*)::int as count FROM "Payment" WHERE status = 'SUCCESS'`,
      tdb.$queryRaw`SELECT COUNT(*)::int as count FROM "Allocation" WHERE status IN ('ACTIVE', 'PROVISIONAL', 'CHECKED_IN')`,
      tdb.$queryRaw`SELECT name FROM "AcademicSession" WHERE "isActive" = true LIMIT 1`,
    ])

    return NextResponse.json({
      status: 'healthy',
      stats: {
        userCount: (users as any[])[0]?.count || 0,
        studentCount: (students as any[])[0]?.count || 0,
        paymentCount: (payments as any[])[0]?.count || 0,
        allocationCount: (allocations as any[])[0]?.count || 0,
        activeSession: (session_row as any[])[0]?.name || null,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json({ status: 'error', error: 'Failed' }, { status: 500 })
  }
}
