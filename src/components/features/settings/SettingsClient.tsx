'use client'

import { useState, useTransition } from 'react'
import { Plus, Save, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge, type StatusVariant } from '@/components/ui/StatusBadge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  type ComplianceSettingsValues,
  type InviteUserValues,
  type NotificationSettingsValues,
  type OrgInfoValues,
} from '@/lib/validations/settings'
import {
  activateUser,
  deactivateUser,
  inviteUser,
  setUserRole,
  updateComplianceSettings,
  updateNotificationSettings,
  updateOrgInfo,
} from '@/app/(dashboard)/settings/actions'

export interface UserRow {
  id: string
  name: string
  email: string
  role: string
  department: string | null
  is_active: boolean
}

export function SettingsClient({
  orgInfo,
  notification,
  compliance,
  users,
  isAdmin,
}: {
  orgInfo: OrgInfoValues
  notification: NotificationSettingsValues
  compliance: ComplianceSettingsValues
  users: UserRow[]
  isAdmin: boolean
}) {
  return (
    <Tabs defaultValue="org">
      <TabsList>
        <TabsTrigger value="org">代理店情報</TabsTrigger>
        <TabsTrigger value="users">ユーザー管理</TabsTrigger>
        <TabsTrigger value="notification">通知設定</TabsTrigger>
        <TabsTrigger value="compliance">コンプライアンス</TabsTrigger>
      </TabsList>

      <TabsContent value="org" className="mt-4">
        <OrgTab initial={orgInfo} disabled={!isAdmin} />
      </TabsContent>
      <TabsContent value="users" className="mt-4">
        <UsersTab users={users} disabled={!isAdmin} />
      </TabsContent>
      <TabsContent value="notification" className="mt-4">
        <NotificationTab initial={notification} disabled={!isAdmin} />
      </TabsContent>
      <TabsContent value="compliance" className="mt-4">
        <ComplianceTab initial={compliance} disabled={!isAdmin} />
      </TabsContent>
    </Tabs>
  )
}

// ─── Org Info ───────────────────────────────────────────────────────

function OrgTab({ initial, disabled }: { initial: OrgInfoValues; disabled: boolean }) {
  const [values, setValues] = useState<OrgInfoValues>(initial)
  const [pending, startTransition] = useTransition()

  const save = () => {
    startTransition(async () => {
      const result = await updateOrgInfo(values)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('代理店情報を保存しました')
    })
  }

  return (
    <section className="rounded-md border border-border bg-bg p-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="代理店名 *">
          <Input
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
            disabled={disabled}
          />
        </Field>
        <Field label="代表者名">
          <Input
            value={values.representative ?? ''}
            onChange={(e) => setValues({ ...values, representative: e.target.value || null })}
            disabled={disabled}
          />
        </Field>
        <Field label="登録番号">
          <Input
            value={values.registration_number ?? ''}
            onChange={(e) => setValues({ ...values, registration_number: e.target.value || null })}
            disabled={disabled}
            placeholder="保険代理店登録番号"
          />
        </Field>
        <Field label="電話">
          <Input
            value={values.phone ?? ''}
            onChange={(e) => setValues({ ...values, phone: e.target.value || null })}
            disabled={disabled}
          />
        </Field>
        <Field label="メール" className="col-span-2">
          <Input
            type="email"
            value={values.email ?? ''}
            onChange={(e) => setValues({ ...values, email: e.target.value || null })}
            disabled={disabled}
          />
        </Field>
        <Field label="住所" className="col-span-2">
          <Input
            value={values.address ?? ''}
            onChange={(e) => setValues({ ...values, address: e.target.value || null })}
            disabled={disabled}
          />
        </Field>
        <Field label="ロゴ画像 URL" className="col-span-2">
          <Input
            value={values.logo_url ?? ''}
            onChange={(e) => setValues({ ...values, logo_url: e.target.value || null })}
            disabled={disabled}
            placeholder="https://… (Storage アップロードは Phase 後で対応)"
          />
        </Field>
      </div>
      <Button onClick={save} disabled={pending || disabled}>
        <Save className="mr-1 size-4" />
        {pending ? '保存中…' : '保存'}
      </Button>
    </section>
  )
}

// ─── Users ─────────────────────────────────────────────────────────

