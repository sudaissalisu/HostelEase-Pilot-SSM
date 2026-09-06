"use client"

import * as React from "react"
import {
  ShieldCheck, LayoutDashboard, Building2, FileText, Receipt,
  TrendingUp, LifeBuoy, LogOut, Mail, BarChart3, Scale, CreditCard,
  Activity, AlertTriangle, Lock, Bell, MessageSquare, Server,
  GitBranch, Palette, Settings, Shield, ChevronRight, ChevronDown,
} from "lucide-react"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail,
} from "@/components/ui/sidebar"
import { useRouter, usePathname } from "next/navigation"

interface SessionUser { id: string; email: string; name: string; role: string }

const MAIN_NAV = [
  { title: 'Overview', url: '/overview', icon: LayoutDashboard, isActive: false },
  { title: 'Tenants', url: '/tenants', icon: Building2, isActive: false },
  { title: 'Licenses', url: '/licenses', icon: FileText, isActive: false },
  { title: 'Invoices', url: '/invoices', icon: Receipt, isActive: false },
  { title: 'Revenue', url: '/revenue', icon: TrendingUp, isActive: false },
  {
    title: 'Observability',
    url: '#',
    icon: BarChart3,
    isActive: false,
    items: [
      { title: 'Email Logs', url: '/email-logs', icon: Mail },
      { title: 'Analytics', url: '/analytics', icon: BarChart3 },
      { title: 'Audit Logs', url: '/audit-logs', icon: ShieldCheck },
      { title: 'System Health', url: '/system-health', icon: Activity },
      { title: 'Alerts & IP Block', url: '/alerts', icon: AlertTriangle },
      { title: 'Locked Students', url: '/locked-students', icon: Lock },
    ]
  },
  {
    title: 'Communication',
    url: '#',
    icon: Bell,
    isActive: false,
    items: [
      { title: 'Announcements', url: '/announcements', icon: Bell },
      { title: 'Support Tickets', url: '/support-tickets', icon: LifeBuoy },
      { title: 'Student Feedback', url: '/student-feedback', icon: MessageSquare },
      { title: 'Notifications', url: '/notifications', icon: Bell },
    ]
  },
  {
    title: 'System',
    url: '#',
    icon: Settings,
    isActive: false,
    items: [
      { title: 'Payment Gateways', url: '/payment-gateways', icon: CreditCard },
      { title: 'Reconciliation', url: '/reconciliation', icon: BarChart3 },
      { title: 'Branding', url: '/branding', icon: Palette },
      { title: 'Versioning', url: '/versioning', icon: GitBranch },
      { title: 'System Status', url: '/system-status', icon: Server },
      { title: 'Security Center', url: '/security', icon: Shield },
      { title: 'Settings', url: '/settings', icon: Settings },
      { title: 'Legal', url: '/legal', icon: Scale },
    ]
  },
]

const SECONDARY_NAV = [
  { title: 'Support', url: '/support', icon: LifeBuoy },
  { title: 'Legal', url: '/legal', icon: Scale },
]

export function AppSidebar({ user, ...props }: { user: SessionUser | null } & React.ComponentProps<typeof Sidebar>) {
  const router = useRouter()
  const pathname = usePathname()

  // Update isActive based on current path
  const navItems = MAIN_NAV.map(item => {
    if (item.items) {
      return {
        ...item,
        isActive: item.items.some(sub => pathname === sub.url || pathname?.startsWith(sub.url + '/')),
        items: item.items.map(sub => ({
          ...sub,
          isActive: pathname === sub.url || pathname?.startsWith(sub.url + '/'),
        }))
      }
    }
    return {
      ...item,
      isActive: pathname === item.url || pathname?.startsWith(item.url + '/'),
    }
  })

  const userData = user ? {
    name: user.name,
    email: user.email,
    avatar: user.name.charAt(0).toUpperCase(),
  } : undefined

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="h-8 w-8 rounded-lg bg-primary grid place-items-center shrink-0">
            <ShieldCheck className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight">SSM Pilot</span>
            <span className="text-[10px] text-muted-foreground">HostelEase Management</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
        <NavSecondary items={SECONDARY_NAV} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        {userData && <NavUser user={userData} onLogout={handleLogout} />}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
