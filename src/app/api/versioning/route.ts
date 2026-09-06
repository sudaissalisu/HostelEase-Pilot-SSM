import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getTenantDb } from '@/lib/tenant-db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tdb = await getTenantDb()
    const versionSetting = await tdb.$queryRaw`SELECT value FROM "SystemSetting" WHERE key = 'app_version'`
    const changelogSetting = await tdb.$queryRaw`SELECT value FROM "SystemSetting" WHERE key = 'app_changelog'`

    let version = (versionSetting as any[])[0]?.value || '1.0.0'
    let changelog: any[] = []
    const rawChangelog = (changelogSetting as any[])[0]?.value
    if (rawChangelog) {
      try { changelog = JSON.parse(rawChangelog) } catch {}
    }

    return NextResponse.json({ version, changelog })
  } catch (err) {
    return NextResponse.json({ version: '1.0.0', changelog: [] })
  }
}

export async function PUT(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tdb = await getTenantDb()
    const body = await req.json()
    const { version, changelog } = body

    if (version) {
      await tdb.$queryRaw`
        INSERT INTO "SystemSetting" (key, value, category, "updatedAt")
        VALUES ('app_version', ${version}, 'VERSIONING', NOW())
        ON CONFLICT (key) DO UPDATE SET value = ${version}, "updatedAt" = NOW()
      `
    }
    if (changelog) {
      const changelogStr = JSON.stringify(changelog)
      await tdb.$queryRaw`
        INSERT INTO "SystemSetting" (key, value, category, "updatedAt")
        VALUES ('app_changelog', ${changelogStr}, 'VERSIONING', NOW())
        ON CONFLICT (key) DO UPDATE SET value = ${changelogStr}, "updatedAt" = NOW()
      `
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
