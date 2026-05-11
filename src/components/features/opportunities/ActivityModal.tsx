'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  opportunityActivitySchema,
  opportunityActivityTypes,
  type OpportunityActivityFormValues,
} from '@/lib/validations/opportunity-activity'
import { nowTokyoDateTimeLocal } from '@/lib/utils/datetime'
import { addOpportunityActivity } from '@/app/(dashboard)/opportunities/actions'

export function ActivityModal({
  open,
  onOpenChange,
  opportunityId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  opportunityId: string
}) {
  const [pending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<OpportunityActivityFormValues>({
    resolver: zodResolver(opportunityActivitySchema),
    defaultValues: {
      opportunity_id: opportunityId,
      type: '電話',
      content: '',
      activity_date: nowTokyoDateTimeLocal(),
    },
  })

  const onSubmit = (values: OpportunityActivityFormValues) => {
    setServerError(null)
    startTransition(async () => {
      const result = await addOpportunityActivity(values)
      if (!result.ok) {
        setServerError(result.error)
        toast.error(result.error)
        return
      }
      toast.success('活動を記録しました')
      onOpenChange(false)
      form.reset({
        opportunity_id: opportunityId,
        type: '電話',
        content: '',
        activity_date: nowTokyoDateTimeLocal(),
      })
    })
  }

  const errors = form.formState.errors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>活動を記録</DialogTitle>
          <DialogDescription>
            案件に関する活動 (電話・訪問・提案書送付など) を記録します。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <div className="rounded-sm border border-[color:var(--color-error)]/30 bg-[color:var(--color-error)]/10 p-2 text-xs text-[color:var(--color-error)]">
              {serverError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="種別 *" error={errors.type?.message}>
              <Select
                value={form.watch('type')}
                onValueChange={(v) =>
                  v && form.setValue('type', v as OpportunityActivityFormValues['type'])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {opportunityActivityTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="活動日時 *" error={errors.activity_date?.message}>
              <Input type="datetime-local" {...form.register('activity_date')} />
            </Field>
          </div>

          <Field label="内容 *" error={errors.content?.message}>
            <Textarea rows={4} {...form.register('content')} placeholder="例: 提案資料を送付し、◯◯について同意を得た" />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              キャンセル
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? '記録中…' : '記録する'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <Label className="mb-1 block text-xs font-medium text-text-sub">{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-[color:var(--color-error)]">{error}</p>}
    </div>
  )
}
