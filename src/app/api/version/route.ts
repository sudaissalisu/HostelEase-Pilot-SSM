import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getTenantDb } from '@/lib/tenant-db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tdb = await getTenantDb()
    const versionSetting = await tdb.systemSetting.findUnique({ where: { key: 'app_version' } })
    const changelogSetting = await tdb.systemSetting.findUnique({ where: { key: 'app_changelog' } })

    let version = versionSetting?.value || '1.0.0'
    let changelog: any[] = []
    if (changelogSetting?.value) {
      try { changelog = JSON.parse(changelogSetting.value) } catch {}
    }

    return NextResponse.json({ version, current: changelog[changelog.length - 1] || null, changelog })
  } catch (err) {
    return NextResponse.json({ version: '1.0.0', changelog: [] })
  }
}
