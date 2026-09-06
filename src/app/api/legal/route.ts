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
      const result = await tdb.$queryRaw`SELECT value, "updatedAt" FROM "SystemSetting" WHERE key = ${`legal_${page}`}`
      const setting = (result as any[])[0]
      if (!setting) return NextResponse.json({ page: null })
      try {
        const parsed = JSON.parse(setting.value)
        return NextResponse.json({ page: parsed })
      } catch {
        return NextResponse.json({ page: { title: page, body: setting.value, updatedAt: setting.updatedAt } })
      }
    }

    const legalSettings = await tdb.$queryRaw`SELECT key, value FROM "SystemSetting" WHERE key LIKE 'legal_%'`
    const pages: Record<string, any> = {}
    for (const s of (legalSettings as any[])) {
      try { pages[s.key.replace('legal_', '')] = JSON.parse(s.value) } catch {}
    }
    return NextResponse.json({ pages })
  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
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

    await tdb.$queryRaw`
      INSERT INTO "SystemSetting" (key, value, category, "updatedAt")
      VALUES (${key}, ${value}, 'LEGAL', NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${value}, "updatedAt" = NOW()
    `

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
