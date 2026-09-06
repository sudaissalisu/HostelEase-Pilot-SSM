import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getTenantDb } from '@/lib/tenant-db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tdb = await getTenantDb()
    const settings = await tdb.$queryRaw`
      SELECT key, value FROM "SystemSetting"
      WHERE key IN ('school_name', 'school_code', 'school_logo_url', 'favicon_url', 'pwa_icon_url', 'tagline',
                     'institution_full_name', 'institution_short_name', 'school_address', 'school_domain', 'school_email', 'school_phone')
    `
    const branding: Record<string, string> = {}
    for (const s of (settings as any[])) {
      branding[s.key] = s.value
    }
    return NextResponse.json({ branding })
  } catch (err) {
    return NextResponse.json({ branding: {} })
  }
}

export async function PUT(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tdb = await getTenantDb()
    const body = await req.json()
    const { key, value } = body
    if (!key) return NextResponse.json({ error: 'key is required' }, { status: 400 })

    await tdb.$queryRaw`
      INSERT INTO "SystemSetting" (key, value, category, "updatedAt")
      VALUES (${key}, ${String(value || '')}, 'BRANDING', NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${String(value || '')}, "updatedAt" = NOW()
    `
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update branding' }, { status: 500 })
  }
}
