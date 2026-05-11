'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  CustomerCombobox,
  type CustomerOption,
} from '@/components/features/customers/CustomerCombobox'
import {
  EVENT_CATEGORIES,
  type EventCategory,
} from '@/lib/constants/calendar'
import {
  calendarEventSchema,
  type CalendarEventFormValues,
} from '@/lib/validations/calendar-event'
import {
  addMinutesToTokyoDateTimeLocal,
  formatTokyoDateTimeLocal,
  nowTokyoDateTimeLocal,
} from '@/lib/utils/datetime'
import {
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
} from '@/app/(dashboard)/calendar/actions'

interface UserOption {
  id: string
  name: string
}

export interface EventInitial {
  id: string
  title: string
  type: string
  start_at: string
  end_at: string
  all_day: boolean
  related_customer_id: string | null
  assigned_to: string | null
  location: string | null
  note: string | null
}

export function EventSidePanel({
  open,
  onOpenChange,
  initial,
  defaultStart,
  customers,
  users,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: EventInitial | null
  defaultStart?: string
  customers: CustomerOption[]
  users: UserOption[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [larkSync, setLarkSync] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const form = useForm<CalendarEventFormValues>({
    resolver: zodResolver(calendarEventSchema),
    defaultValues: buildDefaults(initial, defaultStart),
  })

  useEffect(() => {
    if (open) {
      form.reset(buildDefaults(initial, defaultStart))
      setLarkSync(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id])

  const onSubmit = (values: CalendarEventFormValues) => {
    startTransition(async () => {
      const result = initial
        ? await updateCalendarEvent(initial.id, values)
        : await createCalendarEvent(values)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(initial ? '予定を更新しました' : '予定を登録しました')
      if (larkSync) {
        toast.info('Lark Calendar 連携後に自動同期されます (準備中)')
      }
      onOpenChange(false)
      router.refresh()
    })
  }

  const handleDelete = () => {
    if (!initial) return
    startTransition(async () => {
      const result = await deleteCalendarEvent(initial.id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('予定を削除しました')
      setConfirmOpen(false)
      onOpenChange(false)
      router.refresh()
    })
  }

  const errors = form.formState.errors

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto p-6">
        <SheetHeader>
          <SheetTitle>{initial ? '予定を編集' : '予定を追加'}</SheetTitle>
          <SheetDescription>
            活動・社内予定をカレンダーに登録します。
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <Field label="タイトル *" error={errors.title?.message}>
            <Input {...form.register('title')} placeholder="例: ◯◯様 訪問" />
          </Field>

          <Field label="種別 *" error={errors.type?.message}>
            <Select
              value={form.watch('type')}
              onValueChange={(v) =>
                v && form.setValue('type', v as EventCategory)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="開始日時 *" error={errors.start_at?.message}>
              <Input type="datetime-local" {...form.register('start_at')} />
            </Field>
            <Field label="終了日時 *" error={errors.end_at?.message}>
              <Input type="datetime-local" {...form.register('end_at')} />
            </Field>
          </div>

          <label className="flex items-center gap-2 rounded-sm border border-border bg-[color:var(--color-bg-secondary)] px-3 py-2 text-sm">
            <Checkbox
              checked={form.watch('all_day')}
              onCheckedChange={(v) => form.setValue('all_day', Boolean(v))}
            />
            終日
          </label>

          <Field label="関連顧客 (任意)" error={errors.related_customer_id?.message}>
            <CustomerCombobox
              customers={customers}
              value={form.watch('related_customer_id') || null}
              onChange={(id) =>
                form.setValue('related_customer_id', id, { shouldValidate: true })
              }
              placeholder="未選択"
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

          <Field label="場所" error={errors.location?.message}>
            <Input {...form.register('location')} placeholder="例: 顧客自宅 / Web会議URL" />
          </Field>

          <Field label="メモ" error={errors.note?.message}>
            <Textarea rows={3} {...form.register('note')} />
          </Field>

          <label className="flex items-center gap-2 rounded-sm border border-border bg-[color:var(--color-bg-secondary)] px-3 py-2 text-xs text-text-sub">
            <Checkbox
              checked={larkSync}
              onCheckedChange={(v) => setLarkSync(Boolean(v))}
            />
            Lark Calendar に同期する (連携後に有効化)
          </label>

          <SheetFooter className="flex-row justify-between gap-2">
            {initial ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmOpen(true)}
                disabled={pending}
                className="text-[color:var(--color-error)] hover:bg-[color:var(--color-error)]/10"
              >
                <Trash2 className="mr-1 size-4" />
                削除
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
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
            </div>
          </SheetFooter>
        </form>

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="予定を削除しますか?"
          description={`「${initial?.title ?? ''}」を削除します (論理削除)。`}
          confirmLabel="削除する"
          tone="danger"
          loading={pending}
          onConfirm={handleDelete}
        />
      </SheetContent>
    </Sheet>
  )
}

function buildDefaults(
  initial?: EventInitial | null,
  defaultStart?: string,
): CalendarEventFormValues {
  const startAt = defaultStart ?? nowTokyoDateTimeLocal()
  const endAt = addMinutesToTokyoDateTimeLocal(startAt, 60)

  return {
    title: initial?.title ?? '',
    type: ((initial?.type as EventCategory) ?? '訪問') as EventCategory,
    start_at: initial?.start_at ? formatTokyoDateTimeLocal(initial.start_at) : startAt,
    end_at: initial?.end_at ? formatTokyoDateTimeLocal(initial.end_at) : endAt,
    all_day: initial?.all_day ?? false,
    related_customer_id: initial?.related_customer_id ?? null,
    related_opportunity_id: null,
    assigned_to: initial?.assigned_to ?? null,
    location: initial?.location ?? null,
    note: initial?.note ?? null,
  }
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
