'use client'
import { TenantDataPage } from '@/components/tenant-data-page'
import { Palette } from 'lucide-react'

export default function Page() {
  return (
    <TenantDataPage
      title="Branding"
      description="Data from AUSU's hostel database."
      icon={Palette}
      dataType="branding"
    />
  )
}
