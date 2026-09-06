'use client'
import { TenantDataPage } from '@/components/tenant-data-page'
import { AlertTriangle } from 'lucide-react'

export default function Page() {
  return (
    <TenantDataPage
      title="Alerts & IP Block"
      description="Data from AUSU's hostel database."
      icon={AlertTriangle}
      dataType="audit-logs"
    />
  )
}
