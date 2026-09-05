import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { fetchTenantStats } from '@/lib/tenant-stats'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenants = await db.tenant.findMany({
    orderBy: { startedAt: 'desc' },
    select: {
      id: true, name: true, shortName: true, plan: true, status: true,
      licenseFee: true, startedAt: true, expiresAt: true,
      studentCount: true, bedCount: true, staffCount: true,
      domain: true, portalUrl: true, databaseUrl: true, city: true, state: true,
    },
  })

  const tenantsWithStats = await Promise.all(
    tenants.map(async (t) => {
      const realStats = t.databaseUrl ? await fetchTenantStats(t.databaseUrl) : null
      if (realStats) {
        db.tenant.update({ where: { id: t.id }, data: { studentCount: realStats.studentCount, bedCount: realStats.bedCount } }).catch(() => {})
      }
      return { ...t, realStats }
    })
  )

  const invoices = await db.invoice.findMany({ where: { status: { in: ['pending', 'overdue'] } } })
  const paidInvoices = await db.invoice.findMany({ where: { status: 'paid' } })

  const now = new Date()
  const expiringLicenses = tenants.filter(t => {
    if (!t.expiresAt) return false
    const days = Math.ceil((t.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return days <= 60 && days >= 0
  }).length

  const stats = {
    totalTenants: tenants.length,
    activeTenants: tenants.filter(t => t.status === 'active').length,
    totalStudents: tenantsWithStats.reduce((s, t) => s + (t.realStats?.studentCount ?? t.studentCount), 0),
    totalBeds: tenantsWithStats.reduce((s, t) => s + (t.realStats?.bedCount ?? t.bedCount), 0),
    totalRevenue: paidInvoices.reduce((s, i) => s + i.amount, 0),
    totalTenantRevenue: tenantsWithStats.reduce((s, t) => s + (t.realStats?.totalRevenue ?? 0), 0),
    pendingInvoices: invoices.filter(i => i.status === 'pending').length,
    overdueInvoices: invoices.filter(i => i.status === 'overdue').length,
    expiringLicenses,
  }

  return NextResponse.json({ stats, tenants: tenantsWithStats })
}
