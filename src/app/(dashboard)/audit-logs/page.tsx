'use client'
import { useState, useEffect } from 'react'
import { PageHeader, EmptyState } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { ShieldCheck, Loader2, RefreshCw } from 'lucide-react'
import { fmtDateTime } from '@/lib/utils'

const SEV_BADGE: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  LOW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    fetch('/api/tenant-data?type=audit-logs').then(r => r.json()).then(d => {
      setLogs(d.logs || []); setTotal(d.total || 0)
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  return (
    <div>
      <PageHeader title="Audit Logs" description="Real-time audit trail from AUSU's database."
        actions={<Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" /> Refresh</Button>} />
      <Card><CardContent className="p-0">
        {loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        : logs.length === 0 ? <EmptyState icon={ShieldCheck} title="No audit logs" description="No audit entries found." />
        : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold">Action</TableHead>
                <TableHead className="font-semibold">Entity</TableHead>
                <TableHead className="font-semibold">Severity</TableHead>
                <TableHead className="font-semibold">Summary</TableHead>
                <TableHead className="font-semibold">IP Address</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {logs.map((log: any) => (
                  <TableRow key={log.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs font-mono font-medium">{log.action}</TableCell>
                    <TableCell className="text-xs">{log.entityType}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-[10px] ${SEV_BADGE[log.severity] || ''}`}>{log.severity || 'INFO'}</Badge></TableCell>
                    <TableCell className="text-xs truncate max-w-[300px]">{log.summary || '—'}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{log.ipAddress || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDateTime(log.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent></Card>
    </div>
  )
}
