/**
 * Cross-database stats — fetches REAL data from a tenant's hostel database.
 *
 * The pilot dashboard's own database stores SSM business data (licenses,
 * invoices, tenants). But to show REAL stats (student count, bed count,
 * revenue, etc.), we need to query the TENANT'S database.
 *
 * This creates a temporary PrismaClient pointing to the tenant's DATABASE_URL
 * and runs raw SQL queries to fetch the stats. The PrismaClient is cached
 * per-database-URL so we don't create a new connection pool on every request.
 */

import { PrismaClient } from '@prisma/client'

const tenantClients = new Map<string, PrismaClient>()

function getTenantClient(databaseUrl: string): PrismaClient {
  let client = tenantClients.get(databaseUrl)
  if (!client) {
    client = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
      log: ['error'],
    })
    tenantClients.set(databaseUrl, client)
  }
  return client
}

export interface TenantStats {
  studentCount: number
  bedCount: number
  availableBeds: number
  occupiedBeds: number
  activeAllocations: number
  totalRevenue: number
  pendingPayments: number
  successfulPayments: number
  activeBursaryCodes: number
  pendingApplications: number
  totalUsers: number
  activeSession: string | null
}

/**
 * Fetches real-time stats from a tenant's hostel database.
 * Returns null if the databaseUrl is not set or the query fails.
 */
export async function fetchTenantStats(databaseUrl: string | null): Promise<TenantStats | null> {
  if (!databaseUrl) return null

  try {
    const client = getTenantClient(databaseUrl)

    // Run all queries in parallel for speed
    const [
      students, beds, allocations, payments, bursaryCodes,
      applications, users, session
    ] = await Promise.all([
      // Total students
      client.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*)::int as count FROM "Student"`.catch(() => [{ count: 0 }]),
      // Beds by status
      client.$queryRaw<{ status: string; count: number }[]>`
        SELECT status, COUNT(*)::int as count FROM "Bed" GROUP BY status
      `.catch(() => []),
      // Active allocations
      client.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::int as count FROM "Allocation"
        WHERE status IN ('ACTIVE', 'PROVISIONAL', 'CHECKED_IN')
      `.catch(() => [{ count: 0 }]),
      // Payments by status
      client.$queryRaw<{ status: string; count: number; total: number }[]>`
        SELECT status, COUNT(*)::int as count, COALESCE(SUM(amount), 0)::float8 as total
        FROM "Payment" GROUP BY status
      `.catch(() => []),
      // Bursary codes
      client.$queryRaw<{ status: string; count: number }[]>`
        SELECT status, COUNT(*)::int as count FROM "BursaryCode" GROUP BY status
      `.catch(() => []),
      // Pending applications
      client.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::int as count FROM "Application" WHERE status = 'PENDING'
      `.catch(() => [{ count: 0 }]),
      // Total users
      client.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::int as count FROM "User" WHERE "isDeleted" = false
      `.catch(() => [{ count: 0 }]),
      // Active session
      client.$queryRaw<{ name: string }[]>`
        SELECT name FROM "AcademicSession" WHERE "isActive" = true LIMIT 1
      `.catch(() => []),
    ])

    // Parse bed stats
    const bedStats = beds as { status: string; count: number }[]
    const availableBeds = bedStats.find(b => b.status === 'AVAILABLE')?.count || 0
    const occupiedBeds = bedStats.find(b => b.status === 'OCCUPIED')?.count || 0
    const totalBeds = bedStats.reduce((s, b) => s + b.count, 0)

    // Parse payment stats
    const paymentStats = payments as { status: string; count: number; total: number }[]
    const successfulPayments = paymentStats.find(p => p.status === 'SUCCESS')?.count || 0
    const totalRevenue = paymentStats.find(p => p.status === 'SUCCESS')?.total || 0
    const pendingPayments = paymentStats.find(p => p.status === 'PENDING')?.count || 0

    // Parse bursary code stats
    const codeStats = bursaryCodes as { status: string; count: number }[]
    const activeBursaryCodes = codeStats.find(c => c.status === 'ACTIVE')?.count || 0

    return {
      studentCount: Number((students as any)[0]?.count || 0),
      bedCount: totalBeds,
      availableBeds,
      occupiedBeds,
      activeAllocations: Number((allocations as any)[0]?.count || 0),
      totalRevenue,
      pendingPayments,
      successfulPayments,
      activeBursaryCodes,
      pendingApplications: Number((applications as any)[0]?.count || 0),
      totalUsers: Number((users as any)[0]?.count || 0),
      activeSession: (session as any)[0]?.name || null,
    }
  } catch (err) {
    console.error('[tenant-stats] Failed to fetch tenant stats:', err)
    return null
  }
}
