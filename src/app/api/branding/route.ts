import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// Branding settings are stored in the SSM Pilot's OWN database.
// PUT accepts EITHER { key, value } for a single field OR { ...fields }
// for bulk update (all fields at once).

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

    // If the body has a single `key` field, update just that one.
    if (body.key && typeof body.key === 'string') {
      await db.systemSetting.upsert({
        where: { key: body.key },
        create: { key: body.key, value: String(body.value || ''), category: 'BRANDING' },
        update: { value: String(body.value || '') },
      })
      return NextResponse.json({ ok: true })
    }

    // Otherwise, treat the body as a bulk update of multiple branding fields.
    // This is what the branding-manager UI sends — the entire form object.
    const allowedKeys = [
      'school_name', 'school_code', 'school_logo_url', 'favicon_url', 'pwa_icon_url',
      'tagline', 'institution_full_name', 'institution_short_name', 'school_address',
      'school_domain', 'school_email', 'school_phone',
    ]

    const updates: Promise<unknown>[] = []
    for (const key of allowedKeys) {
      if (body[key] !== undefined) {
        const value = String(body[key] || '')
        updates.push(
          db.systemSetting.upsert({
            where: { key },
            create: { key, value, category: 'BRANDING' },
            update: { value },
          })
        )
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid branding fields provided' }, { status: 400 })
    }

    await Promise.all(updates)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[branding] PUT failed:', err)
    return NextResponse.json({ error: 'Failed to update branding' }, { status: 500 })
  }
}
