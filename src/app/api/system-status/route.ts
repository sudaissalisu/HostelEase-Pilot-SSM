import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getTenantDb } from '@/lib/tenant-db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tdb = await getTenantDb()
    const [userCount, studentCount, paymentCount, allocationCount, session] = await Promise.all([
      tdb.user.count({ where: { isDeleted: false } }),
      tdb.student.count(),
      tdb.payment.count({ where: { status: 'SUCCESS' } }),
      tdb.allocation.count({ where: { status: 'ACTIVE' } }),
      tdb.academicSession.findFirst({ where: { isActive: true } }),
    ])

    return NextResponse.json({
      status: 'healthy',
      stats: { userCount, studentCount, paymentCount, allocationCount, activeSession: session?.name || null },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json({ status: 'error', error: 'Failed to fetch system status' }, { status: 500 })
  }
}
