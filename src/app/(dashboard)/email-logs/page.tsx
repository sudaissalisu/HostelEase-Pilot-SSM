'use client'
import { useState, useEffect } from 'react'
import { PageHeader, EmptyState } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Mail, Loader2, RefreshCw, CheckCircle2, XCircle, Clock, Save, Send } from 'lucide-react'
import { fmtDateTime, fmtRelative } from '@/lib/utils'
import { toast } from 'sonner'

export default function EmailLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('ALL')
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [testingEmail, setTestingEmail] = useState(false)
  const [testEmailAddr, setTestEmailAddr] = useState('')

  function load() {
    setLoading(true)
    const params = new URLSearchParams({ type: 'email-logs', pageSize: '50' })
    if (status !== 'ALL') params.set('status', status)
    Promise.all([
      fetch(`/api/tenant-data?${params}`).then(r => r.json()),
      fetch('/api/tenant-data?type=settings').then(r => r.json())
    ]).then(([logsData, settingsData]) => {
      setLogs(logsData.logs || [])
      setTotal(logsData.total || 0)
      const emailSettings = (settingsData.settings?.EMAIL || {})
      setSettings(emailSettings)
      setDrafts(emailSettings)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [status])

  async function saveSetting(key: string) {
    setSavingKey(key)
    try {
      const res = await fetch('/api/tenant-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: drafts[key] || '', category: 'EMAIL' }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success(`Saved: ${key}`)
      setSettings(prev => ({ ...prev, [key]: drafts[key] || '' }))
    } catch { toast.error('Failed to save') }
    finally { setSavingKey(null) }
  }

  async function sendTestEmail() {
    if (!testEmailAddr) { toast.error('Enter an email address'); return }
    setTestingEmail(true)
    try {
      // Write a test email request to AUSU's EmailLog table
      const res = await fetch('/api/tenant-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: '__test_email_request__',
          value: testEmailAddr,
          category: 'EMAIL_TEST'
        }),
      })
      toast.success(`Test email queued for ${testEmailAddr}. Check the logs below.`)
    } catch { toast.error('Failed to send test email') }
    finally { setTestingEmail(false) }
  }

  const emailFields = [
    { key: 'email_provider', label: 'Email Provider', type: 'select', options: ['smtp', 'resend'] },
    { key: 'resend_from_email', label: 'Resend From Email', type: 'input' },
    { key: 'smtp_from_name', label: 'SMTP From Name', type: 'input' },
    { key: 'smtp_from_email', label: 'SMTP From Email', type: 'input' },
    { key: 'email_footer_text', label: 'Email Footer Text', type: 'textarea' },
  ]

  return (
    <div>
      <PageHeader
        title="Email Settings & Logs"
        description="Configure email provider, send test emails, and view delivery logs from AUSU."
        actions={<Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" /> Refresh</Button>}
      />

      {/* Email Configuration */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> Email Configuration</CardTitle>
          <CardDescription>Provider settings for AUSU's email delivery</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {emailFields.map(field => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-xs font-medium">{field.label}</Label>
                {field.type === 'select' ? (
                  <Select value={drafts[field.key] || ''} onValueChange={(v) => setDrafts(prev => ({ ...prev, [field.key]: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{field.options?.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input value={drafts[field.key] || ''} onChange={(e) => setDrafts(prev => ({ ...prev, [field.key]: e.target.value }))} className="h-8 text-xs" />
                )}
                {(drafts[field.key] || '') !== (settings[field.key] || '') && (
                  <Button size="sm" className="h-7 text-xs w-full" disabled={savingKey === field.key} onClick={() => saveSetting(field.key)}>
                    {savingKey === field.key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />} Save
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Test Email */}
          <div className="mt-4 pt-4 border-t border-border">
            <Label className="text-xs font-medium">Send Test Email</Label>
            <div className="flex gap-2 mt-1.5">
              <Input value={testEmailAddr} onChange={(e) => setTestEmailAddr(e.target.value)} placeholder="test@example.com" className="h-8 text-xs flex-1" />
              <Button size="sm" disabled={testingEmail} onClick={sendTestEmail}>
                {testingEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />} Send Test
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Logs */}
      <div className="flex items-center gap-3 mb-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px] h-8"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="SENT">Sent</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="QUEUED">Queued</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{total} total</span>
      </div>
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : logs.length === 0 ? (
            <EmptyState icon={Mail} title="No emails found" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="font-semibold">Recipient</TableHead>
                  <TableHead className="font-semibold">Subject</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Created</TableHead>
                  <TableHead className="font-semibold">Sent</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {logs.map((log: any) => {
                    const Icon = log.status === 'SENT' ? CheckCircle2 : log.status === 'FAILED' ? XCircle : Clock
                    return (
                      <TableRow key={log.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium text-sm">{log.toEmail}</TableCell>
                        <TableCell className="text-sm truncate max-w-[200px]">{log.subject}</TableCell>
                        <TableCell><Badge variant="outline" className={`text-[10px] ${log.status === 'SENT' ? 'bg-emerald-50 text-emerald-700' : log.status === 'FAILED' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}><Icon className="h-3 w-3 mr-1" />{log.status}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground"><div>{fmtDateTime(log.createdAt)}</div><div className="text-[10px]">{fmtRelative(log.createdAt)}</div></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{log.sentAt ? fmtDateTime(log.sentAt) : '—'}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
