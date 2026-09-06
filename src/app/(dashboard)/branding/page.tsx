'use client'
import { useState, useEffect } from 'react'
import { PageHeader, EmptyState } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Palette, Loader2, Save, Upload, ShieldCheck, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export default function SsmBrandingPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  function load() {
    setLoading(true)
    fetch('/api/tenant-data?type=settings').then(r => r.json()).then(d => {
      const branding = d.settings?.SSM_BRANDING || {}
      setSettings(branding)
      setDrafts(branding)
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  async function saveSetting(key: string) {
    setSavingKey(key)
    try {
      const res = await fetch('/api/tenant-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: drafts[key] || '', category: 'SSM_BRANDING' }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(`Saved: ${key}`)
      setSettings(prev => ({ ...prev, [key]: drafts[key] || '' }))
    } catch { toast.error('Failed to save') }
    finally { setSavingKey(null) }
  }

  async function uploadLogo(file: File, field: string) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      if (data.url) {
        setDrafts(prev => ({ ...prev, [field]: data.url }))
        toast.success('Uploaded — click Save')
      }
    } catch { toast.error('Upload failed') }
    finally { setUploading(false) }
  }

  const fields = [
    { key: 'ssm_company_name', label: 'Company Name', placeholder: 'SSM Limited' },
    { key: 'ssm_tagline', label: 'Tagline', placeholder: 'HostelEase License Management' },
    { key: 'ssm_support_email', label: 'Support Email', placeholder: 'support@ssm.com.ng' },
    { key: 'ssm_support_phone', label: 'Support Phone', placeholder: '+234...' },
    { key: 'ssm_address', label: 'Address', placeholder: 'Kano, Nigeria' },
    { key: 'ssm_rc_number', label: 'RC Number', placeholder: 'RC 7977037' },
    { key: 'ssm_primary_color', label: 'Primary Color', placeholder: '#059669' },
    { key: 'ssm_logo_url', label: 'Logo URL', placeholder: '/logo.svg' },
    { key: 'ssm_favicon_url', label: 'Favicon URL', placeholder: '/favicon.ico' },
  ]

  if (loading) return <div><PageHeader title="SSM Branding" description="Manage SSM Limited's branding." /><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></div>

  return (
    <div>
      <PageHeader title="SSM Branding" description="Manage SSM Limited's company branding, logo, and contact info."
        actions={<Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" /> Refresh</Button>} />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Company Identity</CardTitle>
          <CardDescription>SSM Limited branding shown across the pilot dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {fields.map(field => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-xs font-medium">{field.label}</Label>
                <div className="flex gap-2">
                  <Input value={drafts[field.key] || ''} onChange={(e) => setDrafts(prev => ({ ...prev, [field.key]: e.target.value }))} placeholder={field.placeholder} className="h-8 text-xs flex-1" />
                  {(drafts[field.key] || '') !== (settings[field.key] || '') && (
                    <Button size="sm" className="h-8" disabled={savingKey === field.key} onClick={() => saveSetting(field.key)}>
                      {savingKey === field.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Palette className="h-5 w-5 text-primary" /> Logo & Favicon</CardTitle>
          <CardDescription>Upload SSM's logo and favicon</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Logo</Label>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-primary grid place-items-center shrink-0">
                  <ShieldCheck className="h-6 w-6 text-primary-foreground" />
                </div>
                <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f, 'ssm_logo_url') }} className="h-8 text-xs" disabled={uploading} />
              </div>
              {drafts.ssm_logo_url && <p className="text-[10px] text-muted-foreground font-mono truncate">{drafts.ssm_logo_url}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Favicon</Label>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-muted grid place-items-center shrink-0">
                  <Palette className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f, 'ssm_favicon_url') }} className="h-8 text-xs" disabled={uploading} />
              </div>
              {drafts.ssm_favicon_url && <p className="text-[10px] text-muted-foreground font-mono truncate">{drafts.ssm_favicon_url}</p>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
