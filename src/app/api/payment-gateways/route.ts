import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getTenantDb } from '@/lib/tenant-db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tdb = await getTenantDb()
    const gateways = await tdb.paymentGateway.findMany({
      orderBy: { provider: 'asc' },
    })
    return NextResponse.json({ gateways })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch payment gateways' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tdb = await getTenantDb()
    const body = await req.json()
    const { id, isEnabled, isSandbox, displayName } = body

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const data: any = {}
    if (isEnabled !== undefined) data.isEnabled = Boolean(isEnabled)
    if (isSandbox !== undefined) data.isSandbox = Boolean(isSandbox)
    if (displayName !== undefined) data.displayName = String(displayName)

    await tdb.paymentGateway.update({ where: { id }, data })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update payment gateway' }, { status: 500 })
  }
}
