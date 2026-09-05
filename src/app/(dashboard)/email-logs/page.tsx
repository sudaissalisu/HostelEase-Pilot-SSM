'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Mail, Loader2, RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { fmtDateTime, fmtRelative } from '@/lib/utils'

const STATUS_BADGE: Record<string, string> = {
  SENT: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  FAILED: 'bg-red-100 text-red-700 border-red-200',
  QUEUED: 'bg-amber-100 text-amber-700 border-amber-200',
}
const STATUS_ICON: Record<string, any> = { SENT: CheckCircle2, FAILED: XCircle, QUEUED: Clock }

export default function EmailLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('ALL')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: '50' })
    if (status !== 'ALL') params.set('status', status)
    fetch(`/api/email-logs?${params}`).then(r => r.json()).then(d => {
      setLogs(d.logs || [])
      setTotal(d.total || 0)
    }).finally(() => setLoading(false))
  }, [status, page])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Logs</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time email delivery logs from AUSU's hostel database.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setPage(p => p)}><RefreshCw className="h-4 w-4 mr-1.5" /> Refresh</Button>
      </div>
      <div className="flex items-center gap-3">
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
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
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: any) => {
                  const Icon = STATUS_ICON[log.status] || Clock
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium text-sm">{log.toEmail}</TableCell>
                      <TableCell className="text-sm truncate max-w-[200px]">{log.subject}</TableCell>
                      <TableCell><Badge variant="outline" className={`text-[10px] ${STATUS_BADGE[log.status] || ''}`}><Icon className="h-3 w-3 mr-1" />{log.status}</Badge></TableCell>
                      <TableCell className="text-xs text-slate-500"><div>{fmtDateTime(log.createdAt)}</div><div className="text-[10px]">{fmtRelative(log.createdAt)}</div></TableCell>
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
