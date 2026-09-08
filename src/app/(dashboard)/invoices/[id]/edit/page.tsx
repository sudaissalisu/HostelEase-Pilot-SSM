'use client'
import React from 'react'
import { InvoiceForm } from '@/components/invoice-manager'

export default function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = React.useState<string>('')
  React.useEffect(() => { params.then(p => setId(p.id)) }, [params])
  if (!id) return null
  return <InvoiceForm mode="edit" invoiceId={id} />
}
