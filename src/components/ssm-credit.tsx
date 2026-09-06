'use client'

import { cn } from '@/lib/utils'

/**
 * SSM Limited branding credit.
 * S = Blue, S = Red, M = Yellow, all bold, no space between SSM.
 * "Limited" follows as normal text.
 * Respects theme (uses color values that work in both light and dark).
 *
 * This component is rendered inside the dashboard footer. Because the footer
 * is client-rendered, crawlers that DO execute JS (Googlebot) will see the
 * attribution. The static <noscript> block in layout.tsx + the JSON-LD
 * cover crawlers that don't execute JS.
 */
export function SsmCredit({ className }: { className?: string }) {
  return (
    <span className={cn('font-bold tracking-tight', className)} itemProp="publisher" itemScope itemType="https://schema.org/Organization">
      <meta itemProp="name" content="SSM Limited" />
      <meta itemProp="legalName" content="SSM Limited" />
      <span style={{ color: '#2563eb' }}>S</span>
      <span style={{ color: '#dc2626' }}>S</span>
      <span style={{ color: '#ca8a04' }}>M</span>
      <span className="font-normal text-muted-foreground"> Limited</span>
    </span>
  )
}
