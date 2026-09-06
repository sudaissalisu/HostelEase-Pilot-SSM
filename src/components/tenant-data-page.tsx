'use client'

import { useState, useEffect, ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw } from 'lucide-react'
import { PageHeader, EmptyState } from '@/components/page-header'

interface TenantDataPageProps {
  title: string
  description: string
  icon: any
  dataType: string
  /** Custom render function — receives the raw data, returns JSX */
  renderData?: (data: any) => ReactNode
  /** Optional status filter */
  statusFilter?: boolean
}

export function TenantDataPage({ title, description, icon: Icon, dataType, renderData, statusFilter }: TenantDataPageProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    fetch(`/api/tenant-data?type=${dataType}`).then(r => r.json()).then(d => setData(d)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div>
        <PageHeader title={title} description={description} />
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    )
  }

  // Check if data is empty
  const isEmpty = !data || (Array.isArray(data) ? data.length === 0 : Object.values(data).every(v => !v || (Array.isArray(v) && v.length === 0)))

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={<Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" /> Refresh</Button>}
      />

      {isEmpty ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState icon={Icon} title={`No ${title.toLowerCase()} found`} description={`No data available from AUSU's database.`} />
          </CardContent>
        </Card>
      ) : renderData ? (
        renderData(data)
      ) : (
        <Card>
          <CardContent className="p-4">
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-auto max-h-[60vh] font-mono">{JSON.stringify(data, null, 2)}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
