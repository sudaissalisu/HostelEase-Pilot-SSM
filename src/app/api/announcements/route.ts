import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getTenantDb } from '@/lib/tenant-db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tdb = await getTenantDb()
    const announcements = await tdb.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return NextResponse.json({ announcements })
  } catch (err) {
    return NextResponse.json({ announcements: [] })
  }
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tdb = await getTenantDb()
    const body = await req.json()
    const announcement = await tdb.announcement.create({
      data: {
        title: body.title,
        message: body.message,
        type: body.type || 'info',
        isActive: body.isActive ?? true,
        pinned: body.pinned ?? false,
      },
    })
    return NextResponse.json({ announcement })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 })
  }
}
