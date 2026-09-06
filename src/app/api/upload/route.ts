import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']
  if (!allowedMimes.includes(file.type)) {
    return NextResponse.json({ error: `File type "${file.type}" not allowed` }, { status: 400 })
  }

  const MAX_SIZE = 5 * 1024 * 1024
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large. Max 5MB.' }, { status: 400 })

  const bytes = Buffer.from(await file.arrayBuffer())
  const dataUrl = `data:${file.type};base64,${bytes.toString('base64')}`
  const key = `ssm-upload-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`

  await db.$queryRaw`
    INSERT INTO "SystemSetting" (key, value, category, "updatedAt")
    VALUES (${key}, ${dataUrl}, 'SSM_FILE_UPLOAD', NOW())
  `

  return NextResponse.json({ url: `/api/file/${key}`, key, size: file.size, mimeType: file.type })
}
