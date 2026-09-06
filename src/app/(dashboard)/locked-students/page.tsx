'use client'
import { useState, useEffect } from 'react'
import { PageHeader, EmptyState } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Lock, Loader2, RefreshCw, Unlock } from 'lucide-react'
import { fmtDateTime } from '@/lib/utils'
import { toast } from 'sonner'

export default function LockedStudentsPage() {
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    fetch('/api/tenant-data?type=locked-students').then(r => r.json()).then(d => setStudents(d.locked || [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  async function releaseHold(studentId: string) {
    try {
      const res = await fetch('/api/tenant-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: `__release_hold__${studentId}`, value: 'true', category: 'ADMIN_ACTION' }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success('Profile hold released')
      load()
    } catch { toast.error('Failed to release hold') }
  }

  return (
    <div>
      <PageHeader title="Locked Students" description="Students with profile holds at AUSU."
        actions={<Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" /> Refresh</Button>} />
      <Card><CardContent className="p-0">
        {loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        : students.length === 0 ? <EmptyState icon={Lock} title="No locked students" description="No students have profile holds." />
        : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold">Reg No</TableHead>
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">Hold Reason</TableHead>
                <TableHead className="font-semibold">Held Since</TableHead>
                <TableHead className="font-semibold">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {students.map((s: any) => (
                  <TableRow key={s.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs font-semibold text-primary">{s.regNumber || '—'}</TableCell>
                    <TableCell className="text-sm font-medium">{s.name || '—'}</TableCell>
                    <TableCell className="text-xs">{s.email || '—'}</TableCell>
                    <TableCell className="text-xs"><Badge variant="outline" className="bg-amber-50 text-amber-700">{s.profileHoldReason || '—'}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.profileHeldAt ? fmtDateTime(s.profileHeldAt) : '—'}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => releaseHold(s.id)}>
                        <Unlock className="h-3.5 w-3.5 mr-1" /> Release
                      </Button>
                    </TableCell>
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
