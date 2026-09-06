'use client'
import { useState, useEffect } from 'react'
import { PageHeader, EmptyState } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Loader2, Save, Settings, Shield, Mail, MessageSquare, Bot, Wrench, Database, Building, Layers, HardDriveDownload, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

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

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, Record<string, string>>>({})
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)

  function load() {
    setLoading(true)
    fetch('/api/tenant-data?type=settings').then(r => r.json()).then(d => {
      setSettings(d.settings || {})
      setDrafts(d.settings || {})
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
      toast.success(`Saved: ${key}`)
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

  const availableTabs = TAB_META.filter(t => settings[t.key] && Object.keys(settings[t.key]).length > 0)
  const allCategories = Object.keys(settings).sort()
  const extraCategories = allCategories.filter(c => !TAB_META.find(t => t.key === c))

  return (
    <div>
      <PageHeader
        title="System Settings"
        description="Manage AUSU's institution-wide preferences — payment, email, security, and more."
        actions={<Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" /> Refresh</Button>}
      />

      {availableTabs.length === 0 && extraCategories.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState icon={Settings} title="No settings configured" description="Settings will appear here once AUSU's admin configures them." />
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={availableTabs[0]?.key || extraCategories[0]}>
          <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
            {availableTabs.map(tab => (
              <TabsTrigger key={tab.key} value={tab.key} className="gap-1.5 text-xs">
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </TabsTrigger>
            ))}
            {extraCategories.map(cat => (
              <TabsTrigger key={cat} value={cat} className="gap-1.5 text-xs">
                <Settings className="h-3.5 w-3.5" />
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>

          {[...availableTabs, ...extraCategories.map(c => ({ key: c, label: c, icon: Settings, description: '' }))].map(tab => {
            const catSettings = settings[tab.key] || {}
            const fields = Object.entries(catSettings).sort(([a], [b]) => a.localeCompare(b))

            return (
              <TabsContent key={tab.key} value={tab.key}>
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="mb-4">
                      <div className="flex items-center gap-2">
                        <tab.icon className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-base">{tab.label}</h3>
                        <Badge variant="secondary" className="text-[10px]">{fields.length} settings</Badge>
                      </div>
                      {tab.description && <p className="text-xs text-muted-foreground mt-1 ml-7">{tab.description}</p>}
                    </div>

                    <div className="space-y-4">
                      {fields.map(([key, value]) => {
                        const draftValue = drafts[tab.key]?.[key] ?? value
                        const isDirty = draftValue !== value
                        const isLong = value.length > 100
                        const isSecret = key.toLowerCase().includes('secret') || key.toLowerCase().includes('password') || key.toLowerCase().includes('key') || key.toLowerCase().includes('token')
                        const displayValue = isSecret && !isDirty ? '••••••••' : draftValue

                        // Format the label nicely
                        const niceLabel = key
                          .replace(/_/g, ' ')
                          .replace(/\b\w/g, c => c.toUpperCase())

                        return (
                          <div key={key} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 pb-4 border-b border-border last:border-0 last:pb-0">
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <Label className="text-sm font-medium">{niceLabel}</Label>
                                {isSecret && <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200">SECRET</Badge>}
                                {isDirty && <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-700 border-blue-200">MODIFIED</Badge>}
                              </div>
                              <p className="text-[10px] text-muted-foreground font-mono">{key}</p>
                              {isLong ? (
                                <textarea
                                  value={displayValue}
                                  onChange={(e) => updateDraft(tab.key, key, e.target.value)}
                                  className="w-full text-xs font-mono p-2.5 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring/20 focus:border-ring outline-none transition min-h-[80px] resize-y"
                                />
                              ) : (
                                <Input
                                  value={displayValue}
                                  onChange={(e) => updateDraft(tab.key, key, e.target.value)}
                                  className="text-xs font-mono"
                                />
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant={isDirty ? "default" : "outline"}
                              disabled={!isDirty || savingKey === key}
                              onClick={() => saveSetting(key, tab.key)}
                              className="shrink-0 sm:mt-6"
                            >
                              {savingKey === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                              {isDirty ? 'Save' : 'Saved'}
                            </Button>
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
