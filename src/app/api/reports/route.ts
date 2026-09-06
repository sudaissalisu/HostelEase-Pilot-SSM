import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getTenantDb } from '@/lib/tenant-db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tdb = await getTenantDb()
    const [students, beds, allocations, payments, bursaryCodes, applications] = await Promise.all([
      tdb.student.count(),
      tdb.bed.count(),
      tdb.allocation.count({ where: { status: 'ACTIVE' } }),
      tdb.payment.findMany({ where: { status: 'SUCCESS' }, select: { amount: true } }),
      tdb.bursaryCode.count(),
      tdb.application.count(),
    ])

    const totalRevenue = payments.reduce((s, p) => s + p.amount, 0)

    return NextResponse.json({
      summary: { students, beds, allocations, totalRevenue, bursaryCodes, applications },
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
