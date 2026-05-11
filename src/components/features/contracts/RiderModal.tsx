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
import { Checkbox } from '@/components/ui/checkbox'
import {
  contractRiderSchema,
  type ContractRiderFormValues,
} from '@/lib/validations/contract-rider'
import { upsertRider } from '@/app/(dashboard)/contracts/actions'

export interface RiderInitial {
  id: string
  name: string
  coverage: string | null
  premium: number | null
  expiry_date: string | null
  is_active: boolean
}

export function RiderModal({
  open,
  onOpenChange,
  contractId,
  initial,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contractId: string
  initial?: RiderInitial
}) {
  const [pending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<ContractRiderFormValues>({
    resolver: zodResolver(contractRiderSchema),
    defaultValues: {
      contract_id: contractId,
      name: initial?.name ?? '',
      coverage: initial?.coverage ?? null,
      premium: initial?.premium ?? 0,
      expiry_date: initial?.expiry_date ?? null,
      is_active: initial?.is_active ?? true,
    },
  })

  const onSubmit = (values: ContractRiderFormValues) => {
    setServerError(null)
    startTransition(async () => {
      const result = await upsertRider(values, initial?.id)
      if (!result.ok) {
        setServerError(result.error)
        toast.error(result.error)
        return
      }
      toast.success(initial ? '特約を更新しました' : '特約を追加しました')
      onOpenChange(false)
      form.reset({
        contract_id: contractId,
        name: '',
        coverage: null,
        premium: 0,
        expiry_date: null,
        is_active: true,
      })
    })
  }

  const errors = form.formState.errors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{initial ? '特約を編集' : '特約を追加'}</DialogTitle>
          <DialogDescription>
            主契約に付帯する特約・特則を登録します。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <div className="rounded-sm border border-[color:var(--color-error)]/30 bg-[color:var(--color-error)]/10 p-2 text-xs text-[color:var(--color-error)]">
              {serverError}
            </div>
          )}

          <Field label="特約名 *" error={errors.name?.message}>
            <Input {...form.register('name')} placeholder="例: 災害死亡特約" />
          </Field>
          <Field label="保障内容" error={errors.coverage?.message}>
            <Textarea rows={3} {...form.register('coverage')} placeholder="特約の保障内容・概要" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="特約保険料 (円)" error={errors.premium?.message}>
              <Input
                type="number"
                inputMode="numeric"
                step="1"
                {...form.register('premium', { valueAsNumber: true })}
              />
            </Field>
            <Field label="有効期限" error={errors.expiry_date?.message}>
              <Input type="date" {...form.register('expiry_date')} />
            </Field>
          </div>

          <label className="flex items-center gap-2 rounded-sm border border-border bg-[color:var(--color-bg-secondary)] px-3 py-2 text-sm">
            <Checkbox
              checked={form.watch('is_active')}
              onCheckedChange={(v) => form.setValue('is_active', Boolean(v))}
            />
            有効
          </label>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
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
