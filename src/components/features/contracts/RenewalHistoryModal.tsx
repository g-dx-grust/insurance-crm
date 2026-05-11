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
  renewalRecordSchema,
  type RenewalRecordFormValues,
} from '@/lib/validations/renewal'
import { renewalStatuses } from '@/lib/validations/contract'
import { addRenewalRecord } from '@/app/(dashboard)/contracts/actions'

interface UserOption {
  id: string
  name: string
}

export function RenewalHistoryModal({
  open,
  onOpenChange,
  contractId,
  customerId,
  currentRenewalStatus,
  users,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contractId: string
  customerId: string
  currentRenewalStatus: string
  users: UserOption[]
}) {
  const [pending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<RenewalRecordFormValues>({
    resolver: zodResolver(renewalRecordSchema),
    defaultValues: {
      contract_id: contractId,
      customer_id: customerId,
      renewal_date: new Date().toISOString().slice(0, 10),
      content: '',
      new_premium: null,
      assigned_to: null,
      lark_approval_id: null,
      next_renewal_status: (currentRenewalStatus as RenewalRecordFormValues['next_renewal_status']) ?? '対応中',
    },
  })

  const onSubmit = (values: RenewalRecordFormValues) => {
    setServerError(null)
    startTransition(async () => {
      const result = await addRenewalRecord(values)
      if (!result.ok) {
        setServerError(result.error)
        toast.error(result.error)
        return
      }
      toast.success('更改履歴を登録しました')
      onOpenChange(false)
      form.reset({
        contract_id: contractId,
        customer_id: customerId,
        renewal_date: new Date().toISOString().slice(0, 10),
        content: '',
        new_premium: null,
        assigned_to: null,
        lark_approval_id: null,
        next_renewal_status: '対応中',
      })
    })
  }

  const errors = form.formState.errors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>更改履歴を追加</DialogTitle>
          <DialogDescription>
            記録は対応履歴 (種別「更改」) として保存され、契約の更改ステータスも更新されます。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <div className="rounded-sm border border-[color:var(--color-error)]/30 bg-[color:var(--color-error)]/10 p-2 text-xs text-[color:var(--color-error)]">
              {serverError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="更改日 *" error={errors.renewal_date?.message}>
              <Input type="date" {...form.register('renewal_date')} />
            </Field>
            <Field label="次の更改ステータス *" error={errors.next_renewal_status?.message}>
              <Select
                value={form.watch('next_renewal_status')}
                onValueChange={(v) =>
                  v && form.setValue('next_renewal_status', v as RenewalRecordFormValues['next_renewal_status'])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {renewalStatuses.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="更改内容 *" error={errors.content?.message}>
            <Textarea
              rows={4}
              {...form.register('content')}
              placeholder="例: 主契約の保障額を見直し、特約 X を追加…"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="更改後保険料 (円)" error={errors.new_premium?.message}>
              <Input
                type="number"
                inputMode="numeric"
                step="1"
                {...form.register('new_premium', { valueAsNumber: true })}
              />
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

          <Field label="Lark Approval ID (任意)" error={errors.lark_approval_id?.message}>
            <Input {...form.register('lark_approval_id')} placeholder="将来の Lark 連携用" />
          </Field>

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
              {pending ? '登録中…' : '登録する'}
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
