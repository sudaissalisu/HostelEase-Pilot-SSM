import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getTenantDb } from '@/lib/tenant-db'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tdb = await getTenantDb()
    const url = new URL(req.url)
    const page = url.searchParams.get('page')

    if (page) {
      const setting = await tdb.systemSetting.findUnique({ where: { key: `legal_${page}` } })
      if (!setting) return NextResponse.json({ page: null })
      try {
        const parsed = JSON.parse(setting.value)
        return NextResponse.json({ page: parsed })
      } catch {
        return NextResponse.json({ page: { title: page, body: setting.value, updatedAt: setting.updatedAt.toISOString() } })
      }
    }

    // Return all legal pages
    const legalSettings = await tdb.systemSetting.findMany({
      where: { key: { startsWith: 'legal_' } },
    })
    const pages: Record<string, any> = {}
    for (const s of legalSettings) {
      try { pages[s.key.replace('legal_', '')] = JSON.parse(s.value) } catch {}
    }
    return NextResponse.json({ pages })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch legal pages' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tdb = await getTenantDb()
    const body = await req.json()
    const { page, title, body: content } = body

    const key = `legal_${page}`
    const value = JSON.stringify({ title, body: content, updatedAt: new Date().toISOString() })

    await tdb.systemSetting.upsert({
      where: { key },
      create: { key, value, category: 'LEGAL' },
      update: { value, category: 'LEGAL' },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update legal page' }, { status: 500 })
  }
}
