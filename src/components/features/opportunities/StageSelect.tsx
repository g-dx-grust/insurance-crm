'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  OPPORTUNITY_STAGES,
  type OpportunityStage,
} from '@/lib/constants/opportunity'
import { updateOpportunityStage } from '@/app/(dashboard)/opportunities/actions'

export function StageSelect({
  opportunityId,
  current,
  size = 'default',
}: {
  opportunityId: string
  current: OpportunityStage
  size?: 'default' | 'sm'
}) {
  const [pending, startTransition] = useTransition()

  const handleChange = (next: string | null) => {
    if (!next || next === current) return
    if (!OPPORTUNITY_STAGES.includes(next as OpportunityStage)) return

    startTransition(async () => {
      const result = await updateOpportunityStage(
        opportunityId,
        next as OpportunityStage,
      )
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(`ステージを「${next}」に変更しました`)
    })
  }

  return (
    <Select
      value={current}
      onValueChange={handleChange}
      disabled={pending}
    >
      <SelectTrigger className={size === 'sm' ? 'w-36 text-sm' : ''}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPPORTUNITY_STAGES.map((s) => (
          <SelectItem key={s} value={s}>{s}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
