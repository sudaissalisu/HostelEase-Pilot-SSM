'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, RefreshCw, Save, Settings, Shield, Mail, MessageSquare, Bot, Wrench, Database, Search } from 'lucide-react'
import { toast } from 'sonner'

const CATEGORY_META: Record<string, { label: string; icon: any; desc: string }> = {
  GENERAL: { label: 'General', icon: Settings, desc: 'Institution-wide preferences' },
  SECURITY: { label: 'Security', icon: Shield, desc: 'Security settings, 2FA, lockouts' },
  EMAIL: { label: 'Email', icon: Mail, desc: 'Email provider + delivery settings' },
  SMS: { label: 'SMS', icon: MessageSquare, desc: 'SMS gateway (Termii)' },
  AI: { label: 'AI Assistant', icon: Bot, desc: 'AI agent configuration' },
  MAINTENANCE: { label: 'Maintenance', icon: Wrench, desc: 'Maintenance mode + messaging' },
  BACKUP: { label: 'Backup & Recovery', icon: Database, desc: 'Database backup settings' },
  PAYMENT: { label: 'Payment', icon: Settings, desc: 'Payment configuration' },
  ALLOCATION: { label: 'Allocation', icon: Settings, desc: 'Bed allocation settings' },
  BRANDING: { label: 'Branding', icon: Settings, desc: 'School branding + logos' },
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, Record<string, string>>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [editedValues, setEditedValues] = useState<Record<string, string>>({})

  function load() {
    setLoading(true)
    fetch('/api/tenant-data?type=settings').then(r => r.json()).then(d => {
      setSettings(d.settings || {})
      const cats = Object.keys(d.settings || {})
      if (cats.length > 0 && !activeCategory) setActiveCategory(cats[0])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function saveSetting(key: string, value: string, category: string) {
    setSaving(key)
    try {
      const res = await fetch('/api/tenant-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value, category }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to save')
      toast.success(`Saved: ${key}`)
      // Update local state
      setSettings(prev => ({
        ...prev,
        [category]: { ...prev[category], [key]: value }
      }))
      // Clear edit
      setEditedValues(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  const categories = Object.keys(settings).sort()
  const filteredCategories = search
    ? categories.filter(cat => {
        const items = settings[cat] || {}
        return Object.entries(items).some(([k, v]) =>
          k.toLowerCase().includes(search.toLowerCase()) ||
          v.toLowerCase().includes(search.toLowerCase()) ||
          cat.toLowerCase().includes(search.toLowerCase())
        )
      })
    : categories

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage AUSU's institution-wide preferences — payment, email, security, and more.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" /> Refresh</Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search settings..."
          className="pl-10"
        />
      </div>

      {/* Category tabs */}
      {categories.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Settings className="h-10 w-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No settings configured</p>
            <p className="text-xs text-slate-400 mt-1">Settings will appear here once AUSU's admin configures them.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-wrap gap-2">
          {filteredCategories.map(cat => {
            const meta = CATEGORY_META[cat] || { label: cat, icon: Settings, desc: '' }
            const count = Object.keys(settings[cat] || {}).length
            const isActive = activeCategory === cat
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition border ${
                  isActive
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                <meta.icon className="h-4 w-4" />
                {meta.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-slate-100'}`}>{count}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Settings cards for active category */}
      {activeCategory && settings[activeCategory] && (
        <div className="space-y-3">
          {Object.entries(settings[activeCategory])
            .filter(([k, v]) =>
              !search ||
              k.toLowerCase().includes(search.toLowerCase()) ||
              v.toLowerCase().includes(search.toLowerCase())
            )
            .map(([key, value]) => {
              const edited = editedValues[key]
              const currentValue = edited !== undefined ? edited : value
              const isLong = value.length > 100
              const isSecret = key.toLowerCase().includes('secret') || key.toLowerCase().includes('password') || key.toLowerCase().includes('key')
              const displayValue = isSecret && !edited ? '••••••••' : currentValue

              return (
                <Card key={key}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Label className="text-sm font-medium font-mono">{key}</Label>
                          {isSecret && <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200">SECRET</Badge>}
                          {edited !== undefined && <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-700 border-blue-200">MODIFIED</Badge>}
                        </div>
                        {isLong ? (
                          <textarea
                            value={displayValue}
                            onChange={(e) => setEditedValues(prev => ({ ...prev, [key]: e.target.value }))}
                            className="w-full text-xs font-mono p-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition min-h-[80px] resize-y"
                          />
                        ) : (
                          <Input
                            value={displayValue}
                            onChange={(e) => setEditedValues(prev => ({ ...prev, [key]: e.target.value }))}
                            className="text-xs font-mono"
                          />
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={edited !== undefined ? "default" : "outline"}
                        disabled={saving === key || edited === undefined}
                        onClick={() => saveSetting(key, currentValue, activeCategory)}
                        className="shrink-0"
                      >
                        {saving === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                        {edited !== undefined ? 'Save' : 'Saved'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
        </div>
      )}
    </div>
  )
}
