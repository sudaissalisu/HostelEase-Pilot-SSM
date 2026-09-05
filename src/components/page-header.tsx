'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6', className)}>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: React.ReactNode
  icon?: React.ElementType
  hint?: string
  trend?: { value: string; positive: boolean }
  accent?: 'primary' | 'amber' | 'destructive' | 'blue' | 'purple'
}

export function StatCard({ label, value, icon: Icon, hint, trend, accent = 'primary' }: StatCardProps) {
  const accentMap = {
    primary: 'bg-primary/10 text-primary',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    destructive: 'bg-destructive/10 text-destructive',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  }
  return (
    <div className="rounded-xl border bg-card p-3 sm:p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 sm:gap-3">
        {Icon && (
          <div className={cn(
            'rounded-lg grid place-items-center shrink-0',
            'h-8 w-8 sm:h-10 sm:w-10',
            accentMap[accent]
          )}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        )}
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="text-[9px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
            {label}
          </div>
          <div className="text-lg sm:text-2xl font-bold leading-tight truncate">{value}</div>
          {hint && <div className="text-[9px] sm:text-xs text-muted-foreground truncate">{hint}</div>}
          {trend && (
            <div className={cn('text-xs font-semibold', trend.positive ? 'text-primary' : 'text-destructive')}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="text-center py-12 px-4">
      <div className="mx-auto h-14 w-14 rounded-full bg-muted grid place-items-center mb-4">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-muted-foreground">
      <div className="h-5 w-5 mr-2 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  )
}