function UsersTab({ users, disabled }: { users: UserRow[]; disabled: boolean }) {
  const [pending, startTransition] = useTransition()
  const [invite, setInvite] = useState<InviteUserValues>({
    email: '',
    name: '',
    role: 'agent',
  })
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const handleInvite = () => {
    startTransition(async () => {
      const result = await inviteUser(invite)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('招待メールを送信しました')
      setInvite({ email: '', name: '', role: 'agent' })
    })
  }

  const handleRoleChange = (userId: string, role: string) => {
    startTransition(async () => {
      const result = await setUserRole(userId, role as 'admin' | 'agent' | 'staff')
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('ロールを変更しました')
    })
  }

  const handleDeactivate = () => {
    if (!confirmId) return
    startTransition(async () => {
      const result = await deactivateUser(confirmId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('ユーザーを無効化しました')
      setConfirmId(null)
    })
  }

  const handleActivate = (userId: string) => {
    startTransition(async () => {
      const result = await activateUser(userId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('ユーザーを有効化しました')
    })
  }

  return (
    <div className="space-y-4">
      {/* 招待フォーム */}
      <section className="rounded-md border border-border bg-bg p-5 space-y-3">
        <h3 className="text-sm font-semibold text-text-sub">ユーザーを招待</h3>
        <div className="grid grid-cols-3 gap-3">
          <Field label="氏名 *">
            <Input
              value={invite.name}
              onChange={(e) => setInvite({ ...invite, name: e.target.value })}
              disabled={disabled || pending}
            />
          </Field>
          <Field label="メール *">
            <Input
              type="email"
              value={invite.email}
              onChange={(e) => setInvite({ ...invite, email: e.target.value })}
              disabled={disabled || pending}
            />
          </Field>
          <Field label="ロール *">
            <Select
              value={invite.role}
              onValueChange={(v) =>
                v && setInvite({ ...invite, role: v as InviteUserValues['role'] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">admin (管理者)</SelectItem>
                <SelectItem value="agent">agent (募集人)</SelectItem>
                <SelectItem value="staff">staff (事務)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Button onClick={handleInvite} disabled={disabled || pending || !invite.email || !invite.name}>
          <Plus className="mr-1 size-4" />
          {pending ? '送信中…' : '招待メールを送信'}
        </Button>
        <p className="text-xs text-text-muted">
          招待されたユーザーには確認メールが届き、初回ログイン時にパスワードを設定します。
        </p>
      </section>

      {/* 一覧 */}
      <section className="overflow-hidden rounded-md border border-border bg-bg">
        <table>
          <thead>
            <tr>
              <th>氏名</th>
              <th>メール</th>
              <th>ロール</th>
              <th>状態</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-medium text-text">{u.name}</td>
                <td className="font-mono text-xs text-text-sub">{u.email}</td>
                <td>
                  {disabled ? (
                    <StatusBadge variant={roleVariant(u.role)}>{u.role}</StatusBadge>
                  ) : (
                    <Select
                      value={u.role}
                      onValueChange={(v) => v && handleRoleChange(u.id, v)}
                    >
                      <SelectTrigger className="h-7 w-32 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">admin</SelectItem>
                        <SelectItem value="agent">agent</SelectItem>
                        <SelectItem value="staff">staff</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </td>
                <td>
                  {u.is_active ? (
                    <StatusBadge variant="success">有効</StatusBadge>
                  ) : (
                    <StatusBadge variant="muted">無効</StatusBadge>
                  )}
                </td>
                <td>
                  {!disabled &&
                    (u.is_active ? (
                      <button
                        type="button"
                        onClick={() => setConfirmId(u.id)}
                        disabled={pending}
                        className="rounded-sm p-1 text-text-muted hover:bg-[color:var(--color-error)]/10 hover:text-[color:var(--color-error)]"
                        title="無効化"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleActivate(u.id)}
                        disabled={pending}
                        className="rounded-sm p-1 text-text-muted hover:bg-[color:var(--color-success)]/10 hover:text-[color:var(--color-success)]"
                        title="有効化"
                      >
                        <X className="size-3.5 rotate-45" />
                      </button>
                    ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <ConfirmDialog
        open={confirmId !== null}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="ユーザーを無効化しますか?"
        description="このユーザーはログインできなくなります。アカウント自体は残るため、後で再有効化できます。"
        confirmLabel="無効化する"
        tone="danger"
        loading={pending}
        onConfirm={handleDeactivate}
      />
    </div>
  )
}

function roleVariant(role: string): StatusVariant {
  switch (role) {
    case 'admin': return 'info'
    case 'staff': return 'default'
    case 'agent': return 'success'
    default:      return 'default'
  }
}

// ─── Notification ──────────────────────────────────────────────────

function NotificationTab({
  initial,
  disabled,
}: {
  initial: NotificationSettingsValues
  disabled: boolean
}) {
  const [values, setValues] = useState<NotificationSettingsValues>(initial)
  const [pending, startTransition] = useTransition()

  const save = () => {
    startTransition(async () => {
      const result = await updateNotificationSettings(values)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('通知設定を保存しました')
    })
  }

  return (
    <section className="rounded-md border border-border bg-bg p-5 space-y-4">
      <DaysList
        label="満期アラート (X日前)"
        days={values.expiry_alert_days}
        onChange={(days) => setValues({ ...values, expiry_alert_days: days })}
        disabled={disabled}
      />
      <div className="space-y-2">
        <Label className="block text-xs font-medium text-text-sub">通知方法</Label>
        <CheckRow
          label="メール"
          checked={values.channel_email}
          onChange={(v) => setValues({ ...values, channel_email: v })}
          disabled={disabled}
        />
        <CheckRow
          label="Lark Bot (準備中)"
          checked={values.channel_lark}
          onChange={(v) => setValues({ ...values, channel_lark: v })}
          disabled={disabled}
        />
      </div>
      <CheckRow
        label="管理者にも通知する"
        checked={values.notify_admin}
        onChange={(v) => setValues({ ...values, notify_admin: v })}
        disabled={disabled}
      />
      <Button onClick={save} disabled={pending || disabled}>
        <Save className="mr-1 size-4" />
        {pending ? '保存中…' : '保存'}
      </Button>
    </section>
  )
}

function DaysList({
  label,
  days,
  onChange,
  disabled,
}: {
  label: string
  days: number[]
  onChange: (days: number[]) => void
  disabled: boolean
}) {
  return (
    <div>
      <Label className="mb-1 block text-xs font-medium text-text-sub">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {days.map((d, i) => (
          <div key={i} className="flex items-center gap-1">
            <Input
              type="number"
              inputMode="numeric"
              value={d}
              onChange={(e) => {
                const n = Number(e.target.value)
                onChange(days.map((x, j) => (i === j ? (Number.isFinite(n) ? n : 0) : x)))
              }}
              className="h-8 w-20"
              disabled={disabled}
            />
            <span className="text-xs text-text-muted">日前</span>
            <button
              type="button"
              onClick={() => onChange(days.filter((_, j) => j !== i))}
              disabled={disabled || days.length <= 1}
              className="rounded-sm p-1 text-text-muted hover:bg-[color:var(--color-error)]/10 hover:text-[color:var(--color-error)] disabled:opacity-30"
              aria-label="削除"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange([...days, 7])}
          disabled={disabled || days.length >= 5}
        >
          <Plus className="mr-1 size-4" />
          追加
        </Button>
      </div>
    </div>
  )
}

// ─── Compliance ────────────────────────────────────────────────────

function ComplianceTab({
  initial,
  disabled,
}: {
  initial: ComplianceSettingsValues
  disabled: boolean
}) {
  const [values, setValues] = useState<ComplianceSettingsValues>(initial)
  const [pending, startTransition] = useTransition()

  const save = () => {
    startTransition(async () => {
      const result = await updateComplianceSettings(values)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('コンプライアンス設定を保存しました', {
        description:
          '高齢者閾値の変更は customers_with_age ビューに即座に反映されます。',
      })
    })
  }

  return (
    <section className="rounded-md border border-border bg-bg p-5 space-y-4">
      <Field label="高齢者対応 年齢閾値 (歳)">
        <Input
          type="number"
          inputMode="numeric"
          value={values.elderly_age_threshold}
          onChange={(e) =>
            setValues({
              ...values,
              elderly_age_threshold: Number(e.target.value) || 70,
            })
          }
          className="w-32"
          disabled={disabled}
        />
        <p className="mt-1 text-xs text-text-muted">
          この年齢以上の顧客に高齢者対応バナーが表示されます (デフォルト 70 歳)。
        </p>
      </Field>

      <CheckRow
        label="新規契約時に意向把握を必須にする"
        checked={values.intention_required_on_new_contract}
        onChange={(v) =>
          setValues({ ...values, intention_required_on_new_contract: v })
        }
        disabled={disabled}
      />
      <CheckRow
        label="意向把握の承認を必須にする"
        checked={values.approval_required_on_intention}
        onChange={(v) => setValues({ ...values, approval_required_on_intention: v })}
        disabled={disabled}
      />

      <Field label="データ保持期間 (年)">
        <Input
          type="number"
          inputMode="numeric"
          value={values.data_retention_years}
          onChange={(e) =>
            setValues({
              ...values,
              data_retention_years: Number(e.target.value) || 10,
            })
          }
          className="w-32"
          disabled={disabled}
        />
        <p className="mt-1 text-xs text-text-muted">
          保険業法対応データ (意向把握・対応履歴) は本設定にかかわらず物理削除されません。
        </p>
      </Field>

      <Button onClick={save} disabled={pending || disabled}>
        <Save className="mr-1 size-4" />
        {pending ? '保存中…' : '保存'}
      </Button>
    </section>
  )
}

// ─── Common ────────────────────────────────────────────────────────

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <Label className="mb-1 block text-xs font-medium text-text-sub">{label}</Label>
      {children}
    </div>
  )
}

function CheckRow({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-border bg-[color:var(--color-bg-secondary)] px-3 py-2 text-sm">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onChange(Boolean(v))}
        disabled={disabled}
      />
      {label}
    </label>
  )
}
