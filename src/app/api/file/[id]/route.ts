import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    const setting = await db.systemSetting.findUnique({ where: { key: id } })
    if (!setting) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const dataUrl = setting.value
    const match = dataUrl.match(/^data:(.+);base64,(.+)$/)
    if (!match) return NextResponse.json({ error: 'Invalid data' }, { status: 500 })

    const mimeType = match[1]
    const buffer = Buffer.from(match[2], 'base64')

    return new NextResponse(buffer, {
      headers: { 'Content-Type': mimeType, 'Cache-Control': 'public, max-age=31536000, immutable' },
    })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load file' }, { status: 500 })
  }
}
