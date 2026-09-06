'use client'
import { useState, useEffect } from 'react'
import { PageHeader, EmptyState } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Mail, Loader2, RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { fmtDateTime, fmtRelative } from '@/lib/utils'

const STATUS_BADGE: Record<string, string> = {
  SENT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  QUEUED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
}

export default function EmailLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('ALL')

  function load() {
    setLoading(true)
    const params = new URLSearchParams({ type: 'email-logs', pageSize: '50' })
    if (status !== 'ALL') params.set('status', status)
    fetch(`/api/tenant-data?${params}`).then(r => r.json()).then(d => {
      setLogs(d.logs || [])
      setTotal(d.total || 0)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [status])

  return (
    <div>
      <PageHeader
        title="Email Logs"
        description="Real-time email delivery logs from AUSU's database."
        actions={<Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" /> Refresh</Button>}
      />
      <div className="flex items-center gap-3 mb-4">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
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
            <EmptyState icon={Mail} title="No emails found" description="No email logs in AUSU's database." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-semibold">Recipient</TableHead>
                    <TableHead className="font-semibold">Subject</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Created</TableHead>
                    <TableHead className="font-semibold">Sent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log: any) => {
                    const Icon = log.status === 'SENT' ? CheckCircle2 : log.status === 'FAILED' ? XCircle : Clock
                    return (
                      <TableRow key={log.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium text-sm">{log.toEmail}</TableCell>
                        <TableCell className="text-sm truncate max-w-[200px]">{log.subject}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${STATUS_BADGE[log.status] || ''}`}>
                            <Icon className="h-3 w-3 mr-1" />{log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div>{fmtDateTime(log.createdAt)}</div>
                          <div className="text-[10px]">{fmtRelative(log.createdAt)}</div>
                        </TableCell>
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
