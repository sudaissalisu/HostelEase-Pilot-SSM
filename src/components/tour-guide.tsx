'use client'

/**
 * TourGuide — reusable spotlight overlay component for first-time user tours.
 *
 * Renders a semi-transparent dark backdrop with a "hole" cut out around the
 * active target element (via box-shadow trick), plus a tooltip card that
 * explains the feature. Supports Next/Back/Skip/Got it navigation.
 *
 * Usage:
 *   const { tourActive, closeTour } = useTour('my-page-tour')
 *   <TourGuide steps={steps} onClose={closeTour} />
 *
 * Target elements must have a `data-tour="step-id"` attribute matching the
 * step's `target` field.
 */

import * as React from 'react'
import {
  X,
  ChevronRight,
  SkipForward,
  Sparkles,
  MousePointerClick,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface TourStep {
  target: string // data-tour attribute value
  title: string
  body: string
  icon: React.ComponentType<{ className?: string }>
}

// ---------------------------------------------------------------------------
// useTour — hook that manages localStorage-backed tour state
// ---------------------------------------------------------------------------

export function useTour(storageKey: string, autoStart = true) {
  const [tourActive, setTourActive] = React.useState(false)

  // Check localStorage on mount — only auto-start if not seen before.
  React.useEffect(() => {
    if (!autoStart || typeof window === 'undefined') return
    try {
      const seen = window.localStorage.getItem(storageKey)
      if (seen === '1') return
    } catch {
      /* ignore */
    }
    // Poll for data-tour elements — the dashboard data may still be loading
    // (SWR fetch from remote DB), so the tour targets won't exist until the
    // data renders. Retry every 500ms for up to 10 seconds.
    let attempts = 0
    const maxAttempts = 20
    const interval = window.setInterval(() => {
      attempts++
      const els = document.querySelectorAll('[data-tour]')
      if (els.length > 0 || attempts >= maxAttempts) {
        window.clearInterval(interval)
        setTourActive(true)
      }
    }, 500)
    return () => window.clearInterval(interval)
  }, [storageKey, autoStart])

  const closeTour = React.useCallback(() => {
    setTourActive(false)
    try {
      window.localStorage.setItem(storageKey, '1')
    } catch {
      /* ignore */
    }
  }, [storageKey])

  // Allow manually re-triggering the tour (e.g. via a "Replay tour" button)
  const startTour = React.useCallback(() => {
    setTourActive(true)
  }, [])

  return { tourActive, closeTour, startTour }
}

// ---------------------------------------------------------------------------
// TourGuide component
// ---------------------------------------------------------------------------

export function TourGuide({
  steps,
  onClose,
}: {
  steps: TourStep[]
  onClose: () => void
}) {
  const [stepIndex, setStepIndex] = React.useState(0)
  const [targetRect, setTargetRect] = React.useState<DOMRect | null>(null)
  const [tooltipPos, setTooltipPos] = React.useState<{
    top: number
    left: number
    placement: 'top' | 'bottom'
  } | null>(null)

  const step = steps[stepIndex]
  const isLast = stepIndex === steps.length - 1

  // Find the target element and compute its position.
  React.useLayoutEffect(() => {
    if (!step) return
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
    if (!el) {
      setTargetRect(null)
      setTooltipPos(null)
      return
    }

    // Scroll the element into view first so it's measurable.
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })

    const compute = () => {
      const rect = el.getBoundingClientRect()
      setTargetRect(rect)

      const tooltipWidth = 340
      const tooltipHeight = 200
      const viewportH = window.innerHeight
      const viewportW = window.innerWidth

      const spaceBelow = viewportH - rect.bottom
      const placement: 'top' | 'bottom' =
        spaceBelow > tooltipHeight + 20 || rect.top < tooltipHeight + 20
          ? 'bottom'
          : 'top'

      let top =
        placement === 'bottom'
          ? rect.bottom + 12
          : rect.top - tooltipHeight - 12

      top = Math.max(12, Math.min(top, viewportH - tooltipHeight - 12))

      let left = rect.left + rect.width / 2 - tooltipWidth / 2
      left = Math.max(12, Math.min(left, viewportW - tooltipWidth - 12))

      setTooltipPos({ top, left, placement })
    }

    const t1 = window.setTimeout(compute, 250)
    const t2 = window.setTimeout(compute, 500)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [step])

  // Recompute on resize / scroll while the tour is open.
  React.useEffect(() => {
    if (!step) return
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
    if (!el) return
    const recompute = () => {
      const rect = el.getBoundingClientRect()
      setTargetRect(rect)
    }
    window.addEventListener('resize', recompute)
    window.addEventListener('scroll', recompute, true)
    return () => {
      window.removeEventListener('resize', recompute)
      window.removeEventListener('scroll', recompute, true)
    }
  }, [step])

  // ESC key closes the tour.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!step || !targetRect || !tooltipPos) return null

  const padding = 6
  const highlightedTop = targetRect.top - padding
  const highlightedLeft = targetRect.left - padding
  const highlightedWidth = targetRect.width + padding * 2
  const highlightedHeight = targetRect.height + padding * 2

  const boxShadow =
    '0 0 0 9999px rgba(0, 0, 0, 0.65), 0 0 0 3px rgba(16, 185, 129, 0.8), 0 0 20px 4px rgba(16, 185, 129, 0.4)'

  const StepIcon = step.icon

  return (
    <div
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-label="Page tour guide"
    >
      {/* Spotlight overlay */}
      <div
        className="absolute rounded-xl pointer-events-auto transition-all duration-300 ease-out"
        style={{
          top: highlightedTop,
          left: highlightedLeft,
          width: highlightedWidth,
          height: highlightedHeight,
          boxShadow,
        }}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Click-away backdrop */}
      <div className="absolute inset-0 pointer-events-auto" onClick={onClose} />

      {/* Tooltip card */}
      <div
        className="absolute z-[101] w-[calc(100vw-1.5rem)] max-w-[340px] rounded-2xl border bg-card shadow-2xl pointer-events-auto animate-in fade-in zoom-in-95 duration-200"
        style={{ top: tooltipPos.top, left: tooltipPos.left }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            'absolute left-1/2 -translate-x-1/2 h-3 w-3 rotate-45 border bg-card',
            tooltipPos.placement === 'bottom'
              ? '-top-1.5 border-t border-l'
              : '-bottom-1.5 border-b border-r'
          )}
        />

        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 shrink-0 rounded-lg bg-primary/10 text-primary grid place-items-center">
                <StepIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary mb-0.5">
                  <Sparkles className="h-3 w-3" />
                  Quick Tour
                  <span className="text-muted-foreground font-normal normal-case tracking-normal">
                    · {stepIndex + 1}/{steps.length}
                  </span>
                </div>
                <h3 className="text-sm font-bold leading-tight">
                  {step.title}
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close tour"
              className="shrink-0 h-7 w-7 rounded-md grid place-items-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            {step.body}
          </p>

          <div className="flex items-center gap-1.5 mb-4">
            {steps.map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === stepIndex
                    ? 'w-6 bg-primary'
                    : i < stepIndex
                      ? 'w-1.5 bg-primary/50'
                      : 'w-1.5 bg-muted-foreground/30'
                )}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <SkipForward className="h-3.5 w-3.5" />
              Skip tour
            </button>
            <div className="flex items-center gap-2">
              {stepIndex > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                  className="h-8 px-3 text-xs"
                >
                  Back
                </Button>
              ) : null}
              <Button
                size="sm"
                onClick={() => {
                  if (isLast) {
                    onClose()
                  } else {
                    setStepIndex((i) => Math.min(steps.length - 1, i + 1))
                  }
                }}
                className="h-8 px-4 text-xs gap-1.5"
              >
                {isLast ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Got it
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-black/70 text-white px-3 py-1.5 text-[10px] font-medium backdrop-blur-sm">
          <MousePointerClick className="h-3 w-3" />
          Press ESC or click anywhere to close
        </div>
      </div>
    </div>
  )
}
