'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  contractSchema,
  contractStatuses,
  productCategories,
  renewalStatuses,
  type ContractFormValues,
} from '@/lib/validations/contract'
import {
  createContract,
  updateContract,
} from '@/app/(dashboard)/contracts/actions'
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

interface UserOption {
  id: string
  name: string
}

export function ContractForm({
  mode,
  contractId,
  defaultValues,
  customers,
  users,
}: {
  mode: 'create' | 'edit'
  contractId?: string
  defaultValues?: Partial<ContractFormValues>
  customers: CustomerOption[]
  users: UserOption[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      customer_id: defaultValues?.customer_id ?? '',
      policy_number: defaultValues?.policy_number ?? '',
      insurance_company: defaultValues?.insurance_company ?? '',
      product_name: defaultValues?.product_name ?? '',
      product_category: defaultValues?.product_category ?? '生命保険',
      premium: defaultValues?.premium ?? 0,
      start_date: defaultValues?.start_date ?? '',
      expiry_date: defaultValues?.expiry_date ?? null,
      status: defaultValues?.status ?? '有効',
      renewal_status: defaultValues?.renewal_status ?? '未対応',
      assigned_to: defaultValues?.assigned_to ?? null,
      note: defaultValues?.note ?? null,
    },
  })

  const onSubmit = (values: ContractFormValues) => {
    setServerError(null)
    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createContract(values)
          : await updateContract(contractId!, values)

      if (result && !result.ok) {
        setServerError(result.error)
        if (result.fieldErrors) {
          for (const [field, msgs] of Object.entries(result.fieldErrors)) {
            if (msgs?.[0]) {
              form.setError(field as keyof ContractFormValues, { message: msgs[0] })
            }
          }
        }
        toast.error(result.error)
      }
    })
  }

  const errors = form.formState.errors

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <div className="rounded-sm border border-[color:var(--color-error)]/30 bg-[color:var(--color-error)]/10 p-3 text-sm text-[color:var(--color-error)]">
          {serverError}
        </div>
      )}

      <section className="rounded-md border border-border bg-bg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-text-sub">契約者</h2>
        <Field label="顧客 *" error={errors.customer_id?.message}>
          <CustomerCombobox
            customers={customers}
            value={form.watch('customer_id') || null}
            onChange={(id) => form.setValue('customer_id', id ?? '', { shouldValidate: true })}
          />
        </Field>
      </section>

      <section className="rounded-md border border-border bg-bg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-text-sub">契約内容</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="証券番号 *" error={errors.policy_number?.message}>
            <Input {...form.register('policy_number')} placeholder="例: ABC-123456789" />
          </Field>
          <Field label="保険会社 *" error={errors.insurance_company?.message}>
            <Input {...form.register('insurance_company')} placeholder="例: ◯◯生命保険" />
          </Field>
          <Field label="商品名 *" error={errors.product_name?.message}>
            <Input {...form.register('product_name')} />
          </Field>
          <Field label="商品カテゴリ *" error={errors.product_category?.message}>
            <Select
              value={form.watch('product_category')}
              onValueChange={(v) =>
                v && form.setValue('product_category', v as ContractFormValues['product_category'])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {productCategories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="年間保険料 (円) *" error={errors.premium?.message}>
            <Input
              type="number"
              inputMode="numeric"
              step="1"
              {...form.register('premium', { valueAsNumber: true })}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-md border border-border bg-bg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-text-sub">期間・状態</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="契約開始日 *" error={errors.start_date?.message}>
            <Input type="date" {...form.register('start_date')} />
          </Field>
          <Field label="満期日" error={errors.expiry_date?.message}>
            <Input type="date" {...form.register('expiry_date')} />
          </Field>
          <Field label="ステータス *" error={errors.status?.message}>
            <Select
              value={form.watch('status')}
              onValueChange={(v) =>
                v && form.setValue('status', v as ContractFormValues['status'])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {contractStatuses.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="更改ステータス *" error={errors.renewal_status?.message}>
            <Select
              value={form.watch('renewal_status')}
              onValueChange={(v) =>
                v && form.setValue('renewal_status', v as ContractFormValues['renewal_status'])
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
      </section>

      <section className="rounded-md border border-border bg-bg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-text-sub">担当・備考</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <Field label="備考" className="sm:col-span-2" error={errors.note?.message}>
            <Textarea rows={4} {...form.register('note')} />
          </Field>
        </div>
      </section>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={pending}
        >
          キャンセル
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? '保存中…' : mode === 'create' ? '登録する' : '更新する'}
        </Button>
      </div>
    </form>
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
      <Label className="mb-1.5 block text-xs font-medium text-text-sub">{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-[color:var(--color-error)]">{error}</p>}
    </div>
  )
}
