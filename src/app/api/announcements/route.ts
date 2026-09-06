import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getTenantDb } from '@/lib/tenant-db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tdb = await getTenantDb()
    const announcements = await tdb.$queryRaw`
      SELECT id, title, message, type, "isActive", pinned, "createdAt", "updatedAt"
      FROM "Announcement"
      ORDER BY "createdAt" DESC
      LIMIT 50
    `
    return NextResponse.json({ announcements })
  } catch (err) {
    console.error('[announcements] GET failed:', err)
    return NextResponse.json({ announcements: [] })
  }
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tdb = await getTenantDb()
    const body = await req.json()
    const result = await tdb.$queryRaw`
      INSERT INTO "Announcement" (id, title, message, type, "isActive", pinned, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${body.title}, ${body.message}, ${body.type || 'info'}, ${body.isActive ?? true}, ${body.pinned ?? false}, NOW(), NOW())
      RETURNING id, title, message, type, "isActive", pinned, "createdAt"
    `
    return NextResponse.json({ announcement: (result as any[])[0] })
  } catch (err) {
    console.error('[announcements] POST failed:', err)
    return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 })
  }
}
