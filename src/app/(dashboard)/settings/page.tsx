'use client'
import { useState, useEffect } from 'react'
import { PageHeader, EmptyState } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Loader2, Save, Settings, Shield, Mail, MessageSquare, Bot, Wrench, Building, Layers, HardDriveDownload, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const TAB_META = [
  { key: 'GENERAL', label: 'General', icon: Building, description: 'Institution identity & contact details' },
  { key: 'SECURITY', label: 'Security', icon: Shield, description: 'Login attempt & lockout policies' },
  { key: 'EMAIL', label: 'Email', icon: Mail, description: 'SMTP server configuration' },
  { key: 'SMS', label: 'SMS', icon: MessageSquare, description: 'SMS gateway & sender identity' },
  { key: 'ALLOCATION', label: 'Allocation', icon: Layers, description: 'Application window & bed lock duration' },
  { key: 'AI', label: 'AI Assistant', icon: Bot, description: 'AI provider & agent settings' },
  { key: 'MAINTENANCE', label: 'Maintenance', icon: Wrench, description: 'Maintenance mode & kill switch' },
  { key: 'BACKUP', label: 'Backup', icon: HardDriveDownload, description: 'Database backups & retention' },
  { key: 'BRANDING', label: 'Branding', icon: Settings, description: 'School branding & logos' },
  { key: 'PAYMENT', label: 'Payment', icon: Settings, description: 'Payment configuration' },
]

function niceLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function isSecretKey(key: string): boolean {
  const k = key.toLowerCase()
  return k.includes('secret') || k.includes('password') || k.includes('key') || k.includes('token') || k.includes('pass')
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, Record<string, string>>>({})
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('')

  function load() {
    setLoading(true)
    fetch('/api/tenant-data?type=settings').then(r => r.json()).then(d => {
      setSettings(d.settings || {})
      setDrafts(d.settings || {})
      const cats = Object.keys(d.settings || {})
      if (cats.length > 0) setActiveTab(cats[0])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function saveSetting(key: string, category: string) {
    setSavingKey(key)
    try {
      const value = drafts[category]?.[key] ?? ''
      const res = await fetch('/api/tenant-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value, category }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to save')
      toast.success(`Saved: ${niceLabel(key)}`)
      setSettings(prev => ({ ...prev, [category]: { ...prev[category], [key]: value } }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSavingKey(null)
    }
  }

  function updateDraft(category: string, key: string, value: string) {
    setDrafts(prev => ({
      ...prev,
      [category]: { ...(prev[category] || {}), [key]: value }
    }))
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="System Settings" description="Manage AUSU's institution-wide preferences." />
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    )
  }

  const allCategories = Object.keys(settings).sort()
  const knownTabs = TAB_META.filter(t => settings[t.key] && Object.keys(settings[t.key]).length > 0)
  const extraCategories = allCategories.filter(c => !TAB_META.find(t => t.key === c) && settings[c] && Object.keys(settings[c]).length > 0)
  const allTabs = [...knownTabs, ...extraCategories.map(c => ({ key: c, label: c, icon: Settings, description: '' }))]

  return (
    <div>
      <PageHeader
        title="System Settings"
        description="Manage AUSU's institution-wide preferences — payment, email, security, and more."
        actions={<Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" /> Refresh</Button>}
      />

      {allTabs.length === 0 ? (
        <Card><CardContent className="p-0"><EmptyState icon={Settings} title="No settings configured" description="Settings will appear here once AUSU's admin configures them." /></CardContent></Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto gap-1 mb-4 bg-card border border-border p-1 rounded-xl">
            {allTabs.map(tab => (
              <TabsTrigger key={tab.key} value={tab.key} className="gap-1.5 text-xs rounded-lg">
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {allTabs.map(tab => {
            const catSettings = settings[tab.key] || {}
            const fields = Object.entries(catSettings).sort(([a], [b]) => a.localeCompare(b))

            return (
              <TabsContent key={tab.key} value={tab.key}>
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    {/* Tab header */}
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                      <tab.icon className="h-5 w-5 text-primary" />
                      <div>
                        <h3 className="font-semibold text-base">{tab.label}</h3>
                        {tab.description && <p className="text-xs text-muted-foreground">{tab.description}</p>}
                      </div>
                      <Badge variant="secondary" className="ml-auto">{fields.length} settings</Badge>
                    </div>

                    {/* Form fields — grid layout like the hostel platform */}
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                      {fields.map(([key, value]) => {
                        const draftValue = drafts[tab.key]?.[key] ?? value
                        const isDirty = draftValue !== value
                        const isLong = value.length > 100
                        const secret = isSecretKey(key)
                        const displayValue = secret && !isDirty ? '••••••••••••' : draftValue

                        return (
                          <div key={key} className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <Label className="text-xs font-medium">{niceLabel(key)}</Label>
                              {secret && <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200 py-0">SECRET</Badge>}
                              {isDirty && <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-700 border-blue-200 py-0">MODIFIED</Badge>}
                            </div>
                            {isLong ? (
                              <textarea
                                value={displayValue}
                                onChange={(e) => updateDraft(tab.key, key, e.target.value)}
                                className="w-full text-xs font-mono p-2 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring/20 focus:border-ring outline-none transition min-h-[60px] resize-y"
                              />
                            ) : (
                              <Input
                                value={displayValue}
                                onChange={(e) => updateDraft(tab.key, key, e.target.value)}
                                className="text-xs h-8"
                              />
                            )}
                            {isDirty && (
                              <Button
                                size="sm"
                                disabled={savingKey === key}
                                onClick={() => saveSetting(key, tab.key)}
                                className="h-7 text-xs w-full"
                              >
                                {savingKey === key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                                Save {niceLabel(key)}
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )
          })}
        </Tabs>
      )}
    </div>
  )
}
