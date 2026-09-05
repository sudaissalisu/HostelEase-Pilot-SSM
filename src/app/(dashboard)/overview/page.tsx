'use client'

import { useState, useEffect } from 'react'
import { Building2, Users, BedDouble, TrendingUp, Receipt, FileText, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { fmtMoney, fmtDate, fmtRelative, daysUntil } from '@/lib/utils'

interface Tenant {
  id: string
  name: string
  shortName: string
  plan: string
  status: string
  licenseFee: number
  startedAt: string
  expiresAt: string | null
  studentCount: number
  bedCount: number
  staffCount: number
}

interface Stats {
  totalTenants: number
  activeTenants: number
  totalStudents: number
  totalBeds: number
  totalRevenue: number
  pendingInvoices: number
  overdueInvoices: number
  expiringLicenses: number
}

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/overview').then(r => r.json()).then(d => {
      if (d.stats) setStats(d.stats)
      if (d.tenants) setTenants(d.tenants)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Aggregate metrics across all HostelEase tenants.</p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Tenants" value={stats?.activeTenants ?? 0} icon={Building2} accent="emerald" hint={`${stats?.totalTenants ?? 0} total`} />
        <StatCard label="Total Students" value={stats?.totalStudents ?? 0} icon={Users} accent="blue" hint="Across all tenants" />
        <StatCard label="Total Beds" value={stats?.totalBeds ?? 0} icon={BedDouble} accent="purple" hint="Managed beds" />
        <StatCard label="SSM Revenue" value={fmtMoney(stats?.totalRevenue ?? 0)} icon={TrendingUp} accent="amber" hint="Licensing fees collected" />
      </div>

      {/* Alerts */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <AlertCard label="Pending Invoices" value={stats?.pendingInvoices ?? 0} icon={Receipt} color="amber" />
        <AlertCard label="Overdue Invoices" value={stats?.overdueInvoices ?? 0} icon={AlertTriangle} color="red" />
        <AlertCard label="Expiring Licenses" value={stats?.expiringLicenses ?? 0} icon={Clock} color="orange" />
      </div>

      {/* Tenant table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-semibold text-sm">Licensed Tenants</h2>
        </div>
        {tenants.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
            No tenants yet. Add your first school to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold text-muted-foreground">
                  <th className="p-3">Tenant</th>
                  <th className="p-3">Plan</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Students</th>
                  <th className="p-3 text-right">License Fee</th>
                  <th className="p-3">Expires</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map(t => {
                  const days = daysUntil(t.expiresAt)
                  const expiringSoon = days !== null && days <= 60 && days >= 0
                  const expired = days !== null && days < 0
                  return (
                    <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="p-3">
                        <div className="font-medium">{t.name}</div>
                        <div className="text-xs text-muted-foreground">{t.shortName}</div>
                      </td>
                      <td className="p-3"><span className="capitalize text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100">{t.plan}</span></td>
                      <td className="p-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${t.status === 'active' ? 'bg-emerald-100 text-emerald-700' : t.status === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="p-3 text-right font-medium">{t.studentCount.toLocaleString()}</td>
                      <td className="p-3 text-right font-semibold">{fmtMoney(t.licenseFee)}</td>
                      <td className="p-3 text-xs">
                        {t.expiresAt ? (
                          <span className={expired ? 'text-red-600 font-medium' : expiringSoon ? 'text-amber-600 font-medium' : ''}>
                            {fmtDate(t.expiresAt)}
                            {expiringSoon && <span className="block text-[10px]">in {days} days</span>}
                            {expired && <span className="block text-[10px]">{Math.abs(days)} days ago</span>}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, accent, hint }: { label: string; value: string | number; icon: any; accent: string; hint?: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
          <div className="text-2xl font-bold mt-1">{value}</div>
          {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
        </div>
        <div className={`h-10 w-10 rounded-lg grid place-items-center ${colors[accent] || colors.emerald}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function AlertCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  const colors: Record<string, string> = {
    red: 'bg-red-50 text-red-600 border-red-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
  }
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${colors[color] || colors.amber}`}>
      <Icon className="h-5 w-5 shrink-0" />
      <div>
        <div className="text-xl font-bold">{value}</div>
        <div className="text-xs font-medium">{label}</div>
      </div>
    </div>
  )
}
