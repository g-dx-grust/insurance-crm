'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  familyMemberSchema,
  familyRelationships,
  type FamilyMemberFormValues,
} from '@/lib/validations/family-member'
import { upsertFamilyMember } from '@/app/(dashboard)/customers/actions'

export interface FamilyMemberInitial {
  id: string
  name: string
  name_kana: string | null
  relationship: string
  birth_date: string | null
  gender: string | null
  is_insured: boolean
  is_beneficiary: boolean
  note: string | null
}

export function FamilyMemberModal({
  open,
  onOpenChange,
  customerId,
  initial,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: string
  initial?: FamilyMemberInitial
}) {
  const [pending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<FamilyMemberFormValues>({
    resolver: zodResolver(familyMemberSchema),
    defaultValues: {
      customer_id: customerId,
      name: initial?.name ?? '',
      name_kana: initial?.name_kana ?? null,
      relationship:
        (initial?.relationship as FamilyMemberFormValues['relationship']) ?? '配偶者',
      birth_date: initial?.birth_date ?? null,
      gender: (initial?.gender as FamilyMemberFormValues['gender']) ?? null,
      is_insured: initial?.is_insured ?? false,
      is_beneficiary: initial?.is_beneficiary ?? false,
      note: initial?.note ?? null,
    },
  })

  const onSubmit = (values: FamilyMemberFormValues) => {
    setServerError(null)
    startTransition(async () => {
      const result = await upsertFamilyMember(values, initial?.id)
      if (!result.ok) {
        setServerError(result.error)
        toast.error(result.error)
        return
      }
      toast.success(initial ? '家族情報を更新しました' : '家族情報を登録しました')
      onOpenChange(false)
      form.reset()
    })
  }

  const errors = form.formState.errors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{initial ? '家族情報を編集' : '家族情報を追加'}</DialogTitle>
          <DialogDescription>
            被保険者・受取人フラグは保険提案・意向把握の参考になります。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <div className="rounded-sm border border-[color:var(--color-error)]/30 bg-[color:var(--color-error)]/10 p-2 text-xs text-[color:var(--color-error)]">
              {serverError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="続柄 *" error={errors.relationship?.message}>
              <Select
                value={form.watch('relationship')}
                onValueChange={(v) =>
                  form.setValue('relationship', v as FamilyMemberFormValues['relationship'])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {familyRelationships.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="氏名 *" error={errors.name?.message}>
              <Input {...form.register('name')} />
            </Field>
            <Field label="フリガナ" error={errors.name_kana?.message}>
              <Input {...form.register('name_kana')} placeholder="ヤマダ ハナコ" />
            </Field>
            <Field label="生年月日" error={errors.birth_date?.message}>
              <Input type="date" {...form.register('birth_date')} />
            </Field>
            <Field label="性別" className="col-span-2" error={errors.gender?.message}>
              <RadioGroup
                value={form.watch('gender') ?? ''}
                onValueChange={(v) =>
                  form.setValue('gender', (v || null) as FamilyMemberFormValues['gender'])
                }
                className="flex gap-4"
              >
                {(['男性', '女性', 'その他'] as const).map((g) => (
                  <div key={g} className="flex items-center gap-2">
                    <RadioGroupItem id={`gender-${g}`} value={g} />
                    <Label htmlFor={`gender-${g}`} className="text-sm">{g}</Label>
                  </div>
                ))}
              </RadioGroup>
            </Field>
          </div>

          <div className="flex items-center gap-6 rounded-sm border border-border bg-[color:var(--color-bg-secondary)] px-3 py-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.watch('is_insured')}
                onCheckedChange={(v) => form.setValue('is_insured', Boolean(v))}
              />
              被保険者
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.watch('is_beneficiary')}
                onCheckedChange={(v) => form.setValue('is_beneficiary', Boolean(v))}
              />
              受取人
            </label>
          </div>

          <Field label="備考" error={errors.note?.message}>
            <Textarea rows={3} {...form.register('note')} />
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
