/**
 * SSM Pilot — Bootstrap Script
 *
 * Creates the first SSM super admin account + the AUSU tenant record.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." bun run scripts/bootstrap.ts
 *
 * You'll be prompted for the admin email + password.
 */
import argon2 from 'argon2'
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const email = process.env.SSM_ADMIN_EMAIL || 'admin@ssm.com.ng'
  const password = process.env.SSM_ADMIN_PASSWORD || 'ChangeMe123!'
  const name = process.env.SSM_ADMIN_NAME || 'SSM Administrator'

  console.log('=== SSM Pilot Bootstrap ===\n')

  // 1. Create SSM super admin
  const existing = await db.ssmUser.findUnique({ where: { email } })
  if (existing) {
    console.log(`SSM admin already exists: ${email}`)
  } else {
    const hash = await argon2.hash(password, { type: argon2.argon2id })
    await db.ssmUser.create({
      data: { email, passwordHash: hash, name, role: 'SSM_SUPER_ADMIN' },
    })
    console.log(`✓ SSM admin created: ${email}`)
    console.log(`  Password: ${password}`)
    console.log(`  ⚠️  Change this password after first login!\n`)
  }

  // 2. Create AUSU tenant
  const ausu = await db.tenant.findUnique({ where: { id: 'ausu' } })
  if (ausu) {
    console.log('AUSU tenant already exists')
  } else {
    await db.tenant.create({
      data: {
        id: 'ausu',
        name: 'Al-Istiqama University, Sumaila',
        shortName: 'AUSU',
        domain: 'ausu.hostelease.com',
        portalUrl: 'https://ausu.hostelease.com',
        plan: 'standard',
        status: 'active',
        licenseFee: 500000,
        startedAt: new Date('2024-10-01'),
        expiresAt: new Date('2026-10-01'),
        autoRenew: true,
        studentCount: 1708,
        bedCount: 850,
        staffCount: 15,
        city: 'Sumaila',
        state: 'Kano State',
        country: 'Nigeria',
      },
    })
    console.log('✓ AUSU tenant created')
  }

  console.log('\n=== Bootstrap complete ===')
  console.log('Login at: https://pilot.ssm.com.ng/login')
}

main().catch(console.error).finally(() => db.$disconnect())
