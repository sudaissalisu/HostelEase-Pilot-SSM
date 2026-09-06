'use client'
import { TenantDataPage } from '@/components/tenant-data-page'
import { Lock } from 'lucide-react'

export default function Page() {
  return (
    <TenantDataPage
      title="Locked Students"
      description="Data from AUSU's hostel database."
      icon={Lock}
      dataType="locked-students"
    />
  )
}
