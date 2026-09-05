import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  // Update AUSU tenant with the hostel platform's database URL
  // so the pilot dashboard can fetch REAL stats from AUSU's database
  await db.tenant.update({
    where: { id: 'ausu' },
    data: {
      databaseUrl: process.env.AUSU_DATABASE_URL || '',
    },
  })
  console.log('✓ AUSU tenant updated with databaseUrl')
  console.log('  URL:', process.env.AUSU_DATABASE_URL?.substring(0, 50) + '...')
}
main().catch(console.error).finally(() => db.$disconnect())
