import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

// Root page — redirect to dashboard or login
export default async function RootPage() {
  const session = await getSession()
  if (session) redirect('/overview')
  redirect('/login')
}
