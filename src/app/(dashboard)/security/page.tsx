'use client'
import { TenantDataPage } from '@/components/tenant-data-page'
import { Shield } from 'lucide-react'

export default function Page() {
  return (
    <TenantDataPage
      title="Security Center"
      description="Data from AUSU's hostel database."
      icon={Shield}
      dataType="audit-logs"
    />
  )
}
