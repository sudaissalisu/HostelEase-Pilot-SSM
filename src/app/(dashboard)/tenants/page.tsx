'use client'
import { useState, useEffect } from 'react'
import { Building2, Plus, ExternalLink, Loader2 } from 'lucide-react'
import { fmtMoney, fmtDate } from '@/lib/utils'

export default function TenantsPage() {
  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/tenants').then(r => r.json()).then(d => setTenants(d.tenants || [])).finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tenants</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage schools using HostelEase.</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium">
          <Plus className="h-4 w-4" /> Add Tenant
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
      ) : tenants.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Building2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium">No tenants yet</p>
          <p className="text-xs text-muted-foreground mt-1">Click "Add Tenant" to onboard your first school.</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {tenants.map(t => (
            <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.shortName}</div>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${t.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{t.status}</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="font-medium capitalize">{t.plan}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Students</span><span className="font-medium">{t.studentCount.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">License Fee</span><span className="font-medium">{fmtMoney(t.licenseFee)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Expires</span><span className="font-medium">{t.expiresAt ? fmtDate(t.expiresAt) : '—'}</span></div>
              </div>
              <a href={t.portalUrl} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center gap-1 text-xs text-emerald-600 hover:underline">
                <ExternalLink className="h-3 w-3" /> {t.domain}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
