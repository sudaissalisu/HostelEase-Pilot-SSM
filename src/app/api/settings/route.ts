import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getTenantDb } from '@/lib/tenant-db'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tdb = await getTenantDb()
    const url = new URL(req.url)
    const category = url.searchParams.get('category')

    let whereClause = `WHERE category != 'FILE_UPLOAD'`
    const params: any[] = []
    if (category) {
      whereClause += ` AND category = $1`
      params.push(category)
    }

    const settings = await tdb.$queryRawUnsafe(
      `SELECT key, value, category FROM "SystemSetting" ${whereClause} ORDER BY category ASC`,
      ...params
    )

    const grouped: Record<string, Record<string, string>> = {}
    for (const s of (settings as any[])) {
      if (s.value && s.value.startsWith('data:') && s.value.length > 1000) continue
      if (!grouped[s.category]) grouped[s.category] = {}
      grouped[s.category][s.key] = s.value
    }

    return NextResponse.json({ settings: grouped, raw: settings })
  } catch (err) {
    console.error('[settings] GET failed:', err)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tdb = await getTenantDb()
    const body = await req.json()
    const { key, value, category } = body
    if (!key) return NextResponse.json({ error: 'key is required' }, { status: 400 })

    const effectiveCategory = category || 'GENERAL'
    await tdb.$queryRaw`
      INSERT INTO "SystemSetting" (key, value, category, "updatedAt")
      VALUES (${key}, ${String(value || '')}, ${effectiveCategory}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${String(value || '')}, category = ${effectiveCategory}, "updatedAt" = NOW()
    `

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[settings] PUT failed:', err)
    return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 })
  }
}
