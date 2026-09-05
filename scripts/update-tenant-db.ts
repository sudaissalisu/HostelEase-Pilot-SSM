import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  await db.tenant.update({
    where: { id: 'ausu' },
    data: {
      databaseUrl: 'postgres://avnadmin:AVNS_HdL8rBjHAgJ9fju37Ks@pg-3c0e458-sudaisgravity1-a582.i.aivencloud.com:26279/defaultdb?sslmode=require',
    },
  })
  console.log('✓ AUSU tenant updated with new databaseUrl')
  const t = await db.tenant.findUnique({ where: { id: 'ausu' }, select: { databaseUrl: true } })
  console.log('  URL:', t?.databaseUrl?.substring(0, 60) + '...')
}
main().catch(console.error).finally(() => db.$disconnect())
