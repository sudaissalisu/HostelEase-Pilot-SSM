/**
 * Cross-database query helper — connects to a tenant's hostel database
 * and runs raw SQL queries. Uses a connection pool cache for performance.
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

export async function queryTenantDB<T>(
  databaseUrl: string,
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  try {
    const client = getTenantClient(databaseUrl)
    const result = await client.$queryRawUnsafe<T[]>(sql, ...params)
    return result as T[]
  } catch (err) {
    console.error('[tenant-db] Query failed:', err instanceof Error ? err.message : String(err))
    return []
  }
}

export async function fetchTenantStats(databaseUrl: string | null) {
  if (!databaseUrl) return null
  try {
    const [students, beds, allocations, payments, bursaryCodes, applications, users, session] = await Promise.all([
      queryTenantDB<{ count: number }>(databaseUrl, 'SELECT COUNT(*)::int as count FROM "Student"'),
      queryTenantDB<{ status: string; count: number }>(databaseUrl, 'SELECT status, COUNT(*)::int as count FROM "Bed" GROUP BY status'),
      queryTenantDB<{ count: number }>(databaseUrl, `SELECT COUNT(*)::int as count FROM "Allocation" WHERE status IN ('ACTIVE', 'PROVISIONAL', 'CHECKED_IN')`),
      queryTenantDB<{ status: string; count: number; total: number }>(databaseUrl, 'SELECT status, COUNT(*)::int as count, COALESCE(SUM(amount), 0)::float8 as total FROM "Payment" GROUP BY status'),
      queryTenantDB<{ status: string; count: number }>(databaseUrl, 'SELECT status, COUNT(*)::int as count FROM "BursaryCode" GROUP BY status'),
      queryTenantDB<{ count: number }>(databaseUrl, `SELECT COUNT(*)::int as count FROM "Application" WHERE status = 'PENDING'`),
      queryTenantDB<{ count: number }>(databaseUrl, 'SELECT COUNT(*)::int as count FROM "User" WHERE "isDeleted" = false'),
      queryTenantDB<{ name: string }>(databaseUrl, 'SELECT name FROM "AcademicSession" WHERE "isActive" = true LIMIT 1'),
    ])

    const bedStats = beds as { status: string; count: number }[]
    const paymentStats = payments as { status: string; count: number; total: number }[]
    const codeStats = bursaryCodes as { status: string; count: number }[]

    return {
      studentCount: (students as any)[0]?.count || 0,
      bedCount: bedStats.reduce((s, b) => s + b.count, 0),
      availableBeds: bedStats.find(b => b.status === 'AVAILABLE')?.count || 0,
      occupiedBeds: bedStats.find(b => b.status === 'OCCUPIED')?.count || 0,
      activeAllocations: (allocations as any)[0]?.count || 0,
      totalRevenue: paymentStats.find(p => p.status === 'SUCCESS')?.total || 0,
      pendingPayments: paymentStats.find(p => p.status === 'PENDING')?.count || 0,
      successfulPayments: paymentStats.find(p => p.status === 'SUCCESS')?.count || 0,
      activeBursaryCodes: codeStats.find(c => c.status === 'ACTIVE')?.count || 0,
      pendingApplications: (applications as any)[0]?.count || 0,
      totalUsers: (users as any)[0]?.count || 0,
      activeSession: (session as any)[0]?.name || null,
    }
  } catch (err) {
    console.error('[tenant-stats] Failed:', err)
    return null
  }
}
