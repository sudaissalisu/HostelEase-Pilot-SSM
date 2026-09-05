'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Mail, Loader2, RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { fmtDateTime, fmtRelative } from '@/lib/utils'

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Logs</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time email delivery logs from AUSU.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" /> Refresh</Button>
      </div>
      <div className="flex items-center gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="SENT">Sent</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="QUEUED">Queued</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-slate-500">{total} total</span>
      </div>
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500"><Mail className="h-10 w-10 mx-auto mb-2 text-slate-300" />No emails found.</div>
          ) : (
            <Table>
              <TableHeader><TableRow className="bg-slate-50">
                <TableHead>Recipient</TableHead><TableHead>Subject</TableHead><TableHead>Status</TableHead>
                <TableHead>Created</TableHead><TableHead>Sent</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {logs.map((log: any) => {
                  const Icon = log.status === 'SENT' ? CheckCircle2 : log.status === 'FAILED' ? XCircle : Clock
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium text-sm">{log.toEmail}</TableCell>
                      <TableCell className="text-sm truncate max-w-[200px]">{log.subject}</TableCell>
                      <TableCell><Badge variant="outline" className={`text-[10px] ${log.status === 'SENT' ? 'bg-emerald-50 text-emerald-700' : log.status === 'FAILED' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}><Icon className="h-3 w-3 mr-1" />{log.status}</Badge></TableCell>
                      <TableCell className="text-xs text-slate-500">{fmtDateTime(log.createdAt)}<div className="text-[10px]">{fmtRelative(log.createdAt)}</div></TableCell>
                      <TableCell className="text-xs text-slate-500">{log.sentAt ? fmtDateTime(log.sentAt) : '—'}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
