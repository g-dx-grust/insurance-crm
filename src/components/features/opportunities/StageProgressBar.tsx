'use client'

import { useTransition } from 'react'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  ACTIVE_STAGES,
  type OpportunityStage,
} from '@/lib/constants/opportunity'
import { updateOpportunityStage } from '@/app/(dashboard)/opportunities/actions'

export function StageProgressBar({
  opportunityId,
  currentStage,
}: {
  opportunityId: string
  currentStage: OpportunityStage
}) {
  const [pending, startTransition] = useTransition()

  const isLost = currentStage === '失注'
  const isWon = currentStage === '成約'
  const currentIndex = isWon
    ? ACTIVE_STAGES.length
    : isLost
      ? -1
      : ACTIVE_STAGES.indexOf(currentStage)

  const handleClick = (stage: OpportunityStage) => {
    if (stage === currentStage) return
    startTransition(async () => {
      const result = await updateOpportunityStage(opportunityId, stage)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(`ステージを「${stage}」に変更しました`)
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-0">
        {ACTIVE_STAGES.map((stage, index) => {
          const isCurrent = !isLost && !isWon && stage === currentStage
          const isPast = index < currentIndex

          return (
            <button
              key={stage}
              type="button"
              onClick={() => handleClick(stage)}
              disabled={pending}
              className={cn(
                'flex-1 border-b-2 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1',
                isCurrent
                  ? 'border-[color:var(--color-accent)] text-[color:var(--color-accent)]'
                  : isPast
                    ? 'border-[color:var(--color-success)] text-[color:var(--color-success)]'
                    : 'border-border text-text-muted hover:text-text',
              )}
            >
              {isPast && <Check className="size-3" aria-hidden />}
              {stage}
            </button>
          )
        })}
      </div>
      {(isWon || isLost) && (
        <p className="text-xs text-text-muted">
          現在のステージ: <span className="font-medium">{currentStage}</span>
          {' '}（バーは進行中ステージのみ表示。再開する場合は別途ステージを変更）
        </p>
      )}
    </div>
  )
}
