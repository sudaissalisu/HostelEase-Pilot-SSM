'use client'
import { TenantDataPage } from '@/components/tenant-data-page'
import { BarChart3 } from 'lucide-react'

export default function Page() {
  return (
    <TenantDataPage
      title="Reconciliation"
      description="Data from AUSU's hostel database."
      icon={BarChart3}
      dataType="overview"
    />
  )
}
