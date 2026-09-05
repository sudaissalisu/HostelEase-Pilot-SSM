'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ShieldCheck, Loader2, Lock, Mail } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Login failed')
      toast.success('Welcome to SSM Pilot')
      router.push('/overview')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 mb-4">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">SSM Pilot</h1>
          <p className="text-sm text-muted-foreground mt-1">HostelEase License Management Dashboard</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition" placeholder="you@ssm.com.ng" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition" placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</> : 'Sign In'}
          </button>
        </form>
        <div className="text-center mt-6 text-xs text-muted-foreground">
          <p>SSM Limited · RC 7977037 · Kano, Nigeria</p>
          <p className="mt-0.5">support@ssm.com.ng</p>
          <p className="mt-2 text-[10px]">© 2024–2026 SSM Limited. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
