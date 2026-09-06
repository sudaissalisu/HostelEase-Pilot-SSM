'use client'
import { TenantDataPage } from '@/components/tenant-data-page'
import { LifeBuoy } from 'lucide-react'

export default function Page() {
  return (
    <TenantDataPage
      title="Support Tickets"
      description="Data from AUSU's hostel database."
      icon={LifeBuoy}
      dataType="support-tickets"
    />
  )
}
