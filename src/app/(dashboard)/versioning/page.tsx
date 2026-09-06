'use client'
import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Bot, Loader2, RefreshCw, Power, Save } from 'lucide-react'
import { toast } from 'sonner'

export default function AiPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  function load() {
    setLoading(true)
    fetch('/api/tenant-data?type=settings').then(r => r.json()).then(d => {
      const aiSettings = d.settings?.AI || {}
      setSettings(aiSettings)
      setDrafts(aiSettings)
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const aiEnabled = settings.ai_agent_enabled === 'true'

  async function toggleAI() {
    setToggling(true)
    try {
      const res = await fetch('/api/tenant-data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle-ai', enabled: !aiEnabled }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(`AI assistant ${!aiEnabled ? 'enabled' : 'disabled'}`)
      setSettings(prev => ({ ...prev, ai_agent_enabled: String(!aiEnabled) }))
    } catch { toast.error('Failed') }
    finally { setToggling(false) }
  }

  async function saveSetting(key: string) {
    setSavingKey(key)
    try {
      const res = await fetch('/api/tenant-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: drafts[key] || '', category: 'AI' }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(`Saved: ${key}`)
      setSettings(prev => ({ ...prev, [key]: drafts[key] || '' }))
    } catch { toast.error('Failed') }
    finally { setSavingKey(null) }
  }

  const aiFields = [
    { key: 'ai_provider', label: 'AI Provider', placeholder: 'deepseek' },
    { key: 'ai_model', label: 'AI Model', placeholder: 'deepseek-chat' },
    { key: 'ai_temperature', label: 'Temperature', placeholder: '0.7' },
    { key: 'ai_max_tokens', label: 'Max Tokens', placeholder: '4096' },
  ]

  if (loading) return <div><PageHeader title="AI Assistant" description="Configure AI agent for AUSU." /><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></div>

  return (
    <div>
      <PageHeader title="AI Assistant" description="Configure the AI agent for AUSU's portal."
        actions={<Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" /> Refresh</Button>} />

      {/* AI Status */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Bot className="h-5 w-5 text-primary" /> AI Agent Status</CardTitle>
          <CardDescription>Enable or disable the AI assistant for AUSU students</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Badge variant="outline" className={aiEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'}>
              {aiEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
            <Button variant={aiEnabled ? 'outline' : 'default'} disabled={toggling} onClick={toggleAI}>
              {toggling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4 mr-1.5" />}
              {aiEnabled ? 'Disable AI' : 'Enable AI'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI Configuration</CardTitle>
          <CardDescription>Model parameters and provider settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {aiFields.map(field => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-xs font-medium">{field.label}</Label>
                <Input value={drafts[field.key] || ''} onChange={(e) => setDrafts(prev => ({ ...prev, [field.key]: e.target.value }))} placeholder={field.placeholder} className="h-8 text-xs" />
                {(drafts[field.key] || '') !== (settings[field.key] || '') && (
                  <Button size="sm" className="h-7 text-xs w-full" disabled={savingKey === field.key} onClick={() => saveSetting(field.key)}>
                    {savingKey === field.key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />} Save
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
