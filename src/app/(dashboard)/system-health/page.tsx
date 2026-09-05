'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Activity, Loader2, RefreshCw } from 'lucide-react'

export default function Page() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  function load() {
    setLoading(true)
    fetch('/api/tenant-data?type=system-health').then(r => r.json()).then(d => setData(d)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])
  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">System Health</h1><p className="text-sm text-slate-500 mt-1">Real-time system health from AUSU.</p></div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" /> Refresh</Button>
      </div>
      <Card><CardContent className="p-6">
        {data && Object.keys(data).length > 0 ? (
          <pre className="text-xs text-slate-600 whitespace-pre-wrap overflow-auto max-h-[60vh]">{JSON.stringify(data, null, 2)}</pre>
        ) : (
          <div className="text-center text-sm text-slate-500 py-8"><Activity className="h-10 w-10 mx-auto mb-2 text-slate-300" />No data available.</div>
        )}
      </CardContent></Card>
    </div>
  )
}
