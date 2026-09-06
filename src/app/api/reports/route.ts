import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getTenantDb } from '@/lib/tenant-db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tdb = await getTenantDb()
    const [students, beds, allocations, revenue, bursaryCodes, applications] = await Promise.all([
      tdb.$queryRaw`SELECT COUNT(*)::int as count FROM "Student"`,
      tdb.$queryRaw`SELECT COUNT(*)::int as count FROM "Bed"`,
      tdb.$queryRaw`SELECT COUNT(*)::int as count FROM "Allocation" WHERE status = 'ACTIVE'`,
      tdb.$queryRaw`SELECT COALESCE(SUM(amount), 0)::float8 as total FROM "Payment" WHERE status = 'SUCCESS'`,
      tdb.$queryRaw`SELECT COUNT(*)::int as count FROM "BursaryCode"`,
      tdb.$queryRaw`SELECT COUNT(*)::int as count FROM "Application"`,
    ])

    return NextResponse.json({
      summary: {
        students: (students as any[])[0]?.count || 0,
        beds: (beds as any[])[0]?.count || 0,
        allocations: (allocations as any[])[0]?.count || 0,
        totalRevenue: (revenue as any[])[0]?.total || 0,
        bursaryCodes: (bursaryCodes as any[])[0]?.count || 0,
        applications: (applications as any[])[0]?.count || 0,
      },
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
