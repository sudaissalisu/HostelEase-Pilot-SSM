import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// Branding settings are stored in the SSM Pilot's OWN database (not the
// tenant's hostel database). This keeps SSM's branding separate from
// each tenant's branding.

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const settings = await db.systemSetting.findMany({
      where: { category: 'BRANDING' },
      select: { key: true, value: true },
    })
    const branding: Record<string, string> = {}
    for (const s of settings) {
      branding[s.key] = s.value
    }
    return NextResponse.json({ branding })
  } catch (err) {
    console.error('[branding] GET failed:', err)
    return NextResponse.json({ branding: {} })
  }
}

export async function PUT(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { key, value } = body
    if (!key) return NextResponse.json({ error: 'key is required' }, { status: 400 })

    await db.systemSetting.upsert({
      where: { key },
      create: { key, value: String(value || ''), category: 'BRANDING' },
      update: { value: String(value || '') },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[branding] PUT failed:', err)
    return NextResponse.json({ error: 'Failed to update branding' }, { status: 500 })
  }
}
