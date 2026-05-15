'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Pencil, Plus, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge, type StatusVariant } from '@/components/ui/StatusBadge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  carryOutStatuses,
  documentTypes,
  type DocumentCarryOutFormValues,
} from '@/lib/validations/document-carry-out'
import { upsertCarryOutLog } from '@/app/(dashboard)/carry-out-logs/actions'
import {
  formatTokyoDateTime,
  formatTokyoDateTimeLocal,
  nowTokyoDateTimeLocal,
} from '@/lib/utils/datetime'

export interface CarryOutLogRow {
  id: string
  customer_id: string | null
  document_title: string
  document_type: string
  purpose: string
  destination: string | null
  carried_out_by: string
  carried_out_at: string
  expected_return_at: string | null
  returned_at: string | null
  status: string
  loss_reported_at: string | null
  note: string | null
  customers: { id: string; name: string; name_kana: string } | null
  carried_user: { id: string; name: string } | null
  creator: { name: string } | null
}

interface UserOption {
  id: string
  name: string
}

function emptyValues(currentUserId: string): DocumentCarryOutFormValues {
  return {
    customer_id: null,
    document_title: '',
    document_type: '設計書',
    purpose: '',
    destination: null,
    carried_out_by: currentUserId,
    carried_out_at: nowTokyoDateTimeLocal(),
    expected_return_at: null,
    returned_at: null,
    status: '持出中',
    note: null,
  }
}

export function CarryOutLogsClient({
  logs,
  customers,
  users,
  currentUserId,
}: {
  logs: CarryOutLogRow[]
  customers: CustomerOption[]
  users: UserOption[]
  currentUserId: string
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CarryOutLogRow | null>(null)

  const openNew = () => {
    setEditing(null)
    setOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}>
          <Plus className="size-4" />
          持ち出しを記録
        </Button>
      </div>

      {logs.length === 0 ? (
        <EmptyState
          title="持ち出し記録がありません"
          description="氏名・生年月日など個人情報が含まれる書類の持ち出しを記録します。"
        />
      ) : (
        <div className="overflow-hidden rounded-md border border-border bg-bg">
          <table>
            <thead>
              <tr>
                <th>状態</th>
                <th>書類</th>
                <th>顧客</th>
                <th>持ち出し者</th>
                <th>持ち出し日時</th>
                <th>返却予定 / 返却</th>
                <th>持ち出し先</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <StatusBadge variant={statusVariant(log.status)}>
                      {log.status}
                    </StatusBadge>
                  </td>
                  <td>
                    <p className="font-medium text-text">{log.document_title}</p>
                    <p className="mt-0.5 text-xs text-text-muted">{log.document_type}</p>
                  </td>
                  <td>
                    {log.customers ? (
                      <Link
                        href={`/customers/${log.customers.id}`}
                        className="hover:underline"
                      >
                        {log.customers.name}
                      </Link>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="text-text-sub">{log.carried_user?.name ?? '—'}</td>
                  <td className="text-text-sub">
                    {formatTokyoDateTime(log.carried_out_at)}
                  </td>
                  <td className="text-text-sub">
                    <p>{log.expected_return_at ? formatTokyoDateTime(log.expected_return_at) : '—'}</p>
                    {log.returned_at && (
                      <p className="mt-0.5 text-xs text-[color:var(--color-success)]">
                        返却: {formatTokyoDateTime(log.returned_at)}
                      </p>
                    )}
                  </td>
                  <td className="text-text-sub">{log.destination ?? '—'}</td>
                  <td className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(log)
                        setOpen(true)
                      }}
                      className="inline-flex size-control items-center justify-center rounded-sm text-text-muted hover:bg-[color:var(--color-bg-secondary)] hover:text-text"
                      aria-label="編集"
                      title="編集"
                    >
                      <Pencil className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <CarryOutDialog
          key={editing?.id ?? 'new'}
          open={open}
          onOpenChange={setOpen}
          initial={editing}
          customers={customers}
          users={users}
          currentUserId={currentUserId}
        />
      )}
    </div>
  )
}

