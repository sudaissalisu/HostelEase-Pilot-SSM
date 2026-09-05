'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ShieldCheck, Loader2, Lock, Mail, ArrowRight, Building2, Users, TrendingUp, FileText } from 'lucide-react'

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
    <div className="min-h-screen flex">
      {/* Left side — branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 relative overflow-hidden">
        {/* Decorative grid */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} />
        
        {/* Glow effect */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-emerald-600/10 rounded-full blur-[80px]" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Top — logo */}
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-emerald-600 grid place-items-center shadow-lg shadow-emerald-600/30">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold text-lg leading-tight">SSM Pilot</div>
              <div className="text-[11px] text-slate-400">HostelEase License Management</div>
            </div>
          </div>

          {/* Middle — tagline + feature highlights */}
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold leading-tight">
                Manage your<br />
                <span className="gradient-text">HostelEase</span> licenses<br />
                in one place.
              </h1>
              <p className="text-slate-400 mt-3 text-sm max-w-md">
                SSM Limited's central dashboard for tracking tenant licenses, 
                revenue, contracts, and providing support across all schools 
                using the HostelEase platform.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-md">
              <FeatureCard icon={Building2} label="Tenant Management" />
              <FeatureCard icon={FileText} label="License Tracking" />
              <FeatureCard icon={TrendingUp} label="Revenue Analytics" />
              <FeatureCard icon={Users} label="Support Access" />
            </div>
          </div>

          {/* Bottom — company info */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>SSM Limited</span>
            <span>·</span>
            <span>RC 7977037</span>
            <span>·</span>
            <span>Kano, Nigeria</span>
            <span>·</span>
            <a href="mailto:support@ssm.com.ng" className="hover:text-emerald-400 transition">support@ssm.com.ng</a>
          </div>
        </div>
      </div>

      {/* Right side — login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white grid place-items-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-sm">SSM Pilot</div>
              <div className="text-[10px] text-muted-foreground">HostelEase Management</div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your SSM credentials to access the pilot dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition text-sm"
                  placeholder="you@ssm.com.ng"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-600/20"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>
              ) : (
                <>Sign In <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              © 2024–2026 SSM Limited. All rights reserved.<br />
              RC 7977037 · Kano, Nigeria
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
      <Icon className="h-4 w-4 text-emerald-400 shrink-0" />
      <span className="text-xs text-slate-300 font-medium">{label}</span>
    </div>
  )
}
