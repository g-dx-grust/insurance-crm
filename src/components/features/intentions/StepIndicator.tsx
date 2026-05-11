'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEP_LABELS = ['当初意向', '提案・比較', '最終意向', '確認事項'] as const

export function StepIndicator({
  currentStep,
}: {
  currentStep: 1 | 2 | 3 | 4
}) {
  return (
    <ol className="flex items-center gap-0 mb-6">
      {STEP_LABELS.map((label, idx) => {
        const stepNum = (idx + 1) as 1 | 2 | 3 | 4
        const isCurrent = stepNum === currentStep
        const isPast = stepNum < currentStep
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium',
                isCurrent
                  ? 'bg-[color:var(--color-accent)] text-white'
                  : isPast
                    ? 'bg-[color:var(--color-success)] text-white'
                    : 'border border-border bg-bg text-text-muted',
              )}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {isPast ? <Check className="size-3.5" /> : stepNum}
            </div>
            <span
              className={cn(
                'text-xs',
                isCurrent
                  ? 'font-medium text-text'
                  : isPast
                    ? 'text-[color:var(--color-success)]'
                    : 'text-text-muted',
              )}
            >
              {label}
            </span>
            {idx < STEP_LABELS.length - 1 && (
              <div
                className={cn(
                  'h-px flex-1',
                  isPast
                    ? 'bg-[color:var(--color-success)]'
                    : 'bg-border',
                )}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
