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

    return NextResponse.json({ version, current: changelog[changelog.length - 1] || null, changelog })
  } catch (err) {
    return NextResponse.json({ version: '1.0.0', changelog: [] })
  }
}
