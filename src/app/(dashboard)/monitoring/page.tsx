'use client'
import { useState, useEffect } from 'react'
import { PageHeader, StatCard, EmptyState } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Loader2, RefreshCw, Mail, ShieldCheck, Activity, AlertTriangle, Lock, CheckCircle2, XCircle, Clock, Server } from 'lucide-react'
import { fmtDateTime, fmtRelative, fmtMoney } from '@/lib/utils'

const SEV_BADGE: Record<string, string> = { HIGH: 'bg-red-100 text-red-700', MEDIUM: 'bg-amber-100 text-amber-700', LOW: 'bg-blue-100 text-blue-700' }
const STATUS_BADGE: Record<string, string> = { SENT: 'bg-emerald-100 text-emerald-700', FAILED: 'bg-red-100 text-red-700', QUEUED: 'bg-amber-100 text-amber-700' }

export default function MonitoringPage() {
  const [tab, setTab] = useState('overview')
  const [emailLogs, setEmailLogs] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    Promise.all([
      fetch('/api/tenant-data?type=email-logs&pageSize=20').then(r => r.json()),
      fetch('/api/tenant-data?type=audit-logs&pageSize=20').then(r => r.json()),
      fetch('/api/tenant-data?type=overview').then(r => r.json()),
    ]).then(([emailData, auditData, statsData]) => {
      setEmailLogs(emailData.logs || [])
      setAuditLogs(auditData.logs || [])
      setStats(statsData.stats)
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  return (
    <div>
      <PageHeader title="System Monitoring" description="Email delivery, audit trail, system health, and security alerts."
        actions={<Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" /> Refresh</Button>} />

      {loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : (
        <>
          {/* Quick stats */}
          {stats && (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
              <StatCard label="Students" value={(stats.studentCount || 0).toLocaleString()} icon={Activity} accent="primary" />
              <StatCard label="Active Allocations" value={stats.activeAllocations || 0} icon={CheckCircle2} accent="blue" />
              <StatCard label="Revenue" value={fmtMoney(stats.totalRevenue || 0)} icon={Activity} accent="amber" />
              <StatCard label="Session" value={stats.activeSession || 'None'} icon={Server} accent="purple" />
            </div>
          )}

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="emails">Email Logs</TabsTrigger>
              <TabsTrigger value="audit">Audit Trail</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            {/* Overview tab */}
            <TabsContent value="overview">
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> Recent Emails</CardTitle></CardHeader>
                  <CardContent>
                    {emailLogs.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No emails</p> : (
                      <div className="space-y-2">
                        {emailLogs.slice(0, 5).map((log: any) => (
                          <div key={log.id} className="flex items-center gap-2 text-xs">
                            <Badge variant="outline" className={`text-[9px] ${STATUS_BADGE[log.status] || ''}`}>{log.status}</Badge>
                            <span className="font-medium truncate flex-1">{log.toEmail}</span>
                            <span className="text-muted-foreground">{fmtRelative(log.createdAt)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Recent Activity</CardTitle></CardHeader>
                  <CardContent>
                    {auditLogs.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No activity</p> : (
                      <div className="space-y-2">
                        {auditLogs.slice(0, 5).map((log: any) => (
                          <div key={log.id} className="flex items-center gap-2 text-xs">
                            <Badge variant="outline" className={`text-[9px] ${SEV_BADGE[log.severity] || ''}`}>{log.severity || 'INFO'}</Badge>
                            <span className="font-mono truncate flex-1">{log.action}</span>
                            <span className="text-muted-foreground">{fmtRelative(log.createdAt)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Email logs tab */}
            <TabsContent value="emails">
              <Card><CardContent className="p-0">
                {emailLogs.length === 0 ? <EmptyState icon={Mail} title="No emails" /> : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="font-semibold">Recipient</TableHead>
                        <TableHead className="font-semibold">Subject</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Created</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {emailLogs.map((log: any) => {
                          const Icon = log.status === 'SENT' ? CheckCircle2 : log.status === 'FAILED' ? XCircle : Clock
                          return (
                            <TableRow key={log.id} className="hover:bg-muted/30">
                              <TableCell className="font-medium text-sm">{log.toEmail}</TableCell>
                              <TableCell className="text-sm truncate max-w-[200px]">{log.subject}</TableCell>
                              <TableCell><Badge variant="outline" className={`text-[10px] ${STATUS_BADGE[log.status] || ''}`}><Icon className="h-3 w-3 mr-1" />{log.status}</Badge></TableCell>
                              <TableCell className="text-xs text-muted-foreground">{fmtDateTime(log.createdAt)}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent></Card>
            </TabsContent>

            {/* Audit trail tab */}
            <TabsContent value="audit">
              <Card><CardContent className="p-0">
                {auditLogs.length === 0 ? <EmptyState icon={ShieldCheck} title="No audit logs" /> : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="font-semibold">Action</TableHead>
                        <TableHead className="font-semibold">Severity</TableHead>
                        <TableHead className="font-semibold">Summary</TableHead>
                        <TableHead className="font-semibold">IP</TableHead>
                        <TableHead className="font-semibold">Date</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {auditLogs.map((log: any) => (
                          <TableRow key={log.id} className="hover:bg-muted/30">
                            <TableCell className="text-xs font-mono font-medium">{log.action}</TableCell>
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
            </TabsContent>

            {/* Security tab */}
            <TabsContent value="security">
              <Card><CardContent className="p-0">
                {(() => {
                  const highSev = auditLogs.filter(l => l.severity === 'HIGH')
                  return highSev.length === 0 ? <EmptyState icon={ShieldCheck} title="No security alerts" description="No high-severity events." /> : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
                          <TableHead className="font-semibold">Action</TableHead>
                          <TableHead className="font-semibold">Summary</TableHead>
                          <TableHead className="font-semibold">IP</TableHead>
                          <TableHead className="font-semibold">Date</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                          {highSev.map((log: any) => (
                            <TableRow key={log.id} className="hover:bg-muted/30">
                              <TableCell className="text-xs font-mono font-medium text-destructive">{log.action}</TableCell>
                              <TableCell className="text-xs truncate max-w-[300px]">{log.summary || '—'}</TableCell>
                              <TableCell className="text-xs font-mono text-muted-foreground">{log.ipAddress || '—'}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{fmtDateTime(log.createdAt)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )
                })()}
              </CardContent></Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
