'use client'
import { TenantDataPage } from '@/components/tenant-data-page'
import { MessageSquare } from 'lucide-react'

export default function Page() {
  return (
    <TenantDataPage
      title="Student Feedback"
      description="Data from AUSU's hostel database."
      icon={MessageSquare}
      dataType="feedback"
    />
  )
}
