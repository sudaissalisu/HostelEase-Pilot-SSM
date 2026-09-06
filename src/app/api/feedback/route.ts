import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getTenantDb } from '@/lib/tenant-db'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tdb = await getTenantDb()
    const url = new URL(req.url)
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
    const pageSize = Math.min(100, Math.max(10, parseInt(url.searchParams.get('pageSize') || '50', 10)))

    const countResult = await tdb.$queryRaw`SELECT COUNT(*)::int as count FROM "Feedback"`
    const total = (countResult as any[])[0]?.count || 0

    const feedback = await tdb.$queryRaw`
      SELECT f.id, f.rating, f.comment, f."createdAt", f."userId",
             u.name, u.email, u."avatarUrl"
      FROM "Feedback" f LEFT JOIN "User" u ON f."userId" = u.id
      ORDER BY f."createdAt" DESC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
    `

    return NextResponse.json({ feedback, total, pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } })
  } catch (err) {
    return NextResponse.json({ feedback: [], total: 0 })
  }
}
