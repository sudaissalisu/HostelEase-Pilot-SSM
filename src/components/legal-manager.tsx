'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { FileText, Shield, AlertCircle, Save, Loader2, ExternalLink } from 'lucide-react'
import { PageHeader, LoadingState } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRolePermissions } from '@/lib/use-role-permissions'
import { Lock, Eye } from 'lucide-react'

const PAGES = [
  { key: 'privacy', label: 'Privacy Policy', icon: Shield },
  { key: 'terms', label: 'Terms of Service', icon: FileText },
  { key: 'licensing', label: 'Software Licensing & IP', icon: FileText },
  { key: 'aup', label: 'Acceptable Use Policy', icon: Shield },
  { key: 'support', label: 'Support & Help Center', icon: FileText },
  { key: 'disclaimer', label: 'Disclaimer', icon: AlertCircle },
]

export function LegalManager() {
  const { canManage, isViewOnly } = useRolePermissions()
  const canEdit = canManage('canManageLegal')
  const viewOnly = isViewOnly('canManageLegal', 'canViewLegal')
  const [activePage, setActivePage] = React.useState('privacy')
  const [title, setTitle] = React.useState('')
  const [body, setBody] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  async function loadPage(page: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/legal?page=${page}`)
      const data = await res.json()
      if (data.page) {
        setTitle(data.page.title || '')
        setBody(data.page.body || '')
      }
    } catch {
      toast.error('Failed to load page')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    loadPage(activePage)
  }, [activePage])

  async function handleSave() {
    if (!title.trim() || !body.trim()) {
      toast.error('Title and body are required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/legal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: activePage, title, body }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Legal page updated')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Legal Pages"
        description="Manage privacy policy, terms of service, software licensing, acceptable use policy, support center, and disclaimer."
      />

      <Tabs value={activePage} onValueChange={setActivePage}>
        <TabsList>
          {PAGES.map((p) => (
            <TabsTrigger key={p.key} value={p.key} className="gap-1.5">
              <p.icon className="h-3.5 w-3.5" />
              {p.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {PAGES.map((p) => (
          <TabsContent key={p.key} value={p.key}>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <p.icon className="h-4 w-4 text-primary" /> {p.label}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      This page is publicly accessible at{' '}
                      <code className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">
                        /legal/{p.key}
                      </code>
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => window.open(`/legal/${p.key}`, '_blank')}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> View Public Page
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <LoadingState label="Loading…" />
                ) : (
                  <>
                    {/* View-only banner — shown when the user has view
                        permission but NOT manage permission */}
                    {viewOnly && (
                      <div className="rounded-md border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                        <Eye className="h-3.5 w-3.5 shrink-0" />
                        <span>You have view-only access. Editing is disabled — contact an admin to make changes.</span>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="legal-title">Page Title</Label>
                      <Input
                        id="legal-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Privacy Policy"
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="legal-body">Page Content</Label>
                      <Textarea
                        id="legal-body"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="Enter the legal page content here..."
                        className="min-h-[400px] font-mono text-sm"
                        disabled={!canEdit}
                      />
                      <p className="text-xs text-muted-foreground">
                        Use plain text with line breaks. Each line break creates a new paragraph.
                      </p>
                    </div>
                    {/* Save / Reset buttons — hidden when view-only */}
                    {canEdit && (
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => loadPage(activePage)}>
                          Reset
                        </Button>
                        <Button size="sm" onClick={handleSave} disabled={saving}>
                          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                          Save Changes
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
