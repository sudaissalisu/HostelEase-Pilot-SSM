'use client'

import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * SSM Security badge — shows "Secured by SSM · Argon2id"
 * S = Blue, S = Red, M = Yellow (bold, no space)
 */
export function SsmSecurityBadge({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-1.5 text-[10px] text-muted-foreground', className)}>
      <ShieldCheck className="h-3 w-3 text-primary" />
      <span>Secured by</span>
      <span className="font-bold">
        <span style={{ color: '#2563eb' }}>S</span>
        <span style={{ color: '#dc2626' }}>S</span>
        <span style={{ color: '#ca8a04' }}>M</span>
      </span>
      <span className="text-muted-foreground/60">·</span>
      <span className="font-mono text-[9px]">Argon2id</span>
    </div>
  )
}
