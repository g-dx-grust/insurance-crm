'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  customerSchema,
  type CustomerFormValues,
} from '@/lib/validations/customer'
import {
  createCustomer,
  updateCustomer,
} from '@/app/(dashboard)/customers/actions'
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

const STATUS_OPTIONS = ['見込', '既存', '休眠'] as const
const GENDER_OPTIONS = ['男性', '女性', 'その他'] as const

interface UserOption {
  id: string
  name: string
}

export function CustomerForm({
  mode,
  customerId,
  defaultValues,
  users,
}: {
  mode: 'create' | 'edit'
  customerId?: string
  defaultValues?: Partial<CustomerFormValues>
  users: UserOption[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      name_kana: defaultValues?.name_kana ?? '',
      birth_date: defaultValues?.birth_date ?? null,
      gender: defaultValues?.gender ?? null,
      postal_code: defaultValues?.postal_code ?? null,
      address: defaultValues?.address ?? null,
      phone: defaultValues?.phone ?? null,
      email: defaultValues?.email ?? null,
      status: defaultValues?.status ?? '見込',
      assigned_to: defaultValues?.assigned_to ?? null,
      note: defaultValues?.note ?? null,
    },
  })

  const onSubmit = (values: CustomerFormValues) => {
    setServerError(null)
    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createCustomer(values)
          : await updateCustomer(customerId!, values)

      // redirect が成功すると例外を throw して以降は実行されない
      if (result && !result.ok) {
        setServerError(result.error)
        if (result.fieldErrors) {
          for (const [field, msgs] of Object.entries(result.fieldErrors)) {
            if (msgs?.[0]) {
              form.setError(field as keyof CustomerFormValues, { message: msgs[0] })
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
        <h2 className="text-sm font-semibold text-text-sub">基本情報</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="氏名 *" error={errors.name?.message}>
            <Input {...form.register('name')} placeholder="山田 太郎" />
          </Field>
          <Field label="フリガナ *" error={errors.name_kana?.message}>
            <Input {...form.register('name_kana')} placeholder="ヤマダ タロウ" />
          </Field>
          <Field label="生年月日" error={errors.birth_date?.message}>
            <Input type="date" {...form.register('birth_date')} />
          </Field>
          <Field label="性別" error={errors.gender?.message}>
            <Select
              value={form.watch('gender') ?? ''}
              onValueChange={(v) =>
                form.setValue('gender', (v || null) as CustomerFormValues['gender'])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="未選択" />
              </SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </section>

      <section className="rounded-md border border-border bg-bg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-text-sub">連絡先</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="郵便番号" error={errors.postal_code?.message}>
            <Input {...form.register('postal_code')} placeholder="150-0001" />
          </Field>
          <Field label="電話番号" error={errors.phone?.message}>
            <Input {...form.register('phone')} placeholder="090-1234-5678" />
          </Field>
          <Field label="住所" className="sm:col-span-2" error={errors.address?.message}>
            <Input {...form.register('address')} placeholder="東京都渋谷区…" />
          </Field>
          <Field label="メールアドレス" className="sm:col-span-2" error={errors.email?.message}>
            <Input type="email" {...form.register('email')} placeholder="example@company.co.jp" />
          </Field>
        </div>
      </section>

      <section className="rounded-md border border-border bg-bg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-text-sub">担当・分類</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="ステータス *" error={errors.status?.message}>
            <Select
              value={form.watch('status')}
              onValueChange={(v) => form.setValue('status', v as CustomerFormValues['status'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="担当者" error={errors.assigned_to?.message}>
            <Select
              value={form.watch('assigned_to') ?? ''}
              onValueChange={(v) =>
                form.setValue('assigned_to', v === '__none__' ? null : v)
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
