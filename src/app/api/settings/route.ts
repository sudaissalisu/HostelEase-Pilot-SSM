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

    const where: any = {}
    if (category) where.category = category
    // Exclude FILE_UPLOAD (base64 data) and SMTP secrets
    where.category = { not: 'FILE_UPLOAD' }
    if (category) where.category = category

    const settings = await tdb.systemSetting.findMany({
      where,
      orderBy: { category: 'asc' },
      select: { key: true, value: true, category: true },
    })

    const grouped: Record<string, Record<string, string>> = {}
    for (const s of settings) {
      if (s.value && s.value.startsWith('data:') && s.value.length > 1000) continue
      if (!grouped[s.category]) grouped[s.category] = {}
      grouped[s.category][s.key] = s.value
    }

    return NextResponse.json({ settings: grouped, raw: settings })
  } catch (err) {
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
    await tdb.systemSetting.upsert({
      where: { key },
      create: { key, value: String(value || ''), category: effectiveCategory },
      update: { value: String(value || ''), category: effectiveCategory },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 })
  }
}
