'use client'

import { useState, useEffect } from 'react'
import { Building2, Users, BedDouble, TrendingUp, Receipt, FileText, AlertTriangle, CheckCircle2, Clock, ArrowUpRight, ExternalLink } from 'lucide-react'
import { fmtMoney, fmtDate, daysUntil } from '@/lib/utils'

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
  domain: string
  portalUrl: string
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
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="text-sm text-slate-500 mt-1">Aggregate metrics across all HostelEase tenants.</p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Tenants" value={stats?.activeTenants ?? 0} total={stats?.totalTenants ?? 0} icon={Building2} accent="emerald" />
        <StatCard label="Total Students" value={(stats?.totalStudents ?? 0).toLocaleString()} icon={Users} accent="blue" />
        <StatCard label="Managed Beds" value={(stats?.totalBeds ?? 0).toLocaleString()} icon={BedDouble} accent="purple" />
        <StatCard label="SSM Revenue" value={fmtMoney(stats?.totalRevenue ?? 0)} icon={TrendingUp} accent="amber" />
      </div>

      {/* Alerts */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <AlertCard label="Pending Invoices" value={stats?.pendingInvoices ?? 0} icon={Receipt} color="amber" />
        <AlertCard label="Overdue Invoices" value={stats?.overdueInvoices ?? 0} icon={AlertTriangle} color="red" />
        <AlertCard label="Expiring Licenses" value={stats?.expiringLicenses ?? 0} icon={Clock} color="orange" />
      </div>

      {/* Tenant table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-sm">Licensed Tenants</h2>
            <p className="text-xs text-slate-400 mt-0.5">Schools currently using HostelEase</p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">{tenants.length} total</span>
        </div>
        {tenants.length === 0 ? (
          <div className="p-16 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No tenants yet</p>
            <p className="text-xs text-slate-400 mt-1">Add your first school to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Tenant</th>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Students</th>
                  <th className="px-5 py-3 text-right">License Fee</th>
                  <th className="px-5 py-3">Expires</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {tenants.map(t => {
                  const days = daysUntil(t.expiresAt)
                  const expiringSoon = days !== null && days <= 60 && days >= 0
                  const expired = days !== null && days < 0
                  return (
                    <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50/50 transition">
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-slate-800">{t.name}</div>
                        <div className="text-xs text-slate-400">{t.shortName}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="capitalize text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{t.plan}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                          t.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 
                          t.status === 'suspended' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            t.status === 'active' ? 'bg-emerald-500' : 
                            t.status === 'suspended' ? 'bg-red-500' : 'bg-amber-500'
                          }`} />
                          {t.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-slate-700">{t.studentCount.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-800">{fmtMoney(t.licenseFee)}</td>
                      <td className="px-5 py-3.5 text-xs">
                        {t.expiresAt ? (
                          <span className={expired ? 'text-red-600 font-medium' : expiringSoon ? 'text-amber-600 font-medium' : 'text-slate-600'}>
                            {fmtDate(t.expiresAt)}
                            {expiringSoon && <span className="block text-[10px] text-amber-500">in {days} days</span>}
                            {expired && <span className="block text-[10px] text-red-500">{Math.abs(days)} days ago</span>}
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {t.portalUrl && (
                          <a href={t.portalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                            Portal <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
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

function StatCard({ label, value, total, icon: Icon, accent }: { label: string; value: string | number; total?: number; icon: any; accent: string }) {
  const colors: Record<string, { bg: string; text: string; ring: string }> = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', ring: 'ring-purple-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-100' },
  }
  const c = colors[accent] || colors.emerald
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</div>
          <div className="text-2xl font-bold mt-1.5 text-slate-800">{value}</div>
          {total !== undefined && <div className="text-xs text-slate-400 mt-0.5">of {total} total</div>}
        </div>
        <div className={`h-10 w-10 rounded-xl grid place-items-center ${c.bg} ${c.text} ring-4 ${c.ring}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function AlertCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  const colors: Record<string, string> = {
    red: 'bg-red-50 text-red-600 border-red-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
  }
  return (
    <div className={`rounded-2xl border p-4 flex items-center gap-3 ${colors[color] || colors.amber}`}>
      <div className="h-10 w-10 rounded-xl bg-white/60 grid place-items-center shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xl font-bold">{value}</div>
        <div className="text-xs font-medium">{label}</div>
      </div>
    </div>
  )
}
