'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  ShieldCheck, LayoutDashboard, LifeBuoy, LogOut, Menu, X, Loader2,
  ChevronRight, Sun, Moon, FileText, Settings, Palette, Scale,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SessionUser { id: string; email: string; name: string; role: string }

const SECTIONS = [
  {
    title: 'Command Center',
    items: [
      { href: '/overview', label: 'Dashboard', icon: LayoutDashboard },
    ]
  },
  {
    title: 'Financials',
    items: [
      { href: '/financials', label: 'Licenses & Invoices', icon: FileText },
    ]
  },
  {
    title: 'Monitoring',
    items: [
      { href: '/monitoring', label: 'System Monitoring', icon: ShieldCheck },
    ]
  },
  {
    title: 'Management',
    items: [
      { href: '/support', label: 'Tenant Support', icon: LifeBuoy },
      { href: '/settings', label: 'Settings', icon: Settings },
      { href: '/branding', label: 'SSM Branding', icon: Palette },
      { href: '/legal', label: 'Legal & IP', icon: Scale },
    ]
  },
]

const ALL_ITEMS = SECTIONS.flatMap(s => s.items)

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.user) setUser(d.user)
      else router.push('/login')
    }).catch(() => router.push('/login')).finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary grid place-items-center animate-pulse">
            <ShieldCheck className="h-6 w-6 text-primary-foreground" />
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
    <div className="min-h-screen flex bg-background">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-xl bg-card shadow-md border border-border"
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <aside className={cn(
        'fixed lg:sticky top-0 left-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-40 transition-transform shrink-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary grid place-items-center shrink-0 shadow-lg shadow-primary/20">
              <ShieldCheck className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-bold text-sm text-sidebar-foreground leading-tight">SSM Pilot</div>
              <div className="text-[10px] text-muted-foreground">HostelEase Management</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2 overflow-y-auto">
          {SECTIONS.map((section, si) => (
            <div key={section.title} className={si > 0 ? 'mt-3' : ''}>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{section.title}</div>
              {section.items.map(item => {
                const active = pathname === item.href || pathname?.startsWith(item.href + '/')
                return (
                  <button
                    key={item.href}
                    onClick={() => { router.push(item.href); setSidebarOpen(false) }}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition mb-0.5',
                      active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="text-xs font-medium text-sidebar-foreground truncate">{user.name}</div>
                <div className="text-[10px] text-muted-foreground truncate">{user.email}</div>
              </div>
            </div>
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-1.5 rounded-lg hover:bg-sidebar-accent text-muted-foreground"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            )}
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <main className="flex-1 min-w-0 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border px-4 lg:px-6 py-3 hidden lg:flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">SSM Pilot</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            <span className="font-medium text-foreground">{currentNav?.label || 'Dashboard'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            All systems operational
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-6 max-w-[1400px] mx-auto w-full">
          {children}
        </div>

        <footer className="border-t border-border py-3 px-4 lg:px-6 text-center text-xs text-muted-foreground shrink-0">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="font-medium text-foreground">SSM Limited</span>
            <span>·</span><span>RC 7977037</span><span>·</span><span>Kano, Nigeria</span><span>·</span>
            <a href="mailto:support@ssm.com.ng" className="hover:text-primary transition">support@ssm.com.ng</a>
          </div>
          <div className="mt-0.5 text-[10px]">HostelEase is developed & owned by SSM Limited. Operated under license. © 2024–2026</div>
        </footer>
      </main>
    </div>
  )
}
