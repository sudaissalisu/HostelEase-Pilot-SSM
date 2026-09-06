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
      await tdb.systemSetting.upsert({
        where: { key: 'app_version' },
        create: { key: 'app_version', value: version, category: 'VERSIONING' },
        update: { value: version },
      })
    }
    if (changelog) {
      await tdb.systemSetting.upsert({
        where: { key: 'app_changelog' },
        create: { key: 'app_changelog', value: JSON.stringify(changelog), category: 'VERSIONING' },
        update: { value: JSON.stringify(changelog) },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update version' }, { status: 500 })
  }
}
