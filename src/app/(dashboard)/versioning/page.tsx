'use client'
import { TenantDataPage } from '@/components/tenant-data-page'
import { GitBranch } from 'lucide-react'

export default function Page() {
  return (
    <TenantDataPage
      title="Versioning"
      description="Data from AUSU's hostel database."
      icon={GitBranch}
      dataType="versioning"
    />
  )
}
