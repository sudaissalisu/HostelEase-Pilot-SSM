'use client'
import { useState, useEffect } from 'react'
import { PageHeader, EmptyState } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { LifeBuoy, Loader2, RefreshCw } from 'lucide-react'
import { fmtDateTime } from '@/lib/utils'

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  IN_PROGRESS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  RESOLVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  CLOSED: 'bg-muted text-muted-foreground',
}

const PRIORITY_BADGE: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW: 'bg-blue-100 text-blue-700',
}

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    fetch('/api/tenant-data?type=support-tickets').then(r => r.json()).then(d => setTickets(d.tickets || [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  return (
    <div>
      <PageHeader title="Support Tickets" description="Support tickets from AUSU."
        actions={<Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" /> Refresh</Button>} />
      <Card><CardContent className="p-0">
        {loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        : tickets.length === 0 ? <EmptyState icon={LifeBuoy} title="No support tickets" description="No tickets found at AUSU." />
        : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold">Title</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Priority</TableHead>
                <TableHead className="font-semibold">Created</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {tickets.map((t: any) => (
                  <TableRow key={t.id} className="hover:bg-muted/30">
                    <TableCell className="text-sm font-medium">{t.title}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-[10px] ${STATUS_BADGE[t.status] || ''}`}>{t.status}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={`text-[10px] ${PRIORITY_BADGE[t.priority] || ''}`}>{t.priority}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDateTime(t.createdAt)}</TableCell>
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
