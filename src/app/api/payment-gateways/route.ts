import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getTenantDb } from '@/lib/tenant-db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tdb = await getTenantDb()
    const gateways = await tdb.$queryRaw`
      SELECT id, provider, "displayName", "publicKey", "secretKey", "webhookSecret", "merchantId", "apiKey",
             "logoUrl", "isEnabled", "isSandbox", config, "updatedAt"
      FROM "PaymentGateway" ORDER BY provider
    `
    return NextResponse.json({ gateways })
  } catch (err) {
    console.error('[payment-gateways] GET failed:', err)
    return NextResponse.json({ gateways: [] })
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

    if (isEnabled !== undefined) {
      await tdb.$queryRaw`UPDATE "PaymentGateway" SET "isEnabled" = ${Boolean(isEnabled)}, "updatedAt" = NOW() WHERE id = ${id}`
    }
    if (isSandbox !== undefined) {
      await tdb.$queryRaw`UPDATE "PaymentGateway" SET "isSandbox" = ${Boolean(isSandbox)}, "updatedAt" = NOW() WHERE id = ${id}`
    }
    if (displayName !== undefined) {
      await tdb.$queryRaw`UPDATE "PaymentGateway" SET "displayName" = ${String(displayName)}, "updatedAt" = NOW() WHERE id = ${id}`
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[payment-gateways] PUT failed:', err)
    return NextResponse.json({ error: 'Failed to update payment gateway' }, { status: 500 })
  }
}
