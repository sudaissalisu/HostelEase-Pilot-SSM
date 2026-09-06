'use client'
import { TenantDataPage } from '@/components/tenant-data-page'
import { Server } from 'lucide-react'

export default function Page() {
  return (
    <TenantDataPage
      title="System Status"
      description="Data from AUSU's hostel database."
      icon={Server}
      dataType="versioning"
    />
  )
}
