'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  ShieldCheck, LayoutDashboard, Building2, FileText, Receipt,
  TrendingUp, LifeBuoy, LogOut, Menu, X, Loader2, ChevronRight,
  Mail, BarChart3, Scale, CreditCard, Activity, AlertTriangle,
  Lock, Bell, MessageSquare, Server, GitBranch, Palette, Settings,
  Shield,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface SessionUser { id: string; email: string; name: string; role: string }

const SECTIONS = [
  {
    title: 'Main',
    items: [
      { href: '/overview', label: 'Overview', icon: LayoutDashboard },
      { href: '/tenants', label: 'Tenants', icon: Building2 },
      { href: '/licenses', label: 'Licenses', icon: FileText },
      { href: '/invoices', label: 'Invoices', icon: Receipt },
      { href: '/revenue', label: 'Revenue', icon: TrendingUp },
    ]
  },
  {
    title: 'Observability',
    items: [
      { href: '/email-logs', label: 'Email Logs', icon: Mail },
      { href: '/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/audit-logs', label: 'Audit Logs', icon: ShieldCheck },
      { href: '/system-health', label: 'System Health', icon: Activity },
      { href: '/alerts', label: 'Alerts & IP Block', icon: AlertTriangle },
      { href: '/locked-students', label: 'Locked Students', icon: Lock },
    ]
  },
  {
    title: 'Communication',
    items: [
      { href: '/announcements', label: 'Announcements', icon: Bell },
      { href: '/support-tickets', label: 'Support Tickets', icon: LifeBuoy },
      { href: '/student-feedback', label: 'Student Feedback', icon: MessageSquare },
      { href: '/notifications', label: 'Notifications', icon: Bell },
    ]
  },
  {
    title: 'System',
    items: [
      { href: '/payment-gateways', label: 'Payment Gateways', icon: CreditCard },
      { href: '/reconciliation', label: 'Reconciliation', icon: BarChart3 },
      { href: '/branding', label: 'Branding', icon: Palette },
      { href: '/versioning', label: 'Versioning', icon: GitBranch },
      { href: '/system-status', label: 'System Status', icon: Server },
      { href: '/security', label: 'Security Center', icon: Shield },
      { href: '/settings', label: 'Settings', icon: Settings },
      { href: '/legal', label: 'Legal', icon: Scale },
    ]
  },
]

const ALL_ITEMS = SECTIONS.flatMap(s => s.items)

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.user) setUser(d.user)
      else router.push('/login')
    }).catch(() => router.push('/login')).finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary grid place-items-center animate-pulse">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (!user) return null

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const currentNav = ALL_ITEMS.find(n => pathname === n.href || pathname?.startsWith(n.href + '/'))

  return (
    <div className="min-h-screen flex bg-slate-50">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-xl bg-white shadow-md border border-slate-200"
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-slate-900 flex flex-col z-40 transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary grid place-items-center shrink-0 shadow-lg shadow-primary/30">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm text-white leading-tight">SSM Pilot</div>
              <div className="text-[10px] text-slate-500">HostelEase Management</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto">
          {SECTIONS.map((section, si) => (
            <div key={section.title} className={si > 0 ? 'mt-4' : ''}>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">{section.title}</div>
              {section.items.map(item => {
                const active = pathname === item.href || pathname?.startsWith(item.href + '/')
                return (
                  <button
                    key={item.href}
                    onClick={() => { router.push(item.href); setSidebarOpen(false) }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      active ? 'bg-primary/15 text-primary' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center gap-2.5 mb-2 px-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="text-xs font-medium text-white truncate">{user.name}</div>
              <div className="text-[10px] text-slate-500 truncate">{user.email}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <main className="flex-1 min-w-0 flex flex-col">
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-3 hidden lg:block">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400">SSM Pilot</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
              <span className="font-medium text-slate-700">{currentNav?.label || 'Dashboard'}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              All systems operational
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>

        <footer className="border-t border-slate-200 py-4 px-8 text-center text-xs text-slate-400">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="font-medium text-slate-500">SSM Limited</span>
            <span>·</span><span>RC 7977037</span><span>·</span><span>Kano, Nigeria</span><span>·</span>
            <a href="mailto:support@ssm.com.ng" className="hover:text-primary transition">support@ssm.com.ng</a>
          </div>
          <div className="mt-1 text-[10px]">HostelEase is developed & owned by SSM Limited. Operated under license. © 2024–2026</div>
        </footer>
      </main>
    </div>
  )
}
