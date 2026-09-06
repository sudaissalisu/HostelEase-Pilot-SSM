'use client'
import { TenantDataPage } from '@/components/tenant-data-page'
import { FileText } from 'lucide-react'

export default function Page() {
  return (
    <TenantDataPage
      title="Reports"
      description="Data from AUSU's hostel database."
      icon={FileText}
      dataType="overview"
    />
  )
}
