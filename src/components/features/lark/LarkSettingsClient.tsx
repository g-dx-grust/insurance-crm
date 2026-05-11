'use client'

import { useState, useTransition } from 'react'
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  type LarkSettings,
  type LarkBaseValues,
  type LarkCalendarValues,
  type LarkApprovalValues,
  type LarkBotValues,
  type NotificationTemplateKey,
  DEFAULT_NOTIFICATION_TEMPLATES,
} from '@/lib/validations/lark-settings'
import {
  testLarkConnection,
  updateLarkApproval,
  updateLarkBase,
  updateLarkBot,
  updateLarkCalendar,
  updateNotificationTemplate,
} from '@/app/(dashboard)/lark/actions'
import { NotificationTemplateEditor } from './NotificationTemplateEditor'

export function LarkSettingsClient({
  settings,
  templates,
  envStatus,
  redirectUri,
}: {
  settings: LarkSettings
  templates: Record<string, string>
  envStatus: {
    appIdSet: boolean
    appSecretSet: boolean
    webhookTokenSet: boolean
  }
  redirectUri: string
}) {
  return (
    <div className="space-y-6">
      <ConnectionSummary envStatus={envStatus} settings={settings} />

      <Tabs defaultValue="sso">
        <TabsList>
          <TabsTrigger value="sso">SSO</TabsTrigger>
          <TabsTrigger value="base">Base</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="approval">Approval</TabsTrigger>
          <TabsTrigger value="bot">Bot</TabsTrigger>
          <TabsTrigger value="templates">通知テンプレ</TabsTrigger>
        </TabsList>

        <TabsContent value="sso" className="mt-4">
          <SsoTab envStatus={envStatus} redirectUri={redirectUri} />
        </TabsContent>
        <TabsContent value="base" className="mt-4">
          <BaseTab initial={settings.base} />
        </TabsContent>
        <TabsContent value="calendar" className="mt-4">
          <CalendarTab initial={settings.calendar} />
        </TabsContent>
        <TabsContent value="approval" className="mt-4">
          <ApprovalTab initial={settings.approval} />
        </TabsContent>
        <TabsContent value="bot" className="mt-4">
          <BotTab initial={settings.bot} />
        </TabsContent>
        <TabsContent value="templates" className="mt-4">
          <TemplatesTab initial={templates} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Connection Summary ──────────────────────────────────────────────

function ConnectionSummary({
  envStatus,
  settings,
}: {
  envStatus: { appIdSet: boolean; appSecretSet: boolean; webhookTokenSet: boolean }
  settings: LarkSettings
}) {
  const items = [
    { label: 'App ID', ok: envStatus.appIdSet, hint: 'env: LARK_APP_ID' },
    { label: 'App Secret', ok: envStatus.appSecretSet, hint: 'env: LARK_APP_SECRET' },
    { label: 'Webhook Token', ok: envStatus.webhookTokenSet, hint: 'env: LARK_WEBHOOK_VERIFY_TOKEN' },
    { label: 'Lark Base', ok: Boolean(settings.base.base_id), hint: settings.base.base_id ?? '未設定' },
    { label: 'Lark Calendar', ok: Boolean(settings.calendar.calendar_id), hint: settings.calendar.calendar_id ?? '未設定' },
    { label: 'Approval Flow', ok: Boolean(settings.approval.intention_flow_id), hint: settings.approval.intention_flow_id ?? '未設定' },
    { label: 'Bot Chat', ok: Boolean(settings.bot.alert_chat_id), hint: settings.bot.alert_chat_id ?? '未設定' },
  ]

  return (
    <section className="rounded-md border border-border bg-bg p-5">
      <h2 className="mb-3 text-sm font-semibold text-text-sub">接続状態</h2>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <li
            key={it.label}
            className="flex items-center justify-between rounded-sm border border-border bg-[color:var(--color-bg-secondary)] px-3 py-2"
          >
            <div>
              <p className="text-xs font-medium text-text-sub">{it.label}</p>
              <p className="text-xs text-text-muted truncate max-w-[180px]">{it.hint}</p>
            </div>
            {it.ok ? (
              <StatusBadge variant="success">接続済</StatusBadge>
            ) : (
              <StatusBadge variant="muted">未接続</StatusBadge>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

// ─── Tabs ────────────────────────────────────────────────────────────

function SsoTab({
  envStatus,
  redirectUri,
}: {
  envStatus: { appIdSet: boolean; appSecretSet: boolean }
  redirectUri: string
}) {
  const [pending, startTransition] = useTransition()

  const handleTest = () => {
    startTransition(async () => {
      const result = await testLarkConnection('SSO')
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('SSO の接続テストが成功しました', {
        description: 'Lark API 連携後、実際の接続確認が行われます',
      })
    })
  }

  return (
    <section className="rounded-md border border-border bg-bg p-5 space-y-4">
      <div className="flex items-start gap-2 rounded-md border border-[color:var(--color-warning)]/30 bg-[color:var(--color-warning)]/10 p-3">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-[color:var(--color-warning)]" />
        <div className="text-xs text-text-sub">
          App ID / App Secret は環境変数で管理します (Lark Rules §6)。UI からは状態のみ確認できます。
          値は Vercel の Environment Variables などで設定してください。
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ReadOnlyField
          label="LARK_APP_ID"
          value={envStatus.appIdSet ? '設定済み' : '未設定'}
          ok={envStatus.appIdSet}
        />
        <ReadOnlyField
          label="LARK_APP_SECRET"
          value={envStatus.appSecretSet ? '設定済み' : '未設定'}
          ok={envStatus.appSecretSet}
        />
      </div>

      <div>
        <Label className="mb-1 block text-xs font-medium text-text-sub">
          リダイレクト URI (Lark Developer Console に登録)
        </Label>
        <Input value={redirectUri} readOnly className="font-mono text-xs" />
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleTest}
        disabled={pending || !envStatus.appIdSet || !envStatus.appSecretSet}
      >
        {pending ? 'テスト中…' : '接続テスト'}
      </Button>
    </section>
  )
}

function ReadOnlyField({
  label,
  value,
  ok,
}: {
  label: string
  value: string
  ok: boolean
}) {
  return (
    <div>
      <Label className="mb-1 block text-xs font-medium text-text-sub">{label}</Label>
      <div
        className={
          'flex items-center gap-2 rounded-sm border px-3 py-2 text-sm ' +
          (ok
            ? 'border-[color:var(--color-success)]/30 bg-[color:var(--color-success)]/10 text-[color:var(--color-success)]'
            : 'border-border bg-[color:var(--color-bg-secondary)] text-text-muted')
        }
      >
        {ok && <CheckCircle2 className="size-3.5" />}
        {value}
      </div>
    </div>
  )
}

function BaseTab({ initial }: { initial: LarkBaseValues }) {
  const [values, setValues] = useState<LarkBaseValues>(initial)
  const [pending, startTransition] = useTransition()

  const save = () => {
    startTransition(async () => {
      const result = await updateLarkBase(values)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Base 設定を保存しました')
    })
  }

  const sync = () => toast.info('手動同期は Lark API 連携後に有効化されます')

  return (
    <section className="rounded-md border border-border bg-bg p-5 space-y-4">
      <div>
        <Label className="mb-1 block text-xs font-medium text-text-sub">Base ID</Label>
        <Input
          value={values.base_id ?? ''}
          onChange={(e) => setValues({ ...values, base_id: e.target.value || null })}
          placeholder="例: bascnXXXXXXXXXXXXX"
        />
      </div>
      <div className="space-y-2">
        <Label className="block text-xs font-medium text-text-sub">同期対象</Label>
        <CheckRow
          label="顧客"
          checked={values.sync_customers}
          onChange={(v) => setValues({ ...values, sync_customers: v })}
        />
        <CheckRow
          label="契約"
          checked={values.sync_contracts}
          onChange={(v) => setValues({ ...values, sync_contracts: v })}
        />
        <CheckRow
          label="案件"
          checked={values.sync_opportunities}
          onChange={(v) => setValues({ ...values, sync_opportunities: v })}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={save} disabled={pending}>
          <Save className="mr-1 size-4" />
          {pending ? '保存中…' : '保存'}
        </Button>
        <Button variant="outline" onClick={sync}>
          手動同期 (準備中)
        </Button>
      </div>
    </section>
  )
}

function CalendarTab({ initial }: { initial: LarkCalendarValues }) {
  const [values, setValues] = useState<LarkCalendarValues>(initial)
  const [pending, startTransition] = useTransition()

  const save = () => {
    startTransition(async () => {
      const result = await updateLarkCalendar(values)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Calendar 設定を保存しました')
    })
  }

  return (
    <section className="rounded-md border border-border bg-bg p-5 space-y-4">
      <div>
        <Label className="mb-1 block text-xs font-medium text-text-sub">カレンダー ID</Label>
        <Input
          value={values.calendar_id ?? ''}
          onChange={(e) => setValues({ ...values, calendar_id: e.target.value || null })}
          placeholder="例: feishu.cn_xxxxx@group.calendar.google.com 形式の Lark ID"
        />
      </div>
      <div className="space-y-2">
        <Label className="block text-xs font-medium text-text-sub">同期対象</Label>
        <CheckRow
          label="カレンダーイベント"
          checked={values.sync_events}
          onChange={(v) => setValues({ ...values, sync_events: v })}
        />
      </div>
      <Button onClick={save} disabled={pending}>
        <Save className="mr-1 size-4" />
        {pending ? '保存中…' : '保存'}
      </Button>
    </section>
  )
}

function ApprovalTab({ initial }: { initial: LarkApprovalValues }) {
  const [values, setValues] = useState<LarkApprovalValues>(initial)
  const [pending, startTransition] = useTransition()

  const save = () => {
    startTransition(async () => {
      const result = await updateLarkApproval(values)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Approval 設定を保存しました')
    })
  }

  return (
    <section className="rounded-md border border-border bg-bg p-5 space-y-4">
      <div>
        <Label className="mb-1 block text-xs font-medium text-text-sub">
          意向把握用 承認フロー ID
        </Label>
        <Input
          value={values.intention_flow_id ?? ''}
          onChange={(e) => setValues({ ...values, intention_flow_id: e.target.value || null })}
          placeholder="例: APPROVAL_FLOW_XXXXX"
        />
      </div>
      <Button onClick={save} disabled={pending}>
        <Save className="mr-1 size-4" />
        {pending ? '保存中…' : '保存'}
      </Button>
    </section>
  )
}

function BotTab({ initial }: { initial: LarkBotValues }) {
  const [values, setValues] = useState<LarkBotValues>(initial)
  const [pending, startTransition] = useTransition()

  const save = () => {
    startTransition(async () => {
      const result = await updateLarkBot(values)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Bot 設定を保存しました')
    })
  }

  return (
    <section className="rounded-md border border-border bg-bg p-5 space-y-4">
      <div className="flex items-start gap-2 rounded-md border border-[color:var(--color-warning)]/30 bg-[color:var(--color-warning)]/10 p-3 text-xs text-text-sub">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-[color:var(--color-warning)]" />
        <div>
          通知を送信するためには、対象の Lark グループチャットに本システムのボット (アプリ) を追加してください
          (Lark Rules §4.1)。ボットが追加されていないと API がエラーを返します。
        </div>
      </div>

      <div>
        <Label className="mb-1 block text-xs font-medium text-text-sub">通知先チャット ID</Label>
        <Input
          value={values.alert_chat_id ?? ''}
          onChange={(e) => setValues({ ...values, alert_chat_id: e.target.value || null })}
          placeholder="例: oc_xxxxxxxx"
        />
      </div>

      <div>
        <Label className="mb-1 block text-xs font-medium text-text-sub">満期アラート (X日前)</Label>
        <Input
          type="number"
          inputMode="numeric"
          value={values.expiry_days_before}
          onChange={(e) =>
            setValues({ ...values, expiry_days_before: Number(e.target.value) || 0 })
          }
        />
      </div>

      <div className="space-y-2">
        <Label className="block text-xs font-medium text-text-sub">通知トリガー</Label>
        <CheckRow
          label="承認依頼通知"
          checked={values.notify_approval}
          onChange={(v) => setValues({ ...values, notify_approval: v })}
        />
        <CheckRow
          label="精算完了通知"
          checked={values.notify_settlement}
          onChange={(v) => setValues({ ...values, notify_settlement: v })}
        />
      </div>

      <Button onClick={save} disabled={pending}>
        <Save className="mr-1 size-4" />
        {pending ? '保存中…' : '保存'}
      </Button>
    </section>
  )
}

function TemplatesTab({ initial }: { initial: Record<string, string> }) {
  const [pending, startTransition] = useTransition()

  const handleSave = (key: NotificationTemplateKey, template: string) => {
    startTransition(async () => {
      const result = await updateNotificationTemplate(key, template)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('テンプレートを保存しました')
    })
  }

  return (
    <div className="space-y-4">
      {(Object.keys(DEFAULT_NOTIFICATION_TEMPLATES) as NotificationTemplateKey[]).map((key) => (
        <NotificationTemplateEditor
          key={key}
          templateKey={key}
          initial={initial[key] ?? DEFAULT_NOTIFICATION_TEMPLATES[key]}
          pending={pending}
          onSave={(t) => handleSave(key, t)}
        />
      ))}
    </div>
  )
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-border bg-[color:var(--color-bg-secondary)] px-3 py-2 text-sm">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(Boolean(v))} />
      {label}
    </label>
  )
}
