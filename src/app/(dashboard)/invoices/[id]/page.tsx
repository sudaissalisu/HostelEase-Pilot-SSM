'use client'
import { InvoiceDetail } from '@/components/invoice-manager'

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = React.useState<string>('')
  React.useEffect(() => { params.then(p => setId(p.id)) }, [params])
  if (!id) return null
  return <InvoiceDetail invoiceId={id} />
}

import React from 'react'
