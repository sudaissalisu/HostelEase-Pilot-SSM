'use client'

import * as React from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import {
  Star,
  MessageSquare,
  Loader2,
  RefreshCw,
  Filter,
  TrendingUp,
  Users,
  Inbox,
} from 'lucide-react'
import { PageHeader, StatCard, LoadingState, EmptyState } from '@/components/shared/page-header'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { fmtDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

const fetcher = async (url: string) => {
  const r = await fetch(url, { credentials: 'include' })
  if (!r.ok) {
    const b = await r.json().catch(() => ({}))
    throw new Error(b?.error || `Request failed (${r.status})`)
  }
  return r.json()
}

interface FeedbackRow {
  id: string
  type: string
  rating: number
  comment: string | null
  sessionId: string | null
  allocationId: string | null
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
    student?: { regNumber: string } | null
  }
}

interface FeedbackStats {
  average: number
  count: number
  distribution: Record<string, number>
  byType?: Record<string, number>
}

interface FeedbackResponse {
  feedback: FeedbackRow[]
  total: number
  stats?: FeedbackStats
  filters: { type: string | null; rating: number | null; limit: number }
}

const TYPE_META: Record<string, { label: string; color: string }> = {
  CHECKIN: { label: 'Check-in', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  SUPPORT_CHAT: { label: 'Support chat', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30' },
  ROOM: { label: 'Room', color: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30' },
  GENERAL: { label: 'General', color: 'bg-primary/10 text-primary border-primary/30' },
}

function StarRow({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sz = size === 'md' ? 'h-4 w-4' : 'h-3 w-3'
  return (
    <span className="inline-flex items-center">
      {[1, 2, 3, 4, 5].map((r) => (
        <Star
          key={r}
          className={cn(
            sz,
            r <= rating
              ? 'fill-amber-400 text-amber-400'
              : 'text-muted-foreground/30'
          )}
        />
      ))}
    </span>
  )
}

export function FeedbackViewer() {
  const [typeFilter, setTypeFilter] = React.useState<string>('ALL')
  const [ratingFilter, setRatingFilter] = React.useState<string>('ALL')

  // Build the SWR key from the active filters.
  const params = new URLSearchParams({ stats: 'true', limit: '200' })
  if (typeFilter !== 'ALL') params.set('type', typeFilter)
  if (ratingFilter !== 'ALL') params.set('rating', ratingFilter)
  const swrKey = `/api/feedback?${params.toString()}`

  const { data, isLoading, error, mutate } = useSWR<FeedbackResponse>(swrKey, fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  })

  const stats = data?.stats
  const feedback = data?.feedback ?? []
  const total = data?.total ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Feedback"
        description="Ratings and comments submitted by students across check-in, support chat, room, and general experiences."
        actions={
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
          </Button>
        }
      />

      {/* Stat cards */}
      {isLoading || !stats ? (
        <LoadingState label="Loading feedback stats…" />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Average Rating"
            value={
              <span className="flex items-center gap-1.5">
                {stats.average > 0 ? stats.average.toFixed(2) : '—'}
                <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              </span>
            }
            icon={TrendingUp}
            hint={`from ${stats.count} submission${stats.count === 1 ? '' : 's'}`}
            accent="primary"
          />
          <StatCard
            label="Total Feedback"
            value={total}
            icon={Inbox}
            hint="all-time submissions"
            accent="purple"
          />
          <StatCard
            label="5-Star Ratings"
            value={stats.distribution['5'] || 0}
            icon={Star}
            hint={`${stats.count > 0 ? Math.round(((stats.distribution['5'] || 0) / stats.count) * 100) : 0}% of total`}
            accent="amber"
          />
          <StatCard
            label="Unique Respondents"
            value={new Set(feedback.map((f) => f.user.id)).size}
            icon={Users}
            hint="in current view"
            accent="blue"
          />
        </div>
      )}

      {/* Distribution + per-type breakdown */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Rating Distribution</CardTitle>
              <CardDescription className="text-xs">
                How ratings are spread across the 1–5 scale.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {['5', '4', '3', '2', '1'].map((r) => {
                const count = stats.distribution[r] || 0
                const pct = stats.count > 0 ? (count / stats.count) * 100 : 0
                return (
                  <div key={r} className="flex items-center gap-3">
                    <div className="flex items-center gap-0.5 w-12 text-xs font-medium">
                      {r}
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    </div>
                    <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-amber-400 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="w-16 text-right text-xs text-muted-foreground tabular-nums">
                      {count} ({pct.toFixed(0)}%)
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">By Feedback Type</CardTitle>
              <CardDescription className="text-xs">
                Where students are submitting feedback from.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.byType
                ? Object.entries(stats.byType).map(([t, count]) => {
                    const meta = TYPE_META[t] || TYPE_META.GENERAL
                    return (
                      <div
                        key={t}
                        className="flex items-center justify-between rounded-md border p-2.5"
                      >
                        <Badge variant="outline" className={cn('text-xs', meta.color)}>
                          {meta.label}
                        </Badge>
                        <div className="text-sm font-semibold tabular-nums">{count}</div>
                      </div>
                    )
                  })
                : <Skeleton className="h-8" />}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All types</SelectItem>
                  <SelectItem value="CHECKIN">Check-in</SelectItem>
                  <SelectItem value="SUPPORT_CHAT">Support chat</SelectItem>
                  <SelectItem value="ROOM">Room</SelectItem>
                  <SelectItem value="GENERAL">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Rating</label>
              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All ratings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All ratings</SelectItem>
                  <SelectItem value="5">5 stars</SelectItem>
                  <SelectItem value="4">4 stars</SelectItem>
                  <SelectItem value="3">3 stars</SelectItem>
                  <SelectItem value="2">2 stars</SelectItem>
                  <SelectItem value="1">1 star</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(typeFilter !== 'ALL' || ratingFilter !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTypeFilter('ALL')
                  setRatingFilter('ALL')
                }}
              >
                Clear
              </Button>
            )}
            <div className="ml-auto text-xs text-muted-foreground">
              {feedback.length} of {total} shown
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Feedback Submissions</CardTitle>
          <CardDescription className="text-xs">
            Newest first. Comments are shown verbatim.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="py-8 text-center text-sm text-destructive">
              Failed to load feedback: {error.message}
            </div>
          ) : isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : feedback.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No feedback yet"
              description="When students submit ratings via the in-app widget, their responses will appear here."
            />
          ) : (
            <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
              {feedback.map((f) => {
                const meta = TYPE_META[f.type] || TYPE_META.GENERAL
                return (
                  <div
                    key={f.id}
                    className="rounded-lg border p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <StarRow rating={f.rating} />
                        <Badge variant="outline" className={cn('text-[10px]', meta.color)}>
                          {meta.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground truncate">
                          {f.user.name || f.user.email}
                          {f.user.student?.regNumber && (
                            <span className="ml-1 font-mono">· {f.user.student.regNumber}</span>
                          )}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {fmtDateTime(f.createdAt)}
                      </span>
                    </div>
                    {f.comment ? (
                      <p className="text-sm text-foreground/90 leading-relaxed pl-0.5">
                        &ldquo;{f.comment}&rdquo;
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic pl-0.5">
                        No comment provided.
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
