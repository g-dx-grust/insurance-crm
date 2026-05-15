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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  contactHistorySchema,
  contactHistoryTypes,
  type ContactHistoryFormValues,
} from '@/lib/validations/contact-history'
import { nowTokyoDateTimeLocal } from '@/lib/utils/datetime'
import { addContactHistory } from '@/app/(dashboard)/customers/actions'

interface MeetingTemplateOption {
  id: string
  title: string
  type: string
  content: string
  next_action: string | null
}

export function ContactHistoryModal({
  open,
  onOpenChange,
  customerId,
  templates,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: string
  templates: MeetingTemplateOption[]
}) {
  const [pending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [registerOnLark, setRegisterOnLark] = useState(false)

  const form = useForm<ContactHistoryFormValues>({
    resolver: zodResolver(contactHistorySchema),
    defaultValues: {
      customer_id: customerId,
      type: '電話',
      content: '',
      contacted_at: nowTokyoDateTimeLocal(),
      next_action: null,
      next_action_date: null,
    },
  })

  const nextDate = form.watch('next_action_date')
  const templateItems = templates.map((template) => ({
    id: template.id,
    name: template.title,
  }))

  const onSubmit = (values: ContactHistoryFormValues) => {
    setServerError(null)
    startTransition(async () => {
      const result = await addContactHistory(values)
      if (!result.ok) {
        setServerError(result.error)
        toast.error(result.error)
        return
      }
      toast.success('対応履歴を登録しました')
      if (registerOnLark) {
        toast.info('Lark Calendar 連携後に自動登録されます (準備中)')
      }
      onOpenChange(false)
      form.reset({
        customer_id: customerId,
        type: '電話',
        content: '',
        contacted_at: nowTokyoDateTimeLocal(),
        next_action: null,
        next_action_date: null,
      })
      setRegisterOnLark(false)
    })
  }

  const errors = form.formState.errors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>対応履歴を登録</DialogTitle>
          <DialogDescription>
            対応履歴は保険業法上の重要記録です。物理削除はできません。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <div className="rounded-sm border border-[color:var(--color-error)]/30 bg-[color:var(--color-error)]/10 p-2 text-xs text-[color:var(--color-error)]">
              {serverError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="対応種別 *" error={errors.type?.message}>
              <Select
                value={form.watch('type')}
                onValueChange={(v) =>
                  form.setValue('type', v as ContactHistoryFormValues['type'])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contactHistoryTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="対応日時 *" error={errors.contacted_at?.message}>
              <Input type="datetime-local" {...form.register('contacted_at')} />
            </Field>
          </div>

          {templates.length > 0 && (
            <Field label="テンプレート">
              <Select
                value="__none__"
                onValueChange={(id) => {
                  if (!id || id === '__none__') return
                  const template = templates.find((item) => item.id === id)
                  if (!template) return
                  form.setValue('type', template.type as ContactHistoryFormValues['type'])
                  form.setValue('content', template.content)
                  form.setValue('next_action', template.next_action)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="テンプレートを選択" items={templateItems} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">選択しない</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field label="対応内容 *" error={errors.content?.message}>
            <Textarea rows={4} {...form.register('content')} placeholder="例: 満期更改のご相談を受けた…" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="次回アクション" error={errors.next_action?.message}>
              <Input {...form.register('next_action')} placeholder="例: 提案資料を送付" />
            </Field>
            <Field label="次回予定日" error={errors.next_action_date?.message}>
              <Input type="date" {...form.register('next_action_date')} />
            </Field>
          </div>

          {nextDate && (
            <label className="flex items-center gap-2 rounded-sm border border-border bg-[color:var(--color-bg-secondary)] px-3 py-2 text-xs text-text-sub">
              <Checkbox
                checked={registerOnLark}
                onCheckedChange={(v) => setRegisterOnLark(Boolean(v))}
              />
              Lark Calendar に登録する (連携後に有効化)
            </label>
          )}

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
