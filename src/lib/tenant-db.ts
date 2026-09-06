/**
 * Tenant Database Helper — creates a PrismaClient connected to AUSU's
 * hostel database. Used by all proxy API routes in the pilot dashboard.
 */
import { PrismaClient } from '@prisma/client'
import { db } from './db'

const tenantClients = new Map<string, PrismaClient>()

export async function getTenantDb(): Promise<PrismaClient> {
  const tenant = await db.tenant.findFirst({
    where: { status: 'active' },
    select: { databaseUrl: true, id: true, name: true }
  })
  const dbUrl = tenant?.databaseUrl || process.env.AUSU_DATABASE_URL || null
  if (!dbUrl) throw new Error('No tenant database configured. Set AUSU_DATABASE_URL.')

  let client = tenantClients.get(dbUrl)
  if (!client) {
    client = new PrismaClient({
      datasources: { db: { url: dbUrl } },
      log: ['error'],
    })
    tenantClients.set(dbUrl, client)
  }
  return client
}

export async function getTenantName(): Promise<string> {
  const tenant = await db.tenant.findFirst({
    where: { status: 'active' },
    select: { name: true }
  })
  return tenant?.name || 'Unknown'
}
