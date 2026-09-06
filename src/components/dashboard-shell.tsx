'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { ShieldCheck, Loader2, ChevronRight, Sun, Moon } from 'lucide-react'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface SessionUser { id: string; email: string; name: string; role: string }

const ALL_PATHS = [
  { href: '/overview', label: 'Overview' }, { href: '/tenants', label: 'Tenants' },
  { href: '/licenses', label: 'Licenses' }, { href: '/invoices', label: 'Invoices' },
  { href: '/revenue', label: 'Revenue' }, { href: '/email-logs', label: 'Email Logs' },
  { href: '/analytics', label: 'Analytics' }, { href: '/audit-logs', label: 'Audit Logs' },
  { href: '/system-health', label: 'System Health' }, { href: '/alerts', label: 'Alerts' },
  { href: '/locked-students', label: 'Locked Students' }, { href: '/announcements', label: 'Announcements' },
  { href: '/support-tickets', label: 'Support' }, { href: '/student-feedback', label: 'Feedback' },
  { href: '/notifications', label: 'Notifications' }, { href: '/payment-gateways', label: 'Payment Gateways' },
  { href: '/reconciliation', label: 'Reconciliation' }, { href: '/branding', label: 'Branding' },
  { href: '/versioning', label: 'Versioning' }, { href: '/system-status', label: 'System Status' },
  { href: '/security', label: 'Security' }, { href: '/settings', label: 'Settings' },
  { href: '/legal', label: 'Legal' }, { href: '/support', label: 'Support' },
]

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
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

  const currentNav = ALL_PATHS.find(n => pathname === n.href || pathname?.startsWith(n.href + '/'))

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        {/* Header — matches shadcn dashboard-01 site-header */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border transition-[width,height] ease-linear">
          <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
            {/* Breadcrumb */}
            <span className="text-sm text-muted-foreground">SSM Pilot</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            <span className="text-sm font-medium text-foreground">{currentNav?.label || 'Dashboard'}</span>

            <div className="ml-auto flex items-center gap-2">
              {/* Status indicator */}
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                All systems operational
              </div>
              <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />
              {/* Dark mode toggle */}
              {mounted && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Main content */}
        <div className="flex flex-1 flex-col min-h-0">
          <div className="flex-1 p-4 lg:p-6 max-w-[1400px] mx-auto w-full">
            {children}
          </div>

          {/* Footer */}
          <footer className="border-t border-border py-3 px-4 lg:px-6 text-center text-xs text-muted-foreground shrink-0">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="font-medium text-foreground">SSM Limited</span>
              <span>·</span><span>RC 7977037</span><span>·</span><span>Kano, Nigeria</span><span>·</span>
              <a href="mailto:support@ssm.com.ng" className="hover:text-primary transition">support@ssm.com.ng</a>
            </div>
            <div className="mt-0.5 text-[10px]">HostelEase is developed & owned by SSM Limited. Operated under license. © 2024–2026</div>
          </footer>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
