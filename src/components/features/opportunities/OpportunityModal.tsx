'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  CustomerCombobox,
  type CustomerOption,
} from '@/components/features/customers/CustomerCombobox'
import {
  opportunitySchema,
  type OpportunityFormValues,
} from '@/lib/validations/opportunity'
import { OPPORTUNITY_STAGES } from '@/lib/constants/opportunity'
import {
  createOpportunity,
  updateOpportunity,
} from '@/app/(dashboard)/opportunities/actions'

interface UserOption {
  id: string
  name: string
}

export interface OpportunityInitial {
  id: string
  customer_id: string
  title: string
  stage: string
  estimated_premium: number | null
  expected_close_date: string | null
  assigned_to: string | null
  note: string | null
}

export function OpportunityModal({
  open,
  onOpenChange,
  customers,
  users,
  initial,
  defaultCustomerId,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  customers: CustomerOption[]
  users: UserOption[]
  initial?: OpportunityInitial
  defaultCustomerId?: string
  onSaved?: (id: string) => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: buildDefaults(initial, defaultCustomerId),
  })

  // 開閉時に initial / defaultCustomerId が変わったら再初期化
  useEffect(() => {
    if (open) form.reset(buildDefaults(initial, defaultCustomerId))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id])

  const onSubmit = (values: OpportunityFormValues) => {
    setServerError(null)
    startTransition(async () => {
      const result = initial
        ? await updateOpportunity(initial.id, values)
        : await createOpportunity(values)

      if (!result.ok) {
        setServerError(result.error)
        toast.error(result.error)
        return
      }
      toast.success(initial ? '案件を更新しました' : '案件を登録しました')
      onOpenChange(false)
      const newId = (result.data as { id?: string } | undefined)?.id
      if (newId && onSaved) onSaved(newId)
      router.refresh()
    })
  }

  const errors = form.formState.errors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{initial ? '案件を編集' : '案件を新規作成'}</DialogTitle>
          <DialogDescription>
            ステージは登録後にカンバン・詳細から変更できます。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <div className="rounded-sm border border-[color:var(--color-error)]/30 bg-[color:var(--color-error)]/10 p-2 text-xs text-[color:var(--color-error)]">
              {serverError}
            </div>
          )}

          <Field label="顧客 *" error={errors.customer_id?.message}>
            <CustomerCombobox
              customers={customers}
              value={form.watch('customer_id') || null}
              onChange={(id) =>
                form.setValue('customer_id', id ?? '', { shouldValidate: true })
              }
            />
          </Field>

          <Field label="案件タイトル *" error={errors.title?.message}>
            <Input {...form.register('title')} placeholder="例: 満期更改提案" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="ステージ *" error={errors.stage?.message}>
              <Select
                value={form.watch('stage')}
                onValueChange={(v) =>
                  v && form.setValue('stage', v as OpportunityFormValues['stage'])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPPORTUNITY_STAGES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="想定保険料 (円)" error={errors.estimated_premium?.message}>
              <Input
                type="number"
                inputMode="numeric"
                step="1"
                {...form.register('estimated_premium', {
                  setValueAs: (v) => (v === '' || v == null ? null : Number(v)),
                })}
              />
            </Field>
            <Field label="成約予定日" error={errors.expected_close_date?.message}>
              <Input type="date" {...form.register('expected_close_date')} />
            </Field>
            <Field label="担当者" error={errors.assigned_to?.message}>
              <Select
                value={form.watch('assigned_to') ?? '__none__'}
                onValueChange={(v) =>
                  form.setValue('assigned_to', !v || v === '__none__' ? null : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="未選択" items={users} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">未割当</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="メモ" error={errors.note?.message}>
            <Textarea rows={3} {...form.register('note')} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              キャンセル
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? '保存中…' : '保存する'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function buildDefaults(
  initial?: OpportunityInitial,
  defaultCustomerId?: string,
): OpportunityFormValues {
  return {
    customer_id: initial?.customer_id ?? defaultCustomerId ?? '',
    title: initial?.title ?? '',
    stage: (initial?.stage as OpportunityFormValues['stage']) ?? '初回接触',
    estimated_premium: initial?.estimated_premium ?? null,
    expected_close_date: initial?.expected_close_date ?? null,
    assigned_to: initial?.assigned_to ?? null,
    note: initial?.note ?? null,
    lost_reason: null,
  }
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <Label className="mb-1 block text-xs font-medium text-text-sub">{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-[color:var(--color-error)]">{error}</p>}
    </div>
  )
}