function CarryOutDialog({
  open,
  onOpenChange,
  initial,
  customers,
  users,
  currentUserId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial: CarryOutLogRow | null
  customers: CustomerOption[]
  users: UserOption[]
  currentUserId: string
}) {
  const [pending, startTransition] = useTransition()
  const [values, setValues] = useState<DocumentCarryOutFormValues>(
    initial
      ? {
          customer_id: initial.customer_id,
          document_title: initial.document_title,
          document_type: initial.document_type as DocumentCarryOutFormValues['document_type'],
          purpose: initial.purpose,
          destination: initial.destination,
          carried_out_by: initial.carried_out_by,
          carried_out_at: formatTokyoDateTimeLocal(initial.carried_out_at),
          expected_return_at: initial.expected_return_at
            ? formatTokyoDateTimeLocal(initial.expected_return_at)
            : null,
          returned_at: initial.returned_at
            ? formatTokyoDateTimeLocal(initial.returned_at)
            : null,
          status: initial.status as DocumentCarryOutFormValues['status'],
          note: initial.note,
        }
      : emptyValues(currentUserId),
  )

  const save = () => {
    startTransition(async () => {
      const result = await upsertCarryOutLog(values, initial?.id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(initial ? '持ち出し記録を更新しました' : '持ち出しを記録しました')
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>持ち出し記録簿</DialogTitle>
          <DialogDescription>
            個人情報が含まれる書類の持ち出し・返却・紛失時の追跡情報を記録します。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="書類名 *">
              <Input
                value={values.document_title}
                onChange={(event) =>
                  setValues({ ...values, document_title: event.target.value })
                }
              />
            </Field>
            <OptionField
              label="書類種別 *"
              value={values.document_type}
              options={documentTypes}
              onChange={(document_type) => setValues({ ...values, document_type })}
            />
            <Field label="関連顧客">
              <CustomerCombobox
                customers={customers}
                value={values.customer_id ?? null}
                onChange={(id) => setValues({ ...values, customer_id: id })}
                placeholder="顧客を紐付けない"
              />
            </Field>
            <Field label="持ち出し者 *">
              <Select
                value={values.carried_out_by}
                onValueChange={(carried_out_by) => {
                  if (!carried_out_by) return
                  setValues({ ...values, carried_out_by })
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue items={users} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="持ち出し目的 *">
            <Textarea
              rows={2}
              value={values.purpose}
              onChange={(event) => setValues({ ...values, purpose: event.target.value })}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="持ち出し先">
              <Input
                value={values.destination ?? ''}
                onChange={(event) =>
                  setValues({ ...values, destination: event.target.value || null })
                }
              />
            </Field>
            <OptionField
              label="状態 *"
              value={values.status}
              options={carryOutStatuses}
              onChange={(status) => setValues({ ...values, status })}
            />
            <Field label="持ち出し日時 *">
              <Input
                type="datetime-local"
                value={values.carried_out_at}
                onChange={(event) =>
                  setValues({ ...values, carried_out_at: event.target.value })
                }
              />
            </Field>
            <Field label="返却予定日時">
              <Input
                type="datetime-local"
                value={values.expected_return_at ?? ''}
                onChange={(event) =>
                  setValues({ ...values, expected_return_at: event.target.value || null })
                }
              />
            </Field>
            <Field label="返却日時">
              <Input
                type="datetime-local"
                value={values.returned_at ?? ''}
                onChange={(event) =>
                  setValues({ ...values, returned_at: event.target.value || null })
                }
              />
            </Field>
            <Field label="補足">
              <Textarea
                rows={2}
                value={values.note ?? ''}
                onChange={(event) =>
                  setValues({ ...values, note: event.target.value || null })
                }
              />
            </Field>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            キャンセル
          </Button>
          <Button
            onClick={save}
            disabled={
              pending ||
              !values.document_title ||
              !values.purpose ||
              !values.carried_out_by
            }
          >
            <Save className="size-4" />
            {pending ? '保存中…' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function OptionField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: readonly T[]
  onChange: (value: T) => void
}) {
  return (
    <Field label={label}>
      <Select value={value} onValueChange={(next) => onChange(next as T)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>{option}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <Label className="mb-1 block text-xs font-medium text-text-sub">{label}</Label>
      {children}
    </div>
  )
}

function statusVariant(status: string): StatusVariant {
  switch (status) {
    case '返却済': return 'success'
    case '紛失': return 'danger'
    case '取消': return 'muted'
    case '持出中': return 'warning'
    default: return 'default'
  }
}
