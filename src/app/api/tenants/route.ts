import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenants = await db.tenant.findMany({ orderBy: { startedAt: 'desc' } })
  return NextResponse.json({ tenants })
}
